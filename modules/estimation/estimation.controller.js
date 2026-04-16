import { ok, handleError, notFound } from './http.js';
import {
  CalculationInputSchema,
  CreateProjectSchema,
  SaveLeafResultSchema,
  RemoveLeafSchema,
  UUIDParamSchema,
} from './schemas.js';
import * as service from './estimation.service.js';
import { generatePDF } from '../../services/externalService/pdfService.js';
import { sendEmail } from '../../services/externalService/emailService.js';
import { getExchangeSettings } from '../../services/externalService/exchangeService.js';

// ─── Health ───────────────────────────────────────────────────────────────────

export async function health(_req, res) {
  ok(res, { status: 'ok', timestamp: new Date().toISOString() });
}

// ─── Categories ───────────────────────────────────────────────────────────────

/** GET /categories — root modules for the home screen */
export async function getRootCategories(_req, res) {
  try {
    ok(res, await service.getRootCategories());
  } catch (err) { handleError(res, err); }
}

/** GET /categories/:id/children — navigate one level deeper */
export async function getChildCategories(req, res) {
  try {
    const { id } = UUIDParamSchema.parse(req.params);
    ok(res, await service.getChildCategories(id));
  } catch (err) { handleError(res, err); }
}

/**
 * GET /categories/:id/leaf
 * Returns formulas + field definitions + material configs for a leaf node.
 * Called once when the user reaches a leaf in the navigation tree.
 */
export async function getLeafCategory(req, res) {
  try {
    const { id } = UUIDParamSchema.parse(req.params);
    const data = await service.getCategoryWithFormulas(id);
    if (!data) return notFound(res, 'Category not found');
    ok(res, data);
  } catch (err) { handleError(res, err); }
}

// ─── Calculation (stateless preview) ─────────────────────────────────────────

/**
 * POST /calculate
 * Runs the engine and returns results WITHOUT persisting anything.
 * Used by the frontend to show the user results before they decide to save.
 */
export async function calculate(req, res) {
  try {
    const input = CalculationInputSchema.parse(req.body);

    console.log('🚀 Calcul lancé pour le projet:', req.body.projectId || 'N/A (Brouillon)');
    console.log('🌐 Appel de l\'API Exchange Rate en cours...');

    const exchangeInfo = await getExchangeSettings();
    const result = await service.runCalculation(input);

    console.log(`✅ Calcul terminé (Taux utilisé : 1 USD = ${exchangeInfo.official_rate} DZD) - ${exchangeInfo.source === 'external_api' ? 'API' : 'Cache/Défaut'}`);
    ok(res, result);
  } catch (err) { handleError(res, err); }
}

// ─── Projects ────────────────────────────────────────────────────────────────

/** GET /projects */
export async function getProjects(req, res) {
  try {
    const user_id = req.headers['x-user-id'];
    ok(res, await service.getProjects(user_id));
  } catch (err) { handleError(res, err); }
}

/** GET /projects/:id */
export async function getProject(req, res) {
  try {
    const user_id = req.headers['x-user-id'];
    const { id } = UUIDParamSchema.parse(req.params);
    const project = await service.getProjectById(id, user_id);
    if (!project) return notFound(res, 'Project not found');
    ok(res, project);
  } catch (err) { handleError(res, err); }
}

/**
 * POST /projects
 * Creates a project AND its single estimation in one shot.
 */
export async function createProject(req, res) {
  try {
    const user_id = req.headers['x-user-id'];
    const dto = CreateProjectSchema.parse(req.body);
    ok(res, await service.createProject(user_id, dto), 201);
  } catch (err) { handleError(res, err); }
}

// ─── Estimation ───────────────────────────────────────────────────────────────

/**
 * GET /projects/:id/estimation
 * Returns the full estimation for a project: all leaf calculations,
 * each with its own material lines and sub-total, plus the grand total.
 */
export async function getEstimation(req, res) {
  try {
    const { id } = UUIDParamSchema.parse(req.params);
    const data = await service.getEstimationByProject(id);
    if (!data) return notFound(res, 'Estimation not found');
    ok(res, data);
  } catch (err) { handleError(res, err); }
}

/**
 * POST /estimation/save-leaf
 * Saves one leaf calculation result into the project estimation.
 */
export async function saveLeafResult(req, res) {
  try {
    const dto = SaveLeafResultSchema.parse(req.body);
    ok(res, await service.saveLeafResult(dto), 201);
  } catch (err) { handleError(res, err); }
}

/**
 * DELETE /estimation/leaf
 * Removes a single leaf calculation and recalculates the estimation total.
 */
export async function removeLeaf(req, res) {
  try {
    const { project_details_id } = RemoveLeafSchema.parse(req.body);
    ok(res, await service.removeLeaf(project_details_id));
  } catch (err) { handleError(res, err); }
}

// ─── Export ──────────────────────────────────────────────────────────────────

/**
 * GET /projects/:id/export
 * Generates a PDF report and downloads it.
 */
export async function exportProjectReport(req, res) {
  try {
    const { id } = req.params;
    const user_id = req.headers['x-user-id']; // Optional user check

    // 1. Liaison des données via le Service
    const project = await service.getProjectById(id, user_id);
    // On restaure getEstimationByProject car lui seul fait le JOIN sur 'estimation_detail_material' pour remonter les material_lines proprement
    const estimation = await service.getEstimationByProject(id);
    const details = estimation?.leaf_calculations || [];

    // 2. Log de Débogage
    console.log("=== EXPORT DEBUG ===");
    console.log({ project, estimation, details });

    // 3. Vérification si null
    if (!estimation || details.length === 0) {
      let missing = [];
      if (!estimation) missing.push("Estimation");
      if (details.length === 0) missing.push("Détails (aucun calcul enregistré)");
      return notFound(res, `Données incomplètes dans la base de données. Éléments manquants : ${missing.join(', ')}`);
    }

    const resolvedProjectName = project?.name || 'Projet sans nom';

    // 4. Flattening des materials et intermediateResults car le pdfService s'attend à un tableau de base à la racine (data.materials)
    const allMaterials = [];
    const allIntermediate = [];

    details.forEach(pd => {
      // Les results bruts json
      const interR = Array.isArray(pd.results) ? pd.results : (pd.results?.intermediate_results ? pd.results.intermediate_results : []);
      interR.forEach(r => {
        allIntermediate.push({
          label: r.output_label || r.output_key,
          value: r.value,
          unit: r.unit_symbol
        });
      });

      // Les vraies material_lines issues de la BDD via le repository engine
      const mats = pd.material_lines || [];
      mats.forEach(m => {
        allMaterials.push({
          label: m.material_name,
          qty: m.quantity_with_waste || m.quantity,
          unit: m.unit_symbol,
          price: m.unit_price_usd || m.unit_price_snapshot || Math.round(m.sub_total / (m.quantity_with_waste || m.quantity || 1)),
          total: m.sub_total
        });
      });
    });

    const pdfData = {
      projectName: resolvedProjectName,
      categoryName: details.length === 1 ? details[0].category_name : 'Projet Global',
      date: new Date(estimation?.created_at || Date.now()).toLocaleDateString(),
      dimensions: details.length > 0 ? (typeof details[0].values === 'string' ? JSON.parse(details[0].values) : (details[0].values || {})) : {},
      intermediateResults: allIntermediate,
      materials: allMaterials,
      grandTotal: estimation.total_budget || 0
    };

    console.log("Données envoyées au PDF:", JSON.stringify(pdfData, null, 2));

    const pdfBuffer = await generatePDF(pdfData);

    // Recherche de l'email : Priorité au Body, puis projet, puis Test Mode
    let destinationEmail = req.body?.email || project?.user_email || 'Kiaidaboubaker@gmail.com';

    if (destinationEmail) {
      console.log(`[EMAIL] 🚀 Tentative d'envoi du rapport PDF à : ${destinationEmail}`);

      try {
        await sendEmail(destinationEmail, pdfData, pdfBuffer);
        console.log(`[EMAIL] ✅ Email envoyé avec succès à : ${destinationEmail}`);
        return ok(res, { success: true, message: 'Email envoyé avec succès' });
      } catch (error) {
        console.error(`[EMAIL] ❌ Échec de l'envoi de l'email à ${destinationEmail}:`, error);
        return res.status(500).json({ success: false, error: 'Échec de l\'envoi de l\'email' });
      }
    } else {
      console.log(`[EMAIL] ⚠️ Aucune adresse email trouvée pour l'envoi, téléchargement direct du PDF.`);
    }

    const safeFilename = resolvedProjectName.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Estimation_${safeFilename}.pdf"`);

    return res.send(pdfBuffer);

  } catch (err) {
    handleError(res, err);
  }
}
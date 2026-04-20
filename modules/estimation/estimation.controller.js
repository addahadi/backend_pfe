import { ok, handleError, notFound } from './http.js';
import {
  CalculationInputSchema,
  CreateProjectSchema,
  SaveLeafResultSchema,
  RemoveLeafSchema,
  UUIDParamSchema,
} from './schemas.js';
import * as service from './estimation.service.js';
import { generatePDF } from '../../services/externalService/pdf.service.js';
import { sendEmail } from '../../services/externalService/email.service.js';
import { getExchangeSettings } from '../../services/externalService/exchange.service.js';
import { uploadBuffer } from '../../utils/cloudinary_upload.js';

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

/** GET /categories/tree — recursive tree array for sidebar layout */
export async function getCategoryTree(_req, res) {
  try {
    ok(res, await service.getCategoryTree());
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
    console.log(req);
    const input = CalculationInputSchema.parse(req.body);

    console.log('🚀 Calcul lancé pour le projet:', req.body.projectId || 'N/A (Brouillon)');
    console.log('📥 Input reçu:', JSON.stringify(input, null, 2));
    console.log('🌐 Appel de l\'API Exchange Rate en cours...');

    const exchangeInfo = await getExchangeSettings();
    const result = await service.runCalculation(input);

    console.log(`✅ Calcul terminé (Taux utilisé : 1 USD = ${exchangeInfo.official_rate} DZD) - ${exchangeInfo.source === 'external_api' ? 'API' : 'Cache/Défaut'}`);

    // ----- [NOUVEAU FLUX: Génération PDF + Email] -----
    if (req.body.email) {
      console.log('📄 Données envoyées au PDF :', result.material_lines?.length || 0, 'lignes');

      const pdfData = {
        projectName: req.body.projectName || 'Estimation Rapide',
        categoryName: req.body.categoryName || 'Calcul',
        date: new Date().toLocaleDateString(),
        dimensions: input.field_values || {},
        intermediateResults: result.intermediate_results.map(r => ({ label: r.output_label || r.output_key, value: r.value, unit: r.unit_symbol })),
        material_lines: result.material_lines,
        total_cost: result.total_cost
      };

      try {
        const pdfBuffer = await generatePDF(pdfData);
        console.log(`🚀 Tentative d'envoi d'email à :`, req.body.email);
        await sendEmail(req.body.email, pdfData, pdfBuffer);
        console.log(`✅ Email envoyé avec succès à : ${req.body.email}`);
      } catch (error) {
        console.error('❌ Erreur Email Service:', error);
      }
    }

    ok(res, result);
  } catch (err) {
    // ✅ FIX: detailed server-side logging so the true error is never hidden
    //         behind a generic "An unexpected error occurred" message.
    console.error('❌ /calculate error —', err.name, ':', err.message);
    console.error('   Stack:', err.stack);
    handleError(res, err);
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

/** GET /projects */
export async function getProjects(req, res) {
  try {
    const user_id = req.user?.userId || req.headers['x-user-id'];
    ok(res, await service.getProjects(user_id));
  } catch (err) { handleError(res, err); }
}

/** GET /projects/:id */
export async function getProject(req, res) {
  try {
    const user_id = req.user?.userId || req.headers['x-user-id'];
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
    const user_id = req.user?.userId || req.headers['x-user-id'];
    const dto = CreateProjectSchema.parse(req.body);
    
    let image_url = null;
    if (req.file) {
      console.log(`🚀 Uploading image for project: ${dto.name}`);
      image_url = await uploadBuffer(req.file.buffer);
      console.log(`✅ Image uploaded: ${image_url}`);
    }

    ok(res, await service.createProject(user_id, { ...dto, image_url }), 201);
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
    const user_id = req.user?.userId || req.headers['x-user-id']; // Optional user check

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

    // 4. Recalculate Live Data using CalculationEngine
    const allMaterials = [];
    const allIntermediate = [];
    let liveGrandTotal = 0;

    // Refresh exchange rates globally before calculation loop
    await getExchangeSettings();

    for (const pd of details) {
      if (!pd.selected_formula_id) continue;

      const input = {
        category_id: pd.category_id,
        selected_formula_id: pd.selected_formula_id,
        selected_config_id: pd.selected_config_id,
        field_values: typeof pd.values === 'string' ? JSON.parse(pd.values) : (pd.values || {})
      };

      try {
        const liveResult = await service.runCalculation(input);

        liveGrandTotal += liveResult.total_cost;

        liveResult.intermediate_results.forEach(r => {
          allIntermediate.push({
            label: r.output_label || r.output_key,
            value: r.value,
            unit: r.unit_symbol
          });
        });

        liveResult.material_lines.forEach(m => {
          allMaterials.push(m);
        });
      } catch (err) {
        console.error(`Erreur de recalcul pour la feuille ${pd.project_details_id}:`, err.message);
      }
    }

    const pdfData = {
      projectName: resolvedProjectName,
      categoryName: details.length === 1 ? details[0].category_name : 'Projet Global',
      date: new Date(estimation?.created_at || Date.now()).toLocaleDateString(),
      dimensions: details.length > 0 ? (typeof details[0].values === 'string' ? JSON.parse(details[0].values) : (details[0].values || {})) : {},
      intermediateResults: allIntermediate,
      material_lines: allMaterials,
      total_cost: liveGrandTotal
    };

    console.log("Données envoyées au PDF:", JSON.stringify(pdfData, null, 2));

    const pdfBuffer = await generatePDF(pdfData);

    // Recherche de l'email : Priorité au Body, puis projet, puis Test Mode
    let destinationEmail = req.body?.email || project?.user_email || 'Kiaidaboubaker@gmail.com';

    if (destinationEmail) {
      console.log(`[EMAIL] 🚀 Tentative d'envoi du rapport PDF à : ${destinationEmail}... Taille du Buffer: ${pdfBuffer ? pdfBuffer.length : 'VIDE'} octets`);

      try {
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error("Le fichier PDF est vide ou n'a pas pu être généré (Buffer inexistant).");
        }
        await sendEmail(destinationEmail, pdfData, pdfBuffer);
        console.log(`[EMAIL] ✅ Email envoyé avec succès à : ${destinationEmail}`);
        return ok(res, { success: true, message: 'Email envoyé avec succès' });
      } catch (error) {
        console.error('❌ Erreur Email:', error);
        return res.status(500).json({ success: false, error: error.message });
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

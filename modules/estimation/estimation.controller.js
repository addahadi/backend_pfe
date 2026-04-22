import { ok, handleError, notFound } from './http.js';
import sql from '../../config/database.js';
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
    const subscription_id = req.subscription?.subscription_id;
    const dto = CreateProjectSchema.parse(req.body);
    
    let image_url = null;
    if (req.file) {
      console.log(`🚀 Uploading image for project: ${dto.name}`);
      image_url = await uploadBuffer(req.file.buffer);
      console.log(`✅ Image uploaded: ${image_url}`);
    }

    ok(res, await service.createProject(user_id, { ...dto, image_url, subscription_id }), 201);
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

        // 4. Build full export payload from saved project details
    const parseJsonSafely = (value) => {
      if (value == null) return {};
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return { raw: value }; }
      }
      if (typeof value === 'object') return value;
      return { value };
    };

    const normalizedDetails = details.map((leaf) => ({
      ...leaf,
      field_values: parseJsonSafely(leaf.field_values),
      results: parseJsonSafely(leaf.results),
      material_lines: Array.isArray(leaf.material_lines) ? leaf.material_lines : [],
    }));

    const formulaIds = [...new Set(
      normalizedDetails
        .map((leaf) => leaf.selected_formula_id)
        .filter(Boolean),
    )];

    const fieldMetaRows = formulaIds.length > 0
      ? await sql`
          SELECT
            fd.formula_id,
            fd.field_id,
            fd.variable_name,
            fd.label_en,
            fd.sort_order,
            u.symbol AS unit_symbol
          FROM field_definitions fd
          LEFT JOIN units u ON u.unit_id = fd.unit_id
          WHERE fd.formula_id = ANY(${formulaIds})
          ORDER BY fd.formula_id, fd.sort_order, fd.created_at
        `
      : [];

    const fieldMetaByFormula = new Map();
    for (const row of fieldMetaRows) {
      const formulaId = row.formula_id;
      if (!fieldMetaByFormula.has(formulaId)) {
        fieldMetaByFormula.set(formulaId, { byId: new Map(), byVar: new Map() });
      }
      const bucket = fieldMetaByFormula.get(formulaId);
      bucket.byId.set(row.field_id, row);
      if (row.variable_name) bucket.byVar.set(row.variable_name, row);
    }

    const normalizedWithDisplay = normalizedDetails.map((leaf) => {
      const meta = fieldMetaByFormula.get(leaf.selected_formula_id) || { byId: new Map(), byVar: new Map() };
      const inputEntries = Object.entries(leaf.field_values || {}).map(([key, value]) => {
        const def = meta.byId.get(key) || meta.byVar.get(key);
        return {
          key,
          name: def?.label_en || def?.variable_name || key,
          value,
          unit: def?.unit_symbol || null,
          sort_order: def?.sort_order ?? Number.MAX_SAFE_INTEGER,
        };
      });

      inputEntries.sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      });

      const resultEntries = Object.entries(leaf.results || {}).map(([key, value]) => ({
        key,
        name: key.replace(/_/g, ' '),
        value,
      }));

      return {
        ...leaf,
        input_values_display: inputEntries,
        result_values_display: resultEntries,
      };
    });

    const totalFromLeaves = normalizedWithDisplay.reduce(
      (sum, leaf) => sum + Number(leaf.leaf_total || 0),
      0,
    );

    const pdfData = {
      projectName: resolvedProjectName,
      projectDescription: project?.description || null,
      projectStatus: project?.status || null,
      projectCreatedAt: project?.created_at || null,
      estimationId: estimation?.estimation_id || null,
      date: new Date(estimation?.created_at || Date.now()).toLocaleDateString(),
      leaf_calculations: normalizedWithDisplay,
      total_cost: Number(estimation?.total_budget ?? totalFromLeaves ?? 0),
      // Keep legacy fields for backward compatibility with existing template sections
      categoryName: normalizedWithDisplay.length === 1
        ? (normalizedWithDisplay[0].category_name_en || normalizedWithDisplay[0].category_name_ar || 'Category')
        : 'Global Project',
      dimensions: normalizedWithDisplay[0]?.field_values || {},
      intermediateResults: [],
      material_lines: normalizedWithDisplay.flatMap((leaf) => leaf.material_lines || []),
    };

    console.log("Données envoyées au PDF:", JSON.stringify(pdfData, null, 2));

    const pdfBuffer = await generatePDF(pdfData);

    // Optional email sending: only when explicitly requested by client.
    // Default export behavior is direct PDF download.
    const destinationEmail =
      (typeof req.query?.email === 'string' && req.query.email.trim()) ||
      (typeof req.body?.email === 'string' && req.body.email.trim()) ||
      null;

    if (destinationEmail) {
      console.log(`[EMAIL] Sending report to: ${destinationEmail}`);
      try {
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error("PDF buffer is empty and cannot be emailed.");
        }
        await sendEmail(destinationEmail, pdfData, pdfBuffer);
        console.log(`[EMAIL] Sent successfully to: ${destinationEmail}`);
      } catch (error) {
        // Don't fail export download when SMTP config is missing/broken.
        console.error('[EMAIL] Send failed, continuing with direct download:', error.message);
      }
    }

    const safeFilename = resolvedProjectName.replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Estimation_${safeFilename}.pdf"`);

    return res.send(pdfBuffer);

  } catch (err) {
    handleError(res, err);
  }
}



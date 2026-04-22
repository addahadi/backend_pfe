import { Router } from 'express';
import authenticate from '../middelwares/authenticate.js';
import { requireRole } from '../middelwares/reaquireRole.js';
import * as ctrl from '../controllers/modules.controller.js';

const router = Router();

// All /api/admin/modules routes are admin-only.
router.use(authenticate, requireRole('ADMIN'));

// ── Lookups ───────────────────────────────────────────────────────────────────
// GET /api/admin/modules/units
router.get('/units', ctrl.listUnits);

// ── Tree ──────────────────────────────────────────────────────────────────────
// GET /api/admin/modules/tree
router.get('/tree', ctrl.getTree);

// ── Category ──────────────────────────────────────────────────────────────────
// GET    /api/admin/modules/categories/:categoryId/leaf
// POST   /api/admin/modules/categories
// PATCH  /api/admin/modules/categories/:categoryId
// DELETE /api/admin/modules/categories/:categoryId
router.get   ('/categories/:categoryId/leaf', ctrl.getLeaf);
router.post  ('/categories',                  ctrl.createCategory);
router.patch ('/categories/:categoryId',      ctrl.updateCategory);
router.delete('/categories/:categoryId',      ctrl.deleteCategory);

// ── Formula ───────────────────────────────────────────────────────────────────
// POST   /api/admin/modules/categories/:categoryId/formulas
// PATCH  /api/admin/modules/formulas/:formulaId
// DELETE /api/admin/modules/formulas/:formulaId
router.post  ('/categories/:categoryId/formulas', ctrl.createFormula);
router.patch ('/formulas/:formulaId',             ctrl.updateFormula);
router.delete('/formulas/:formulaId',             ctrl.deleteFormula);

// ── Formula Output ────────────────────────────────────────────────────────────
// POST   /api/admin/modules/formulas/:formulaId/outputs
// PATCH  /api/admin/modules/formula-outputs/:outputId
// DELETE /api/admin/modules/formula-outputs/:outputId
router.post  ('/formulas/:formulaId/outputs',     ctrl.createFormulaOutput);
router.patch ('/formula-outputs/:outputId',       ctrl.updateFormulaOutput);
router.delete('/formula-outputs/:outputId',       ctrl.deleteFormulaOutput);

// ── Field ─────────────────────────────────────────────────────────────────────
// POST   /api/admin/modules/formulas/:formulaId/fields
// PATCH  /api/admin/modules/fields/:fieldId
// DELETE /api/admin/modules/fields/:fieldId
router.post  ('/formulas/:formulaId/fields', ctrl.createField);
router.patch ('/fields/:fieldId',            ctrl.updateField);
router.delete('/fields/:fieldId',            ctrl.deleteField);

// ── Config ────────────────────────────────────────────────────────────────────
// POST   /api/admin/modules/categories/:categoryId/configs
// PATCH  /api/admin/modules/configs/:configId
// DELETE /api/admin/modules/configs/:configId
router.post  ('/categories/:categoryId/configs', ctrl.createConfig);
router.patch ('/configs/:configId',              ctrl.updateConfig);
router.delete('/configs/:configId',              ctrl.deleteConfig);

// ── Coefficient ───────────────────────────────────────────────────────────────
// POST   /api/admin/modules/categories/:categoryId/coefficients
// PATCH  /api/admin/modules/coefficients/:coefficientId
// DELETE /api/admin/modules/coefficients/:coefficientId
router.post  ('/categories/:categoryId/coefficients', ctrl.createCoefficient);
router.patch ('/coefficients/:coefficientId',         ctrl.updateCoefficient);
router.delete('/coefficients/:coefficientId',         ctrl.deleteCoefficient);

export default router;

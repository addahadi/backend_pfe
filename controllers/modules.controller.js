import { ok, notFound, handleError } from '../utils/http.js';
import {
  CreateCategorySchema,       UpdateCategorySchema,
  CreateFormulaSchema,        UpdateFormulaSchema,
  CreateFormulaOutputSchema,  UpdateFormulaOutputSchema,
  CreateFieldSchema,          UpdateFieldSchema,
  CreateConfigSchema,         UpdateConfigSchema,
  CreateCoefficientSchema,    UpdateCoefficientSchema,
} from '../schemas/modules.schema.js';
import * as svc from '../services/modules.service.js';

// ── Lookups ───────────────────────────────────────────────────────────────────

export async function listUnits(req, res) {
  try { ok(res, await svc.getUnits()); }
  catch (e) { handleError(res, e); }
}

// ── Tree ──────────────────────────────────────────────────────────────────────

export async function getTree(req, res) {
  try { ok(res, await svc.getAdminTree()); }
  catch (e) { handleError(res, e); }
}

// ── Leaf details ──────────────────────────────────────────────────────────────

export async function getLeaf(req, res) {
  try {
    const data = await svc.getLeafDetails(req.params.categoryId);
    if (!data) return notFound(res, `Category ${req.params.categoryId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

// ── Category ──────────────────────────────────────────────────────────────────

export async function createCategory(req, res) {
  try {
    const dto = CreateCategorySchema.parse(req.body);
    ok(res, await svc.createCategory(dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateCategory(req, res) {
  try {
    const dto  = UpdateCategorySchema.parse(req.body);
    const data = await svc.updateCategory(req.params.categoryId, dto);
    if (!data) return notFound(res, `Category ${req.params.categoryId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteCategory(req, res) {
  try {
    await svc.deleteCategory(req.params.categoryId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

// ── Formula ───────────────────────────────────────────────────────────────────

export async function createFormula(req, res) {
  try {
    const dto = CreateFormulaSchema.parse(req.body);
    ok(res, await svc.createFormula(req.params.categoryId, dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateFormula(req, res) {
  try {
    const dto  = UpdateFormulaSchema.parse(req.body);
    const data = await svc.updateFormula(req.params.formulaId, dto);
    if (!data) return notFound(res, `Formula ${req.params.formulaId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteFormula(req, res) {
  try {
    await svc.deleteFormula(req.params.formulaId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

// ── Formula Output ────────────────────────────────────────────────────────────

export async function createFormulaOutput(req, res) {
  try {
    const dto = CreateFormulaOutputSchema.parse(req.body);
    ok(res, await svc.createFormulaOutput(req.params.formulaId, dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateFormulaOutput(req, res) {
  try {
    const dto  = UpdateFormulaOutputSchema.parse(req.body);
    const data = await svc.updateFormulaOutput(req.params.outputId, dto);
    if (!data) return notFound(res, `FormulaOutput ${req.params.outputId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteFormulaOutput(req, res) {
  try {
    await svc.deleteFormulaOutput(req.params.outputId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

// ── Field ─────────────────────────────────────────────────────────────────────

export async function createField(req, res) {
  try {
    const dto = CreateFieldSchema.parse(req.body);
    ok(res, await svc.createField(req.params.formulaId, dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateField(req, res) {
  try {
    const dto  = UpdateFieldSchema.parse(req.body);
    const data = await svc.updateField(req.params.fieldId, dto);
    if (!data) return notFound(res, `Field ${req.params.fieldId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteField(req, res) {
  try {
    await svc.deleteField(req.params.fieldId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

// ── Config ────────────────────────────────────────────────────────────────────

export async function createConfig(req, res) {
  try {
    const dto = CreateConfigSchema.parse(req.body);
    ok(res, await svc.createConfig(req.params.categoryId, dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateConfig(req, res) {
  try {
    const dto  = UpdateConfigSchema.parse(req.body);
    const data = await svc.updateConfig(req.params.configId, dto);
    if (!data) return notFound(res, `Config ${req.params.configId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteConfig(req, res) {
  try {
    await svc.deleteConfig(req.params.configId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

// ── Coefficient ───────────────────────────────────────────────────────────────

export async function createCoefficient(req, res) {
  try {
    const dto = CreateCoefficientSchema.parse(req.body);
    ok(res, await svc.createCoefficient(req.params.categoryId, dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateCoefficient(req, res) {
  try {
    const dto  = UpdateCoefficientSchema.parse(req.body);
    const data = await svc.updateCoefficient(req.params.coefficientId, dto);
    if (!data) return notFound(res, `Coefficient ${req.params.coefficientId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteCoefficient(req, res) {
  try {
    await svc.deleteCoefficient(req.params.coefficientId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

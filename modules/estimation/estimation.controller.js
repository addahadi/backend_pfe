import { ok, handleError, notFound } from './http.js';
import {
  CalculationInputSchema,
  CreateProjectSchema,
  SaveLeafResultSchema,
  RemoveLeafSchema,
  UUIDParamSchema,
} from './schemas.js';
import * as service from './estimation.service.js';

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
    const data   = await service.getCategoryWithFormulas(id);
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
    ok(res, await service.runCalculation(input));
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
    const { id }  = UUIDParamSchema.parse(req.params);
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
    const dto     = CreateProjectSchema.parse(req.body);
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
    const { id }  = UUIDParamSchema.parse(req.params);
    const data    = await service.getEstimationByProject(id);
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

// ── units.controller.js ───────────────────────────────────────────────────────
import { z } from 'zod';
import { ok, notFound, handleError } from '../utils/http.js';
import * as svc from '../services/units.service.js';

const CreateUnitSchema = z.object({
  name_en: z.string().min(1, 'Name (EN) is required'),
  name_ar: z.string().default(''),
  symbol:  z.string().min(1, 'Symbol is required'),
});
const UpdateUnitSchema = z.object({
  name_en: z.string().min(1).optional(),
  name_ar: z.string().optional(),
  symbol:  z.string().min(1).optional(),
});

export async function listUnits(req, res) {
  try { ok(res, await svc.getUnits()); }
  catch (e) { handleError(res, e); }
}

export async function createUnit(req, res) {
  try {
    const dto = CreateUnitSchema.parse(req.body);
    ok(res, await svc.createUnit(dto), 201);
  } catch (e) { handleError(res, e); }
}

export async function updateUnit(req, res) {
  try {
    const dto  = UpdateUnitSchema.parse(req.body);
    const data = await svc.updateUnit(req.params.unitId, dto);
    if (!data) return notFound(res, `Unit ${req.params.unitId} not found`);
    ok(res, data);
  } catch (e) { handleError(res, e); }
}

export async function deleteUnit(req, res) {
  try {
    await svc.deleteUnit(req.params.unitId);
    ok(res, { deleted: true });
  } catch (e) { handleError(res, e); }
}

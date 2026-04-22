import { z } from 'zod';
import { ok, notFound, handleError } from '../../utils/http.js';
import * as svc from '../../services/externalService/material.service.js';

const optUuid = z.preprocess(v => (v === '' ? null : v), z.string().uuid().nullable().optional());

const CreateMaterialSchema = z.object({
  material_name_en:     z.string().min(1, 'Name (EN) is required'),
  material_name_ar:     z.string().default(''),
  formula_id:           z.string(),
  unit_id:              z.string(),
  material_type:        z.enum(['PRIMARY', 'ACCESSORY']).default('PRIMARY'),
  unit_price_usd:       z.number().min(0).default(0),
  min_price_usd:        z.number().min(0).default(0),
  max_price_usd:        z.number().min(0).default(0),
  default_waste_factor: z.number().min(0).max(1).default(0),
});

const UpdateMaterialSchema = z.object({
  material_name_en:     z.string().min(1).optional(),
  material_name_ar:     z.string().optional(),
  formula_id:           z.string().optional(),
  unit_id:              z.string(),
  material_type:        z.enum(['PRIMARY', 'ACCESSORY']).optional(),
  unit_price_usd:       z.number().min(0).optional(),
  min_price_usd:        z.number().min(0).optional(),
  max_price_usd:        z.number().min(0).optional(),
  default_waste_factor: z.number().min(0).max(1).optional(),
});

export const getAllMaterials = async (req, res) => {
  try {
    const { search = '', category_id = '', page = '1', limit = '50' } = req.query;
    const data = await svc.getAllMaterials({
      search, categoryId: category_id,
      page: parseInt(page), limit: parseInt(limit),
    });
    ok(res, data);
  } catch (err) { handleError(res, err); }
};

export const getMaterialFormulas = async (req, res) => {
  try { ok(res, await svc.getMaterialFormulas()); }
  catch (err) { handleError(res, err); }
};

export const addMaterial = async (req, res) => {
  try {
    const dto = CreateMaterialSchema.parse(req.body);
    ok(res, await svc.createMaterial(dto), 201);
  } catch (err) { handleError(res, err); }
};

export const updateMaterial = async (req, res) => {
  try {
    const dto  = UpdateMaterialSchema.parse(req.body);
    const data = await svc.updateMaterial(req.params.id, dto);
    if (!data) return notFound(res, `Material ${req.params.id} not found`);
    ok(res, data);
  } catch (err) { handleError(res, err); }
};

export const deleteMaterial = async (req, res) => {
  try {
    await svc.deleteMaterial(req.params.id);
    ok(res, { deleted: true });
  } catch (err) { handleError(res, err); }
};

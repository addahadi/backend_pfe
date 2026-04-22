import { z } from 'zod';
import * as planService  from '../../services/auth/plan.service.js';
import * as extraService from '../../services/auth/plan_extra.service.js';
import { ok, handleError, notFound } from '../../utils/http.js';

/** Pick the right language from a { message_en, message_ar } service result. */
function resolveMessage(res, data) {
  if (!data || typeof data === 'string') return data;
  const lang = res.locals?.lang || 'en';
  return lang === 'ar' ? (data.message_ar || data.message_en) : data.message_en;
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export const createPlan = async (req, res) => {
  try {
    const result = await planService.createPlan(req.body);
    ok(res, result, 201);
  } catch (err) { handleError(res, err); }
};

// Full list with features nested — used by admin PlanFeatures page
export const getPlansAdmin = async (req, res) => {
  try {
    ok(res, await extraService.getPlansWithFeatures());
  } catch (err) { handleError(res, err); }
};

// Public list — used by the subscription/choose-plan flow
export const getPlans = async (req, res) => {
  try {
    const result = await planService.getPlans();
    ok(res, result);
  } catch (err) { handleError(res, err); }
};

export const updatePlan = async (req, res) => {
  try {
    const result = await planService.updatePlan(req.params.id, req.body);
    ok(res, result);
  } catch (err) { handleError(res, err); }
};

export const deletePlan = async (req, res) => {
  try {
    const result = await extraService.deletePlan(req.params.id);
    ok(res, { deleted: true, message: resolveMessage(res, result) });
  } catch (err) { handleError(res, err); }
};

export const getFeatures = async (req, res) => {
  try {
    const features = await planService.getPlanFeatures(req.params.id);
    ok(res, features);
  } catch (err) { handleError(res, err); }
};

// ── Plan Types ────────────────────────────────────────────────────────────────

const PlanTypeSchema = z.object({
  name_en: z.string().min(1, 'Name (EN) is required'),
  name_ar: z.string().default(''),
});

export const getPlanTypes = async (req, res) => {
  try { ok(res, await extraService.getPlanTypes()); }
  catch (err) { handleError(res, err); }
};

export const createPlanType = async (req, res) => {
  try {
    const dto = PlanTypeSchema.parse(req.body);
    ok(res, await extraService.createPlanType(dto), 201);
  } catch (err) { handleError(res, err); }
};

export const updatePlanType = async (req, res) => {
  try {
    const dto  = PlanTypeSchema.partial().parse(req.body);
    const data = await extraService.updatePlanType(req.params.typeId, dto);
    const lang = res.locals?.lang || 'en';
    if (!data) return notFound(
      res,
      `PlanType ${req.params.typeId} not found`,
      `نوع الخطة ${req.params.typeId} غير موجود`
    );
    ok(res, data);
  } catch (err) { handleError(res, err); }
};

export const deletePlanType = async (req, res) => {
  try {
    const result = await extraService.deletePlanType(req.params.typeId);
    ok(res, { deleted: true, message: resolveMessage(res, result) });
  } catch (err) { handleError(res, err); }
};


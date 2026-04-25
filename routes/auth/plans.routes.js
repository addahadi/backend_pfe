import express from 'express';
import authenticate from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { createPlanSchema, updatePlanSchema } from '../../schemas/plan.schema.js';
import {
  createPlan, getPlans, getPlansAdmin, updatePlan, deletePlan, getFeatures,
  getPlanTypes, createPlanType, updatePlanType, deletePlanType,
} from '../../controllers/auth/plans.controller.js';

const router = express.Router();

// ── Plans — public reads ──────────────────────────────────────────────────────
router.get('/plans',     getPlans);          // public: used by choose-plan flow
router.get('/plans/:id', getFeatures);

// ── Plans — admin reads ───────────────────────────────────────────────────────
// GET /api/admin/plans → full list with nested features[] + plan_type_name
router.get('/admin/plans', authenticate, requireRole('ADMIN'), getPlansAdmin);

// ── Plans — admin mutations ───────────────────────────────────────────────────
router.post  ('/plans',    authenticate, requireRole('ADMIN'), validate(createPlanSchema), createPlan);
router.put   ('/plans/:id', authenticate, requireRole('ADMIN'), validate(updatePlanSchema), updatePlan);
router.delete('/plans/:id', authenticate, requireRole('ADMIN'), deletePlan);

// ── Plan Types ────────────────────────────────────────────────────────────────
router.get   ('/plan-types',          getPlanTypes);   // public
router.post  ('/plan-types',          authenticate, requireRole('ADMIN'), createPlanType);
router.patch ('/plan-types/:typeId',  authenticate, requireRole('ADMIN'), updatePlanType);
router.delete('/plan-types/:typeId',  authenticate, requireRole('ADMIN'), deletePlanType);

export default router;

import express from 'express';

import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middelwares/reaquireRole.js';
import { validate } from '../../middelwares/validate.js';

import { createPlanSchema, updatePlanSchema, createPlanTypeSchema, updatePlanTypeSchema } from '../../schemas/plan.schema.js';
import { 
  createPlan, updatePlan, getFeatures, getPlans, deletePlan,
  getPlanTypes, createPlanType, updatePlanType, deletePlanType 
} from '../../controllers/auth/plans.controller.js';

const router = express.Router();

// Public — anyone can read available plans
router.get('/plans', getPlans);
router.get('/plans/:id', getFeatures);

// Admin only — create / update plans
router.post('/plans', authenticate, requireRole('ADMIN'), validate(createPlanSchema), createPlan);
router.put('/plans/:id', authenticate, requireRole('ADMIN'), validate(updatePlanSchema), updatePlan);
router.delete('/plans/:id', authenticate, requireRole('ADMIN'), deletePlan);

// Plan Types
router.get('/plan-types', getPlanTypes);
router.post('/plan-types', authenticate, requireRole('ADMIN'), validate(createPlanTypeSchema), createPlanType);
router.put('/plan-types/:id', authenticate, requireRole('ADMIN'), validate(updatePlanTypeSchema), updatePlanType);
router.delete('/plan-types/:id', authenticate, requireRole('ADMIN'), deletePlanType);


export default router;

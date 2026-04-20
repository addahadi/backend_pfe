import express from 'express';

import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middelwares/reaquireRole.js';
import { validate } from '../../middelwares/validate.js';

import { createPlanSchema, updatePlanSchema } from '../../schemas/plan.schema.js';
import { createPlan, updatePlan, getFeatures, getPlans } from '../../controllers/auth/plans.controller.js';

const router = express.Router();

// Public — anyone can read available plans
router.get('/plans', getPlans);
router.get('/plans/:id', getFeatures);

// Admin only — create / update plans
router.post('/plans', authenticate, requireRole('ADMIN'), validate(createPlanSchema), createPlan);
router.put('/plans/:id', authenticate, requireRole('ADMIN'), validate(updatePlanSchema), updatePlan);

export default router;

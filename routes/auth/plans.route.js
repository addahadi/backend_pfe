import express from 'express';

import verifyToken from '../../middelwares/verfytToken.js';

// middleware validation
import { validate } from '../../middelwares/validate.js';

import { createPlanSchema, updatePlanSchema } from '../../schemas/plan.schema.js';
import { createPlan, updatePlan, getFeatures, getPlans } from '../../controllers/auth/plans.controller.js';

const router = express.Router();

router.post('/plans', validate(createPlanSchema), createPlan);

router.get('/plans', getPlans);

// UPDATE
router.put('/plans/:id', validate(updatePlanSchema), updatePlan);
//getfeatures

router.get('/plans/:id', getFeatures);

export default router;

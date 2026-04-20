import express from 'express';
import { create, getMine, getMyUsage, getAll } from '../../controllers/auth/subscription.controller.js';
import { requestSwitchPlan, confirmSwitchPlan } from '../../controllers/auth/switch.js';
import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middelwares/reaquireRole.js';
import checkSubscription from '../../middelwares/checkSubscription.js';
import { validate } from '../../middelwares/validate.js';
import { createSubscriptionSchema } from '../../schemas/subscription.schema.js';

const router = express.Router();

/*
POST /subscriptions
User subscribes to a plan (after register → choose-plan flow)
*/
router.post('/subscriptions', authenticate, validate(createSubscriptionSchema), create);

/*
GET /subscriptions/me
Returns formatted subscription info for the dashboard
*/
router.get('/subscriptions/me', authenticate, getMine);

/*
GET /subscriptions/me/usage
Returns usage vs limits for projects / ai / estimations.
*/
router.get('/subscriptions/me/usage', authenticate, checkSubscription, getMyUsage);

/*
GET /subscriptions (admin only)
*/
router.get('/subscriptions', authenticate, requireRole('ADMIN'), getAll);

/*
PATCH /subscriptions/switch
Step 1 — user chose a new plan → validation + confirmation email sent
No checkSubscription needed: a user without an active sub can also switch.
*/
router.patch('/subscriptions/switch', authenticate, requestSwitchPlan);

/*
POST /subscriptions/switch/confirm
Step 2 — user clicked the email link → old sub deactivated, new one created
*/
router.post('/subscriptions/switch/confirm', authenticate, confirmSwitchPlan);

export default router;

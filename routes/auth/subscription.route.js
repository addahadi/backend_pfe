import express from 'express';
import { create, getMine, getMyUsage, getAll } from '../../controllers/auth/subscription.controller.js';
import verifyToken from '../../middelwares/verfytToken.js';
import { validate }  from '../../middelwares/validate.js';
import { createSubscriptionSchema } from '../../schemas/subscription.schema.js';

const router = express.Router();

/*
POST /subscriptions
User subscribes to a plan (after register → choose-plan flow)
*/
router.post('/subscriptions', verifyToken, validate(createSubscriptionSchema), create);

/*
GET /subscriptions/me
Returns formatted subscription info for the dashboard
*/
router.get('/subscriptions/me', verifyToken, getMine);

/*
GET /subscriptions/me/usage
Returns usage vs limits for projects / ai / estimations.
Called by the frontend useUsage() hook (every 30s staleTime).
Response shape:
{
  subscription_id,
  plan_ends_at,
  usage: {
    projects:    { used, limit, unlimited, percentage },
    ai:          { used, limit, unlimited, percentage },
    estimations: { used, limit, unlimited, percentage },
  }
}
*/
router.get('/subscriptions/me/usage', verifyToken, getMyUsage);

/*
GET /subscriptions (admin)
*/
router.get('/subscriptions', getAll);

export default router;

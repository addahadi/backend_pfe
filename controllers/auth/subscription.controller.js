import * as subscriptionService from '../../services/auth/subscription.service.js';
import { ok, handleError, notFound } from '../../utils/http.js';

/*
POST /subscriptions
Create a new subscription for the authenticated user
*/
export const create = async (req, res, next) => {
  try {
    const result = await subscriptionService.createSubscription({
      userId: req.user.userId,
      planId: req.body.planId,
    });
    ok(res, result, 201);
  } catch (error) {
    next(error);
  }
};

/*
GET /subscriptions/me
Returns the current active subscription (formatted for client)
*/
export const getMine = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getMySubscriptionForClient(req.user.userId);

    if (!subscription) return notFound(res, 'No active subscription');

    ok(res, subscription);
  } catch (error) {
    next(error);
  }
};

/*
GET /subscriptions/me/usage
Returns usage vs limits for all 3 feature keys.
Frontend uses this to render progress bars and gate action buttons.
*/
export const getMyUsage = async (req, res, next) => {
  try {
    const usage = await subscriptionService.getMyUsageWithLimits(req.user.userId);

    if (!usage) return notFound(res, 'No active subscription');

    ok(res, usage);
  } catch (error) {
    next(error);
  }
};

/*
GET /subscriptions (admin)
Returns all subscriptions with user and plan info
*/
export const getAll = async (req, res, next) => {
  try {
    const result = await subscriptionService.getAllSubscriptions();
    ok(res, result);
  } catch (error) {
    next(error);
  }
};

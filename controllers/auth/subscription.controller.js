import * as subscriptionService from '../services/subscription.service.js';
import { ok, handleError, notFound } from '../../utils/http.js';

export const create = async (req, res) => {
  try {
    const result = await subscriptionService.createSubscription({
      userId: req.user.userId,
      planId: req.body.planId,
    });
    ok(res, result, 201);
  } catch (err) { handleError(res, err); }
};

export const getMine = async (req, res) => {
  try {
    const subscription = await subscriptionService.getMySubscription(req.user.userId);
    if (!subscription) return notFound(res, 'No active subscription');
    ok(res, subscription);
  } catch (err) { handleError(res, err); }
};

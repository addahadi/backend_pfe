import * as planService from '../../services/auth/plan.service.js';
import { ok, handleError, notFound } from '../../utils/http.js';

export const createPlan = async (req, res) => {
  try {
    const result = await planService.createPlan(req.body);
    ok(res, result, 201);
  } catch (err) { handleError(res, err); }
};

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

export const getFeatures = async (req, res) => {
  try {
    const features = await planService.getPlanFeatures(req.params.id);
    ok(res, features);
  } catch (err) { handleError(res, err); }
};

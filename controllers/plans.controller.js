import * as planService from '../services/plan.service.js';

//
export const createPlan = async (req, res, next) => {
  try {
    const result = await planService.createPlan(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

//

export const getPlans = async (req, res, next) => {
  try {
    const result = await planService.getPlans();
    res.json(result);
  } catch (error) {
    next(error); // ✅
  }
};

export const updatePlan = async (req, res, next) => {
  try {
    const planId = req.params.id;

    const result = await planService.updatePlan(planId, req.body);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// controllers/plan.controller.js

export const getFeatures = async (req, res, next) => {
  try {
    const plan = await planService.getPlanFeatures(req.params.id);

    res.json(plan);
  } catch (error) {
    next(error);
  }
};

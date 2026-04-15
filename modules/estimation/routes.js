import { Router } from 'express';
import * as ctrl from './estimation.controller.js';

const router = Router();

// Health
router.get('/health', ctrl.health);

// Categories
router.get('/categories',               ctrl.getRootCategories);
router.get('/categories/:id/children',  ctrl.getChildCategories);
router.get('/categories/:id/leaf',      ctrl.getLeafCategory);

// Stateless calculation preview
router.post('/calculate',               ctrl.calculate);

// Projects (estimation created automatically on project creation)

router.get('/projects',                 ctrl.getProjects);
router.post('/projects',                ctrl.createProject);
router.get('/projects/:id',             ctrl.getProject);
router.get('/projects/:id/estimation',  ctrl.getEstimation);

// Leaf save / remove
router.post('/estimation/save-leaf',    ctrl.saveLeafResult);
router.delete('/estimation/leaf',       ctrl.removeLeaf);

export default router;

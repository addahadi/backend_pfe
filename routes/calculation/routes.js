import { Router } from 'express';
import * as ctrl from '../../controllers/calculation/estimation.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import checkSubscription from '../../middlewares/checkSubscription.js';
import checkUsage from '../../middlewares/checkUsage.js';
import { validate } from '../../middlewares/validate.js';
import { rateLimit } from '../../middlewares/rateLimit.js';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
import {
  CalculationInputSchema,
  CreateProjectSchema,
  SaveLeafResultSchema,
  RemoveLeafSchema,
  UUIDParamSchema,
} from '../../schemas/schemas.js';

const router = Router();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get('/health', ctrl.health);

// ─── Categories (public — needed before login for landing/demo) ───────────────
router.get('/categories/tree', ctrl.getCategoryTree);
router.get('/categories', ctrl.getRootCategories);
router.get('/categories/:id/children', ctrl.getChildCategories);
router.get('/categories/:id/leaf', ctrl.getLeafCategory);

// ─── Stateless calculation preview (auth required, counts against estimation_limit) ──
router.post(
  '/calculate',
  authenticate,
  checkSubscription,
  validate(CalculationInputSchema),
  ctrl.calculate,
);

// ─── Projects ─────────────────────────────────────────────────────────────────
router.get(
  '/projects',
  authenticate,
  checkSubscription,
  ctrl.getProjects,
);

router.post(
  '/projects',
  authenticate,
  checkSubscription,
  checkUsage('projects_limit'),
  rateLimit(20, 60_000),        // max 20 project creations/min per user
  upload.single('image'),
  (req, res, next) => {
    // Multer puts fields in req.body. 
    // We need to parse them before validate() if they were sent as FormData.
    // However, validate() expects req.body to be already populated.
    next();
  },
  validate(CreateProjectSchema),
  ctrl.createProject,
);

router.get(
  '/projects/:id',
  authenticate,
  validate(UUIDParamSchema, 'params'),
  ctrl.getProject,
);

router.get(
  '/projects/:id/estimation',
  authenticate,
  validate(UUIDParamSchema, 'params'),
  ctrl.getEstimation,
);

// ─── Leaf save / remove ───────────────────────────────────────────────────────
router.post(
  '/estimation/save-leaf',
  authenticate,
  checkSubscription,
  checkUsage('leaf_calculations_limit'),
  validate(SaveLeafResultSchema),
  ctrl.saveLeafResult,
);


router.delete(
  '/estimation/leaf',
  authenticate,
  validate(RemoveLeafSchema, 'body'),
  ctrl.removeLeaf,
);

// ─── Export ───────────────────────────────────────────────────────────────────
router.get(
  '/projects/:id/export',
  authenticate,
  checkSubscription,
  validate(UUIDParamSchema, 'params'),
  ctrl.exportProjectReport,
);

export default router;

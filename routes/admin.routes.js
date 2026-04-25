import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validate } from '../middlewares/validate.js';
import {
  adminUserIdParamSchema,
  updateAdminUserStatusSchema,
} from '../schemas/admin.schema.js';
import {
  getDashboard,
  getSubscribers,
  getUserDetails,
  getUsers,
  updateUserStatus,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/stats', getDashboard);
router.get('/subscribers', getSubscribers);
router.get('/users', getUsers);
router.get('/users/:userId', validate(adminUserIdParamSchema, 'params'), getUserDetails);
router.patch(
  '/users/:userId/status',
  validate(adminUserIdParamSchema, 'params'),
  validate(updateAdminUserStatusSchema),
  updateUserStatus
);

export default router;

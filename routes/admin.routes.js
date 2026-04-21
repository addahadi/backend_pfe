import { Router } from 'express';
import authenticate from '../middelwares/authenticate.js';
import { requireRole } from '../middelwares/reaquireRole.js';
import { validate } from '../middelwares/validate.js';
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

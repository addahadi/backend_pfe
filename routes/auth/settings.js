import express from 'express';
import { getSettings, updateSettings } from '../../controllers/externalService/settings.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/requireRole.js';

const router = express.Router();

// Settings are admin-only (exchange rate, tax coefficient, etc.)
router.get('/', authenticate, requireRole('ADMIN'), getSettings);
router.put('/', authenticate, requireRole('ADMIN'), updateSettings);

export default router;

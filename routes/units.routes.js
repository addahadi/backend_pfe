import { Router } from 'express';
import authenticate from '../middelwares/authenticate.js';
import { requireRole } from '../middelwares/reaquireRole.js';
import { listUnits, createUnit, updateUnit, deleteUnit } from '../controllers/units.controller.js';

const router = Router();

// GET /api/units  — public (used by estimation frontend)
router.get('/', listUnits);

// Admin-only mutations
router.post  ('/',         authenticate, requireRole('ADMIN'), createUnit);
router.patch ('/:unitId',  authenticate, requireRole('ADMIN'), updateUnit);
router.delete('/:unitId',  authenticate, requireRole('ADMIN'), deleteUnit);

export default router;
// Mount in app.js:  app.use('/api/units', unitsRouter);

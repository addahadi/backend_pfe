import express from 'express';
import { getAllServices, addService, updateService, deleteService } from '../../controllers/externalService/service.controller.js';
import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middelwares/reaquireRole.js';

const router = express.Router();

// Public read — services needed for estimation previews
router.get('/', getAllServices);

// Admin only — manage labor/installation service catalog
router.post('/', authenticate, requireRole('ADMIN'), addService);
router.put('/:id', authenticate, requireRole('ADMIN'), updateService);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteService);

export default router;

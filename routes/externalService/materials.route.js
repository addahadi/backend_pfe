import express from 'express';
import { getAllMaterials, addMaterial, updateMaterial, deleteMaterial } from '../../controllers/externalService/material.controller.js';
import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middelwares/reaquireRole.js';

const router = express.Router();

// Public read — materials are needed for estimation previews
router.get('/', getAllMaterials);

// Admin only — manage material catalog
router.post('/', authenticate, requireRole('ADMIN'), addMaterial);
router.put('/:id', authenticate, requireRole('ADMIN'), updateMaterial);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteMaterial);

export default router;

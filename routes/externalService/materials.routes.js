import express from 'express';
import { getAllMaterials, getMaterialFormulas, addMaterial, updateMaterial, deleteMaterial } from '../../controllers/externalService/material.controller.js';
import authenticate from '../../middelwares/authenticate.js';
import { requireRole } from '../../middelwares/reaquireRole.js';

const router = express.Router();

// Public reads
router.get('/',                  getAllMaterials);
router.get('/material-formulas', getMaterialFormulas); // dropdown for admin form

// Admin mutations
router.post  ('/',    authenticate, requireRole('ADMIN'), addMaterial);
router.put   ('/:id', authenticate, requireRole('ADMIN'), updateMaterial);
router.delete('/:id', authenticate, requireRole('ADMIN'), deleteMaterial);

export default router;

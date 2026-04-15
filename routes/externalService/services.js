import express from 'express';
import { getAllServices, addService, updateService, deleteService } from '../../controllers/externalService/serviceController.js';

const router = express.Router();

// جلب كل خدمات العمالة والتركيب (عرض قائمة التكاليف)
router.get('/', getAllServices);

// إضافة خدمة جديدة (مثلاً: أعمال العزل المائي)
router.post('/', addService);

// تعديل سعر عامل أو تكلفة معدات في خدمة معينة
router.put('/:id', updateService);

// حذف خدمة من القائمة
router.delete('/:id', deleteService);

export default router;
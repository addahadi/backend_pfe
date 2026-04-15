import express from 'express';
import { getAllMaterials, addMaterial, updateMaterial, deleteMaterial } from '../../controllers/externalService/materialController.js';

const router = express.Router();

// جلب كل المواد (يستخدم في عرض جدول الأسعار)
router.get('/', getAllMaterials);

// إضافة مادة جديدة (إذا أردتِ إضافة مادة من واجهة التطبيق مستقبلاً)
router.post('/', addMaterial);

// تعديل سعر مادة أو اسمها
router.put('/:id', updateMaterial);

// حذف مادة من القائمة
router.delete('/:id', deleteMaterial);

export default router;
const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

// جلب كل المواد (يستخدم في عرض جدول الأسعار)
router.get('/', materialController.getAllMaterials);

// إضافة مادة جديدة (إذا أردتِ إضافة مادة من واجهة التطبيق مستقبلاً)
router.post('/', materialController.addMaterial);

// تعديل سعر مادة أو اسمها
router.put('/:id', materialController.updateMaterial);

// حذف مادة من القائمة
router.delete('/:id', materialController.deleteMaterial);

module.exports = router;
const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// جلب كل خدمات العمالة والتركيب (عرض قائمة التكاليف)
router.get('/', serviceController.getAllServices);

// إضافة خدمة جديدة (مثلاً: أعمال العزل المائي)
router.post('/', serviceController.addService);

// تعديل سعر عامل أو تكلفة معدات في خدمة معينة
router.put('/:id', serviceController.updateService);

// حذف خدمة من القائمة
router.delete('/:id', serviceController.deleteService);

module.exports = router;
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// جلب الإعدادات الحالية (سعر الصرف، المعامل، الضريبة، إلخ)
router.get('/', settingsController.getSettings);

// تحديث الإعدادات (مثلاً إذا ارتفع معامل السوق السوداء لـ 1.8)
router.put('/', settingsController.updateSettings);

module.exports = router;
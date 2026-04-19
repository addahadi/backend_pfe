import express from 'express';
import { getSettings, updateSettings } from '../../controllers/externalService/settingsController.js';

const router = express.Router();

// جلب الإعدادات الحالية (سعر الصرف، المعامل، الضريبة، إلخ)
router.get('/', getSettings);

// تحديث الإعدادات (مثلاً إذا ارتفع معامل السوق السوداء لـ 1.8)
router.put('/', updateSettings);

export default router;
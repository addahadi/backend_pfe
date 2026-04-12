import express from 'express';
import {
    calculateCategory,
    generatePDFController as generatePDF,
    sendEmailController as sendEmail,
    createProjectEstimation,
} from '../../controllers/externalService/estimationController.js';

const router = express.Router();

// حساب التكلفة (المواد + الخدمات + المجموع)
router.post('/calculate/category', calculateCategory);

// توليد ملف PDF
router.post('/pdf/generate', generatePDF);

// إرسال بريد إلكتروني
router.post('/email/send', sendEmail);

// حفظ التقدير في قاعدة البيانات
router.post('/project/estimation', createProjectEstimation);

export default router;
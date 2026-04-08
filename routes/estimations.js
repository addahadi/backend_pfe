const express = require('express');
const router = express.Router();

// استوردنا غير الدوال اللي راهي واجدة في الـ Controller
const { 
    calculateCategory, 
    generatePDF, 
    sendEmail 
} = require('../controllers/estimationController');

// هادا الرابط هو اللي يحسب كلش (المواد والخدمات والمجموع)
router.post('/calculate/category', calculateCategory); 

// هادا الرابط يصنع الـ PDF بناءً على نفس الحسابات
router.post('/pdf/generate', generatePDF);

// هادا الرابط يبعث الإيميل بناءً على نفس الحسابات
router.post('/email/send', sendEmail);

module.exports = router;
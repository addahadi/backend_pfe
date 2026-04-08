 require('dotenv').config();
const express = require('express');
const cors = require('cors');

// استدعاء المسارات (Routes)
const estimationRoutes = require('./routes/estimations');
const materialRoutes = require('./routes/materials');
const serviceRoutes = require('./routes/services');
const settingRoutes = require('./routes/settings'); 

const app = express();

// 1. الإعدادات الأساسية (Middleware)
app.use(cors()); 
app.use(express.json()); 

// 2. رابط تجريبي (Health Check)
app.get('/test', (req, res) => {
    res.status(200).json({ 
        success: true, 
        message: "🚀 السيرفر شغال 100% وكل الأنظمة جاهزة للاختبار" 
    });
});

// 3. تفعيل المسارات (API Endpoints)
app.use('/api/estimations', estimationRoutes); 
app.use('/api/materials', materialRoutes); 
app.use('/api/services', serviceRoutes);
app.use('/api/settings', settingRoutes);

// 4. معالجة الروابط غير الموجودة
app.use((req, res) => {
    res.status(404).json({ success: false, message: "الرابط المطلوب غير موجود" });
});

// 5. تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
    ===============================================
    🚀 Server is LIVE on http://localhost:${PORT}
    🏗️  Backend for Construction Budget is READY
    ===============================================
    `);
});
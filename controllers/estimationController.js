const { estimationSchema } = require('../schemas/estimation.schema');
const estimationService = require('../services/estimationService');
const { generatePDF } = require('../services/pdfService');
const { sendEmail } = require('../services/emailService');

// حساب تصنيف معين (Category)
const calculateCategory = async (req, res) => {
    try {
        // 1. التحقق من البيانات باستعمال Zod
        const validatedData = estimationSchema.parse(req.body);
        
        // 2. بعث البيانات المحققة للـ service
        const result = await estimationService.calculateCategory(validatedData);
        
        res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error in calculateCategory:", error.message);
        
        // 3. إذا كان المشكل في الـ Validation (Zod)
        if (error.errors) {
            return res.status(400).json({ success: false, errors: error.errors });
        }
        
        // 4. أي خطأ آخر من السيرفر
        res.status(500).json({ success: false, message: error.message });
    }
};

// إنشاء ملف PDF
const generatePDFController = async (req, res) => {
    try {
        const calculatedData = await estimationService.calculateCategory(req.body);
        const pdfBuffer = await generatePDF(calculatedData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=estimation.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error("❌ PDF Error:", error.message);
        res.status(500).json({ success: false, message: "Error generating PDF" });
    }
};

// إرسال الإيميل
const sendEmailController = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        const calculatedData = await estimationService.calculateCategory(req.body);
        await sendEmail(email, calculatedData);

        res.status(200).json({ success: true, message: "Email sent successfully" });
    } catch (error) {
        console.error("❌ Email Error:", error.message);
        res.status(500).json({ success: false, message: "Error sending email" });
    }
};
// --- إضافة الوظيفة المطلوبة في العقد (حفظ في قاعدة البيانات) ---
const createProjectEstimation = async (req, res) => {
    try {
        const { project_id, budget_type } = req.body;

        // 1. التحقق من البيانات المطلوبة حسب العقد
        if (!project_id || !budget_type) {
            return res.status(400).json({ 
                success: false, 
                message: "project_id et budget_type obligatoires" 
            });
        }

        // 2. مناداة الـ Service للحساب والحفظ (تأكدي من وجود الفانكشن في الـ service)
        // سنستخدم validatedData كما فعلتِ في كودك
        const result = await estimationService.createAndSaveEstimation(req.body);

        // 3. الرد بنفس صيغة الـ Response الموجودة في صورتك (201 Created)
        res.status(201).json({
            success: true,
            estimation_id: result.id, // المعرف الذي يأتي من Supabase
            project_id: project_id,
            budget_type: budget_type,
            created_at: result.created_at
        });

    } catch (error) {
        console.error("❌ Error in createProjectEstimation:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// تحديث الـ exports لتشمل الوظيفة الجديدة
module.exports = { 
    calculateCategory,
    generatePDF: generatePDFController,
    sendEmail: sendEmailController,
    createProjectEstimation // أضفناها هنا
};


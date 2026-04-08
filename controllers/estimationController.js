const estimationService = require('../services/estimationService');
const { generatePDF } = require('../services/pdfService');
const { sendEmail } = require('../services/emailService');

// حساب تصنيف معين (Category)
const calculateCategory = async (req, res) => {
    try {
        const result = await estimationService.calculateCategory(req.body);
        res.status(200).json(result);
    } catch (error) {
        console.error("❌ Error in calculateCategory:", error.message);
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

module.exports = { 
    calculateCategory,
    generatePDF: generatePDFController,
    sendEmail: sendEmailController
};
import * as estimationService from '../../services/externalService/estimationService.js';
import { generatePDF } from '../../services/externalService/pdfService.js';
import { sendEmail } from '../../services/externalService/emailService.js';
import { ok, handleError } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// حساب تصنيف معين (Category)
export const calculateCategory = async (req, res) => {
    try {
        const result = await estimationService.calculateCategory(req.body);
        ok(res, result);
    } catch (err) {
        handleError(res, err);
    }
};

// إنشاء ملف PDF
export const generatePDFController = async (req, res) => {
    try {
        const calculatedData = await estimationService.calculateCategory(req.body);
        const pdfBuffer = await generatePDF(calculatedData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=estimation.pdf');
        res.send(pdfBuffer);
    } catch (err) {
        handleError(res, err);
    }
};

// إرسال الإيميل
export const sendEmailController = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) throw new ValidationError('Email is required');

        const calculatedData = await estimationService.calculateCategory(req.body);
        await sendEmail(email, calculatedData);

        ok(res, { message: 'Email sent successfully' });
    } catch (err) {
        handleError(res, err);
    }
};

// حفظ التقدير في قاعدة البيانات
export const createProjectEstimation = async (req, res) => {
    try {
        const { project_id, budget_type } = req.body;

        if (!project_id || !budget_type) {
            throw new ValidationError('project_id and budget_type are required');
        }

        const result = await estimationService.createAndSaveEstimation(req.body);

        ok(res, {
            estimation_id: result.id,
            project_id,
            budget_type,
            created_at: result.created_at,
        }, 201);
    } catch (err) {
        handleError(res, err);
    }
};

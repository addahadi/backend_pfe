/**
 * Middleware لمعالجة الأخطاء بشكل موحد في كامل التطبيق
 */
const errorHandler = (err, req, res, next) => {
    console.error("❌ Stack Trace:", err.stack);

    // إذا كان الخطأ محدد مسبقاً (مثل خطأ في المدخلات)
    const statusCode = err.statusCode || 500;
    const message = err.message || "Erreur interne du serveur";

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message,
        // نبعث تفاصيل الخطأ فقط إذا كنا في وضع التطوير (Development)
        stack: process.env.NODE_ENV === 'development' ? err.stack : null
    });
};

module.exports = errorHandler;
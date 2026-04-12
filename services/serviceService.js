// 1. تصحيح المسار للوصول إلى مجلد config
const supabase = require('../supabaseClient'); 

/**
 * جلب جميع الخدمات وتكاليف العمالة والمعدات من قاعدة البيانات 
 */
const getAllServices = async () => {
    try {
        // 2. وضع أسماء الأعمدة داخل String واحد مفصول بفاصلة
        const { data, error } = await supabase
            .from('service_config')
            .select(`
                service_name_ar, 
                service_name_en, 
                equipment_cost, 
                manpower_cost, 
                install_labor_price, 
                unit_en,
                unit_ar
            `);

        if (error) {
            console.error("❌ خطأ في جلب البيانات من Supabase:", error.message);
            throw error;
        }

        return data; 
    } catch (err) {
        console.error("❌ فشل الاتصال بـ serviceService:", err.message);
        return []; 
    }
};

module.exports = { getAllServices };
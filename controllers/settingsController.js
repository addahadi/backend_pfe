const supabase = require('../supabaseClient');

// 1. جلب الإعدادات الحالية
const getSettings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('financial_settings')
            .select('*')
            .limit(1) // نجيبو أول سطر موجود
            .single();

        if (error || !data) {
            // إذا كان الجدول فارغ أو فيه خطأ، نبعتو قيم افتراضية
            return res.status(200).json({
                success: true,
                data: {
                    market_factor: 1.7,
                    usd_to_dzd_base: 225.31,
                    tax_rate: 0.19 
                }
            });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. تحديث الإعدادات
const updateSettings = async (req, res) => {
    try {
        const updatedData = req.body;

        // أولاً: لازم نجيبو الـ config_id تاع السطر الوحيد اللي كاين
        const { data: currentSettings } = await supabase
            .from('financial_settings')
            .select('config_id')
            .limit(1)
            .single();

        if (!currentSettings) {
            return res.status(404).json({ success: false, message: "No settings found to update. Please add a row in Supabase first." });
        }

        const { data, error } = await supabase
            .from('financial_settings')
            .update(updatedData)
            .eq('config_id', currentSettings.config_id) // نستعملو الـ ID الحقيقي ماشي رقم 1
            .select();

        if (error) throw error;
        res.status(200).json({ success: true, message: "Settings updated successfully", data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
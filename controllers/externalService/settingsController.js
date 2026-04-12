import supabase from '../../supabaseClient.js';
import { ok, handleError, notFound } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// 1. جلب الإعدادات الحالية
export const getSettings = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('financial_settings')
            .select('*')
            .limit(1)
            .single();

        if (error || !data) {
            // قيم افتراضية إذا كان الجدول فارغاً
            return ok(res, {
                market_factor: 1.7,
                usd_to_dzd_base: 225.31,
                tax_rate: 0.19,
            });
        }

        ok(res, data);
    } catch (err) {
        handleError(res, err);
    }
};

// 2. تحديث الإعدادات
export const updateSettings = async (req, res) => {
    try {
        const updatedData = req.body;

        // جلب الـ config_id تاع السطر الوحيد
        const { data: currentSettings } = await supabase
            .from('financial_settings')
            .select('config_id')
            .limit(1)
            .single();

        if (!currentSettings) {
            return notFound(res, 'No settings found. Please add a row in Supabase first.');
        }

        const { data, error } = await supabase
            .from('financial_settings')
            .update(updatedData)
            .eq('config_id', currentSettings.config_id)
            .select();

        if (error) throw new ValidationError(error.message);
        ok(res, data[0]);
    } catch (err) {
        handleError(res, err);
    }
};
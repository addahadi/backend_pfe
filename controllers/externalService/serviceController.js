const serviceService = require('../services/serviceService');
const supabase = require('../../supabaseClient');

// 1. جلب كل الخدمات (متوافق مع جدول service_config)
const getAllServices = async (req, res) => {
    try {
        const services = await serviceService.getAllServices();
        res.status(200).json({ success: true, data: services });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. إضافة خدمة جديدة
const addService = async (req, res) => {
    try {
        const newService = req.body;
        const { data, error } = await supabase
            .from('service_config')
            .insert([newService]);

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. تعديل بيانات خدمة (مثل تحديث سعر المانبوور Manpower)
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const { data, error } = await supabase
            .from('service_config')
            .update(updatedData)
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 4. حذف خدمة
const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('service_config')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getAllServices,
    addService,
    updateService,
    deleteService
};
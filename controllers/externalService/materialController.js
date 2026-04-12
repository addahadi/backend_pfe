const materialService = require('../services/materialService');
const supabase = require('../../supabaseClient'); 

// 1. جلب كل المواد
const getAllMaterials = async (req, res) => {
    try {
        const materials = await materialService.getAllMaterials();
        res.status(200).json({ success: true, data: materials });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 2. إضافة مادة جديدة
const addMaterial = async (req, res) => {
    try {
        const newMaterial = req.body;
        const { data, error } = await supabase
            .from('resource_catalog')
            .insert([newMaterial]);

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 3. تعديل مادة (تم تصحيح الحقل هنا)
const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const { data, error } = await supabase
            .from('resource_catalog')
            .update(updatedData)
            .eq('material_id', id); // تم التغيير من id إلى material_id

        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// 4. حذف مادة (صحيحة)
const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('resource_catalog')
            .delete()
            .eq('material_id', id);

        if (error) throw error;
        res.status(200).json({ success: true, message: "Material deleted" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getAllMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial
};
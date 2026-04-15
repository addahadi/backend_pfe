import * as materialService from '../../services/externalService/materialService.js';
import supabase from '../../supabaseClient.js';
import { ok, handleError, notFound } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// 1. جلب كل المواد
export const getAllMaterials = async (req, res) => {
    try {
        const materials = await materialService.getAllMaterials();
        ok(res, materials);
    } catch (err) {
        handleError(res, err);
    }
};

// 2. إضافة مادة جديدة
export const addMaterial = async (req, res) => {
    try {
        const newMaterial = req.body;
        const { data, error } = await supabase
            .from('resource_catalog')
            .insert([newMaterial])
            .select();

        if (error) throw new ValidationError(error.message);
        ok(res, data, 201);
    } catch (err) {
        handleError(res, err);
    }
};

// 3. تعديل مادة
export const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const { data, error } = await supabase
            .from('resource_catalog')
            .update(updatedData)
            .eq('material_id', id)
            .select();

        if (error) throw new ValidationError(error.message);
        if (!data || data.length === 0) return notFound(res, `Material with id ${id} not found`);
        ok(res, data[0]);
    } catch (err) {
        handleError(res, err);
    }
};

// 4. حذف مادة
export const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('resource_catalog')
            .delete()
            .eq('material_id', id);

        if (error) throw new ValidationError(error.message);
        ok(res, { message: 'Material deleted successfully' });
    } catch (err) {
        handleError(res, err);
    }
};
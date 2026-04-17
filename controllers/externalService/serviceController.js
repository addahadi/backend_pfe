import * as serviceService from '../../services/externalService/serviceService.js';
import supabase from '../../supabaseClient.js';
import { ok, handleError, notFound } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// 1. جلب كل الخدمات
export const getAllServices = async (req, res) => {
    try {
        const services = await serviceService.getAllServices();
        ok(res, services);
    } catch (err) {
        handleError(res, err);
    }
};

// 2. إضافة خدمة جديدة
export const addService = async (req, res) => {
    try {
        const newService = req.body;
        const { data, error } = await supabase
            .from('service_config')
            .insert([newService])
            .select();

        if (error) throw new ValidationError(error.message);
        ok(res, data, 201);
    } catch (err) {
        handleError(res, err);
    }
};

// 3. تعديل خدمة
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Updating service with service_id: ${id}`);
        const updatedData = req.body;
        const { data, error } = await supabase
            .from('service_config')
            .update(updatedData)
            .eq('service_id', id)
            .select();

        if (error) throw new ValidationError(error.message);
        if (!data || data.length === 0) return notFound(res, `Service with service_id ${id} not found`);
        ok(res, data[0]);
    } catch (err) {
        handleError(res, err);
    }
};

// 4. حذف خدمة
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Deleting service with service_id: ${id}`);
        const { error } = await supabase
            .from('service_config')
            .delete()
            .eq('service_id', id);

        if (error) throw new ValidationError(error.message);
        ok(res, { message: 'Service deleted successfully' });
    } catch (err) {
        handleError(res, err);
    }
};
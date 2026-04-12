import supabase from '../../supabaseClient.js';
import { ValidationError } from '../../utils/AppError.js';

const getAllServices = async () => {
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

    if (error) throw new ValidationError(error.message);
    return data;
};

export { getAllServices };
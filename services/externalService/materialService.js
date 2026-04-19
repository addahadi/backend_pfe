import supabase from '../../supabaseClient.js';
import { ValidationError } from '../../utils/AppError.js';

const getAllMaterials = async () => {
    const { data, error } = await supabase
        .from('resource_catalog')
        .select('material_name_ar, material_name_en, min_price_usd, unit_price_usd, max_price_usd, default_waste_factor');

    if (error) throw new ValidationError(error.message);
    return data;
};

export { getAllMaterials };
const supabase = require('../supabaseClient');

const getAllMaterials = async () => {
    try {
        // جلب كل الأعمدة المالية والأسماء بالعربية والإنجليزية [cite: 1, 2]
        const { data, error } = await supabase
            .from('resource_catalog') 
            .select('material_name_ar, material_name_en, min_price_usd, unit_price_usd, max_price_usd, default_waste_factor');

        if (error) throw error;
        return data; // يرجع مصفوفة المواد 
    } catch (err) {
        console.error("❌ Error in materialService:", err.message);
        return [];
    }
};

module.exports = { getAllMaterials };
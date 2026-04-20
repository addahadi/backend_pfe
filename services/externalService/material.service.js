import sql from '../../config/database.js';
import { ValidationError } from '../../utils/AppError.js';

const getAllMaterials = async () => {
    try {
        const rows = await sql`
            SELECT
                material_name_ar,
                material_name_en,
                min_price_usd,
                unit_price_usd,
                max_price_usd,
                default_waste_factor
            FROM resource_catalog
        `;
        return rows;
    } catch (err) {
        throw new ValidationError(err.message);
    }
};

export { getAllMaterials };

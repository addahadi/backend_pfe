import sql from '../../config/database.js';
import { ValidationError } from '../../utils/AppError.js';

const getAllServices = async () => {
    try {
        const rows = await sql`
            SELECT
                service_name_ar,
                service_name_en,
                equipment_cost,
                manpower_cost,
                install_labor_price,
                unit_en,
                unit_ar
            FROM service_config
        `;
        return rows;
    } catch (err) {
        throw new ValidationError(err.message);
    }
};

export { getAllServices };

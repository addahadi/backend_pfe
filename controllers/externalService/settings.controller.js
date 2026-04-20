import sql from '../../config/database.js';
import { ok, handleError, notFound } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// 1. Get current settings
export const getSettings = async (req, res) => {
    try {
        const [data] = await sql`
            SELECT * FROM financial_settings 
            LIMIT 1
        `;

        if (!data) {
            // Default values if table is empty
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

// 2. Update settings
export const updateSettings = async (req, res) => {
    try {
        const updatedData = req.body;

        // Get the config_id of the single row
        const [currentSettings] = await sql`
            SELECT config_id 
            FROM financial_settings 
            LIMIT 1
        `;

        if (!currentSettings) {
            return notFound(res, 'No settings found. Please add a row in Supabase first.');
        }

        const [data] = await sql`
            UPDATE financial_settings
            SET ${sql(updatedData, Object.keys(updatedData))}
            WHERE config_id = ${currentSettings.config_id}
            RETURNING *
        `;

        if (!data) throw new ValidationError('Update failed');
        ok(res, data);
    } catch (err) {
        handleError(res, err);
    }
};
import sql from '../../config/database.js';
import * as materialService from '../../services/externalService/material.service.js';
import { ok, handleError, notFound } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// 1. Get all materials
export const getAllMaterials = async (req, res) => {
    try {
        const materials = await materialService.getAllMaterials();
        ok(res, materials);
    } catch (err) {
        handleError(res, err);
    }
};

// 2. Add new material
export const addMaterial = async (req, res) => {
    try {
        const newMaterial = req.body;
        const [data] = await sql`
            INSERT INTO resource_catalog ${sql(newMaterial)}
            RETURNING *
        `;

        if (!data) throw new ValidationError('Insert failed');
        ok(res, data, 201);
    } catch (err) {
        handleError(res, err);
    }
};

// 3. Update material
export const updateMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const [data] = await sql`
            UPDATE resource_catalog
            SET ${sql(updatedData, Object.keys(updatedData))}
            WHERE material_id = ${id}
            RETURNING *
        `;

        if (!data) return notFound(res, `Material with id ${id} not found`);
        ok(res, data);
    } catch (err) {
        handleError(res, err);
    }
};

// 4. Delete material
export const deleteMaterial = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await sql`
            DELETE FROM resource_catalog
            WHERE material_id = ${id}
        `;

        ok(res, { message: 'Material deleted successfully' });
    } catch (err) {
        handleError(res, err);
    }
};
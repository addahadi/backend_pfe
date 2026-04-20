import sql from '../../config/database.js';
import * as serviceService from '../../services/externalService/service.service.js';
import { ok, handleError, notFound } from '../../utils/http.js';
import { ValidationError } from '../../utils/AppError.js';

// 1. Get all services
export const getAllServices = async (req, res) => {
    try {
        const services = await serviceService.getAllServices();
        ok(res, services);
    } catch (err) {
        handleError(res, err);
    }
};

// 2. Add new service
export const addService = async (req, res) => {
    try {
        const newService = req.body;
        const [data] = await sql`
            INSERT INTO service_config ${sql(newService)}
            RETURNING *
        `;

        if (!data) throw new ValidationError('Insert failed');
        ok(res, data, 201);
    } catch (err) {
        handleError(res, err);
    }
};

// 3. Update service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Updating service with service_id: ${id}`);
        const updatedData = req.body;
        const [data] = await sql`
            UPDATE service_config
            SET ${sql(updatedData, Object.keys(updatedData))}
            WHERE service_id = ${id}
            RETURNING *
        `;

        if (!data) return notFound(res, `Service with service_id ${id} not found`);
        ok(res, data);
    } catch (err) {
        handleError(res, err);
    }
};

// 4. Delete service
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Deleting service with service_id: ${id}`);
        const result = await sql`
            DELETE FROM service_config
            WHERE service_id = ${id}
        `;

        ok(res, { message: 'Service deleted successfully' });
    } catch (err) {
        handleError(res, err);
    }
};
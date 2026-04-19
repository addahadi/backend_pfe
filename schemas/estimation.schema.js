import { z } from 'zod';

const estimationSchema = z.object({
    budget_type: z.enum(['optimiste', 'pessimiste', 'normal']),
    project_id: z.string().uuid().optional(),
    materiaux: z.array(z.object({
        material_name: z.string(),
        quantite: z.number().positive(),
        unit_price_usd: z.number().nonnegative()
    })).min(1),
    services: z.array(z.object({
        service_name: z.string(),
        quantite: z.number().positive()
    })).optional()
});

export { estimationSchema };
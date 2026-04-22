import { z } from 'zod';

// -----------------------------
// CREATE PLAN
// -----------------------------

export const createPlanSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
  price: z.number(),
  duration: z.number(),
  plan_type_id: z.string(),
});

// -----------------------------
// UPDATE PLAN
// -----------------------------
export const updatePlanSchema = z.object({
  name_en: z.string().min(2).optional(),
  name_ar: z.string().min(2).optional(),

  plan_type_id: z.string(),

  price: z.number().min(0).optional(),

  duration: z.number().min(1).optional(),

  features: z
    .array(
      z.object({
        key: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
});
// -----------------------------
// PLAN TYPE SCHEMAS
// -----------------------------

export const createPlanTypeSchema = z.object({
  name_en: z.string().min(2),
  name_ar: z.string().min(2),
});

export const updatePlanTypeSchema = z.object({
  name_en: z.string().min(2).optional(),
  name_ar: z.string().min(2).optional(),
});

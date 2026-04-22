import { z } from 'zod';

const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Invalid UUID format");

// ─── Calculation ──────────────────────────────────────────────────────────────

export const CalculationInputSchema = z.object({
  category_id:          UUID,
  selected_formula_id:  UUID,
  selected_config_id:   UUID.nullable().default(null),
  field_values: z
    .record(z.string().min(1), z.number())
    .refine(v => Object.keys(v).length > 0, {
      message: 'field_values must not be empty',
    }),
});

// ─── Project ──────────────────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name:         z.string().min(1).max(200),
  description:  z.string().max(1000).optional(),
  budget_type:  z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  total_budget: z.number().positive().optional(),
});

// ─── Save leaf result ─────────────────────────────────────────────────────────

export const SaveLeafResultSchema = z.object({
  project_id:               UUID,
  category_id:              UUID,
  selected_formula_id:      UUID,
  selected_config_id:       UUID.nullable().default(null),
  project_details_id:       UUID.nullable().default(null),
  field_values:             z.record(z.string().min(1), z.number().finite()),
  formula_version_snapshot: z.number().int().positive(),
  results:                  z.record(z.string(), z.unknown()),
  material_lines: z.array(z.object({
    material_id:           UUID,
    material_name:         z.string(),
    material_type:         z.enum(['PRIMARY', 'ACCESSORY']),
    quantity:              z.number().nonnegative(),
    applied_waste:         z.number().nonnegative(),
    quantity_with_waste:   z.number().nonnegative(),
    unit_price_snapshot:   z.number().nonnegative(),
    waste_factor_snapshot: z.number().nonnegative(),
    sub_total:             z.number().nonnegative(),
  })),
  leaf_total: z.number().nonnegative(),
});

// ─── Remove a leaf ────────────────────────────────────────────────────────────

export const RemoveLeafSchema = z.object({
  project_details_id: UUID,
});

// ─── Params ───────────────────────────────────────────────────────────────────

export const UUIDParamSchema = z.object({ id: UUID });
export const CategoryParamSchema = z.object({ categoryId: UUID });

import { z } from 'zod';

const uuid = z.string().uuid();
const varNameRegex = /^[a-z][a-z0-9_]*$/;
const emptyToNull = (value) => {
  if (value === '' || value === 'null' || value === 'undefined') return null;
  return value;
};
const optionalNullableUuid = z.preprocess(emptyToNull, uuid.nullable().optional());

// ── Category ──────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name_en:        z.string().min(1, 'Name (EN) is required'),
  name_ar:        z.string().default(''),
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  icon:           z.string().default('📂'),
  parent_id:      optionalNullableUuid,
  category_level: z.enum(['ROOT', 'DOMAIN', 'SUB_TYPE']),
  sort_order:     z.number().int().default(0),
});

export const UpdateCategorySchema = z.object({
  name_en:        z.string().min(1).optional(),
  name_ar:        z.string().optional(),
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  icon:           z.string().optional(),
  is_active:      z.boolean().optional(),
  sort_order:     z.number().int().optional(),
  category_level: z.enum(['ROOT', 'DOMAIN', 'SUB_TYPE']).optional(),
});

// ── Formula ───────────────────────────────────────────────────────────────────

export const CreateFormulaSchema = z.object({
  name:           z.string().min(1, 'Formula name is required'),
  expression:     z.string().min(1, 'Expression is required'),
  output_unit_id: uuid,
});

export const UpdateFormulaSchema = z.object({
  name:           z.string().min(1).optional(),
  expression:     z.string().min(1).optional(),
  output_unit_id: uuid.optional(),
});

// ── Formula Output ────────────────────────────────────────────────────────────
// Defines a named key the engine registers in the variable context after
// evaluating this formula.  e.g. output_key="volume_beton" is what
// MATERIAL formula expressions reference.

export const CreateFormulaOutputSchema = z.object({
  output_key:     z
    .string()
    .min(1, 'Output key is required')
    .regex(varNameRegex, 'Must be lowercase letters/digits/underscores, starting with a letter'),
  output_label:   z.string().min(1, 'Output label is required'),
  output_unit_id: optionalNullableUuid,
});

export const UpdateFormulaOutputSchema = z.object({
  output_key:     z.string().regex(varNameRegex).optional(),
  output_label:   z.string().min(1).optional(),
  output_unit_id: optionalNullableUuid,
});

// ── Field definition ──────────────────────────────────────────────────────────

export const CreateFieldSchema = z.object({
  label_en:          z.string().min(1, 'Label is required'),
  label_ar:          z.string().default(''),
  variable_name:     z
    .string()
    .regex(varNameRegex, 'Must start with a lowercase letter, then lowercase letters/digits/underscores only'),
  unit_id:           optionalNullableUuid,
  required:          z.boolean().default(true),
  default_value:     z.string().nullable().optional(),
  source_formula_id: optionalNullableUuid,
  sort_order:        z.number().int().default(0),
});

export const UpdateFieldSchema = z.object({
  label_en:          z.string().min(1).optional(),
  label_ar:          z.string().optional(),
  variable_name:     z.string().regex(varNameRegex).optional(),
  unit_id:           optionalNullableUuid,
  required:          z.boolean().optional(),
  default_value:     z.string().nullable().optional(),
  source_formula_id: optionalNullableUuid,
  sort_order:        z.number().int().optional(),
});

// ── Material Config ───────────────────────────────────────────────────────────

export const CreateConfigSchema = z.object({
  name:        z.string().min(1, 'Config name is required'),
  description: z.string().nullable().optional(),
});

export const UpdateConfigSchema = z.object({
  name:        z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

// ── Coefficient ───────────────────────────────────────────────────────────────

export const CreateCoefficientSchema = z.object({
  name_en:         z.string().regex(varNameRegex, 'Must be a valid variable name'),
  name_ar:         z.string().default(''),
  value:           z.number({ required_error: 'Value is required' }),
  unit_id:         optionalNullableUuid,
  config_group_id: optionalNullableUuid,
});

export const UpdateCoefficientSchema = z.object({
  name_en:         z.string().regex(varNameRegex).optional(),
  name_ar:         z.string().optional(),
  value:           z.number().optional(),
  unit_id:         optionalNullableUuid,
  config_group_id: optionalNullableUuid,
});

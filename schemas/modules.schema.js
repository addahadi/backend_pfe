import { z } from 'zod';

// Coerce empty string → null so the frontend can safely send "" for unset UUID fields
// instead of having to conditionally omit them.

const varNameRegex = /^[a-z][a-z0-9_]*$/;

// ── Category ──────────────────────────────────────────────────────────────────

export const CreateCategorySchema = z.object({
  name_en:        z.string().min(1, 'Name (EN) is required'),
  name_ar:        z.string().default(''),
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  icon:           z.string().default('📂'),
  parent_id:      z.string().nullable(),
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
  name_en:        z.string().min(1, 'Formula name (EN) is required'),
  name_ar:        z.string().default(''),
  expression:     z.string().min(1, 'Expression is required'),
  output_unit_id: z.string(),
  formula_type:   z.enum(['NON_MATERIAL', 'MATERIAL']).optional(),
});

export const UpdateFormulaSchema = z.object({
  name_en:        z.string().min(1).optional(),
  name_ar:        z.string().optional(),
  expression:     z.string().min(1).optional(),
  output_unit_id: z.string().optional(),
  formula_type:   z.enum(['NON_MATERIAL', 'MATERIAL']).optional(),
});

// ── Formula Output ────────────────────────────────────────────────────────────

export const CreateFormulaOutputSchema = z.object({
  output_key:      z.string().min(1).regex(varNameRegex, 'Must be lowercase letters/digits/underscores, starting with a letter'),
  output_label_en:    z.string().min(1, 'Output label is required'),
  output_label_ar:    z.string().nullable().optional(),
  output_unit_id:  z.string(),
});

export const UpdateFormulaOutputSchema = z.object({
  output_key:      z.string().regex(varNameRegex).optional(),
  output_label:    z.string().min(1).optional(),
  output_unit_id:  z.string(),
});

// ── Field definition ──────────────────────────────────────────────────────────

export const CreateFieldSchema = z.object({
  label_en:          z.string().min(1, 'Label is required'),
  label_ar:          z.string().default(''),
  variable_name:     z.string().regex(varNameRegex, 'Must start with a lowercase letter, then lowercase letters/digits/underscores only'),
  unit_id:           z.string().nullable().optional(),
  required:          z.boolean().default(true),
  default_value:     z.string().nullable().optional(),
  source_formula_id: z.string().nullable().optional(),
  sort_order:        z.number().int().default(0),
});

export const UpdateFieldSchema = z.object({
  label_en:          z.string().min(1).optional(),
  label_ar:          z.string().optional(),
  variable_name:     z.string().regex(varNameRegex).optional(),
  unit_id:           z.string().nullable().optional(),
  required:          z.boolean().optional(),
  default_value:     z.string().nullable().optional(),
  source_formula_id: z.string().nullable().optional(),
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
  unit_id:         z.string().nullable().optional(),
  config_group_id: z.string().nullable().optional(),
});

export const UpdateCoefficientSchema = z.object({
  name_en:         z.string().regex(varNameRegex).optional(),
  name_ar:         z.string().optional(),
  value:           z.number().optional(),
  unit_id:         z.string().nullable().optional(),
  config_group_id: z.string().nullable().optional(),
});

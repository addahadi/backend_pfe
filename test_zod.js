const { z } = require('zod');

const uuid = z.string().uuid();
const CreateCategorySchema = z.object({
  name_en:        z.string().min(1, 'Name (EN) is required'),
  name_ar:        z.string().default(''),
  description_en: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  icon:           z.string().default('📂'),
  parent_id:      uuid.nullable().optional(),
  category_level: z.enum(['ROOT', 'DOMAIN', 'SUB_TYPE']),
  sort_order:     z.number().int().default(0),
});

try {
  CreateCategorySchema.parse({
    name_en: "test",
    name_ar: "test",
    icon: "folder",
    parent_id: null,
    category_level: "ROOT"
  });
  console.log("Category creation works with parent_id: null");
} catch (e) {
  console.error(JSON.stringify(e.errors, null, 2));
}

const CreateFormulaOutputSchema = z.object({
  output_key:     z
    .string()
    .min(1, 'Output key is required')
    .regex(/^[a-z][a-z0-9_]*$/, 'Must be lowercase letters/digits/underscores, starting with a letter'),
  output_label:   z.string().min(1, 'Output label is required'),
  output_unit_id: uuid.nullable().optional(),
});

try {
  CreateFormulaOutputSchema.parse({
    output_key: "test",
    output_label: "test",
    output_unit_id: ""
  });
  console.log("Formula output works with empty string");
} catch(e) {
  console.log("Formula output failed with empty string as expected:");
  console.error(JSON.stringify(e.errors, null, 2));
}

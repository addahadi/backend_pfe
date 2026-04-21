import sql from '../config/database.js';

// ── Internal helpers ──────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildTree(rows) {
  const map = Object.fromEntries(rows.map(r => [r.category_id, { ...r, children: [] }]));
  const roots = [];
  for (const r of rows) {
    if (r.parent_id && map[r.parent_id]) map[r.parent_id].children.push(map[r.category_id]);
    else if (!r.parent_id) roots.push(map[r.category_id]);
  }
  return roots;
}

// ── Units (shared lookup) ─────────────────────────────────────────────────────

export async function getUnits() {
  return sql`SELECT unit_id, name_en, name_ar, symbol FROM units ORDER BY symbol`;
}

// ── Admin category tree ───────────────────────────────────────────────────────

export async function getAdminTree() {
  const rows = await sql`
    SELECT category_id, parent_id, category_level,
           name_en, name_ar, description_en, description_ar,
           icon, is_active, sort_order
    FROM   categories
    ORDER  BY sort_order, name_en
  `;
  return buildTree(rows);
}

// ── Leaf details ──────────────────────────────────────────────────────────────
// FIX: use correlated subqueries for fields[] and outputs[] to avoid the
// cross-product corruption that occurs when joining both tables in the same
// outer query with GROUP BY + json_agg.

export async function getLeafDetails(category_id) {
  const [[category], formulas, configs, coefficients] = await Promise.all([

    sql`
      SELECT category_id, parent_id, category_level, name_en, name_ar,
             description_en, description_ar, icon, is_active, sort_order
      FROM   categories
      WHERE  category_id = ${category_id}
    `,

    // Each formula gets its own fields[] and outputs[] via correlated subqueries.
    // This avoids the field × output cross-product that would corrupt both
    // json_agg results if we joined both tables in the same query.
    sql`
      SELECT
        f.formula_id,
        f.name,
        f.expression,
        f.formula_type,
        f.version,
        f.output_unit          AS output_unit_id,
        u.symbol               AS output_unit_symbol,

        -- fields correlated subquery
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'field_id',          fd.field_id,
                'label_en',          fd.label_en,
                'label_ar',          fd.label_ar,
                'variable_name',     fd.variable_name,
                'required',          fd.required,
                'default_value',     fd.default_value,
                'sort_order',        fd.sort_order,
                'unit_id',           fd.unit_id,
                'unit_symbol',       fu.symbol,
                'source_formula_id', fd.source_formula_id
              ) ORDER BY fd.sort_order
            ) FILTER (WHERE fd.field_id IS NOT NULL),
            '[]'::json
          )
          FROM   field_definitions fd
          LEFT JOIN units fu ON fu.unit_id = fd.unit_id
          WHERE  fd.formula_id = f.formula_id
        ) AS fields,

        -- outputs correlated subquery
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'output_id',     fo.output_id,
                'output_key',    fo.output_key,
                'output_label',  fo.output_label,
                'output_unit_id', fo.output_unit_id,
                'unit_symbol',   ou.symbol
              ) ORDER BY fo.output_id
            ) FILTER (WHERE fo.output_id IS NOT NULL),
            '[]'::json
          )
          FROM   formula_output fo
          LEFT JOIN units ou ON ou.unit_id = fo.output_unit_id
          WHERE  fo.formula_id = f.formula_id
        ) AS outputs

      FROM   formulas f
      JOIN   units u ON u.unit_id = f.output_unit
      WHERE  f.category_id  = ${category_id}
        AND  f.formula_type = 'NON_MATERIAL'
      ORDER  BY f.name
    `,

    sql`
      SELECT config_id, name, description
      FROM   material_config
      WHERE  category_id = ${category_id}
      ORDER  BY name
    `,

    sql`
      SELECT c.coefficient_id, c.name_en, c.name_ar, c.value,
             c.config_group_id, u.symbol AS unit_symbol
      FROM   coefficients c
      LEFT JOIN units u ON u.unit_id = c.unit_id
      WHERE  c.category_id = ${category_id}
      ORDER  BY c.name_en
    `,
  ]);

  if (!category) return null;
  return { ...category, formulas, configs, coefficients };
}

// ── Category CRUD ─────────────────────────────────────────────────────────────

export async function createCategory(dto) {
  const slug = `${slugify(dto.name_en)}-${Date.now().toString(36)}`;
  const [row] = await sql`
    INSERT INTO categories
      (name_en, name_ar, description_en, description_ar, icon,
       parent_id, category_level, sort_order, slug)
    VALUES
      (${dto.name_en}, ${dto.name_ar ?? ''},
       ${dto.description_en ?? null}, ${dto.description_ar ?? null},
       ${dto.icon ?? '📂'}, ${dto.parent_id ?? null},
       ${dto.category_level}, ${dto.sort_order ?? 0}, ${slug})
    RETURNING category_id, parent_id, category_level,
              name_en, name_ar, description_en, description_ar,
              icon, is_active, sort_order
  `;
  return { ...row, children: [] };
}

export async function updateCategory(category_id, dto) {
  const updates = {};
  if ('name_en'        in dto) { updates.name_en = dto.name_en; updates.slug = `${slugify(dto.name_en)}-${Date.now().toString(36)}`; }
  if ('name_ar'        in dto) updates.name_ar        = dto.name_ar;
  if ('description_en' in dto) updates.description_en = dto.description_en;
  if ('description_ar' in dto) updates.description_ar = dto.description_ar;
  if ('icon'           in dto) updates.icon           = dto.icon;
  if ('is_active'      in dto) updates.is_active      = dto.is_active;
  if ('sort_order'     in dto) updates.sort_order     = dto.sort_order;
  if ('category_level' in dto) updates.category_level = dto.category_level;

  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE categories
    SET    ${sql(updates)}, updated_at = NOW()
    WHERE  category_id = ${category_id}
    RETURNING category_id, parent_id, category_level,
              name_en, name_ar, description_en, description_ar,
              icon, is_active, sort_order
  `;
  return row;
}

export async function deleteCategory(category_id) {
  const children = await sql`
    SELECT category_id FROM categories WHERE parent_id = ${category_id} LIMIT 1
  `;
  if (children.length) throw new Error('Cannot delete a category that has sub-categories');
  await sql`DELETE FROM categories WHERE category_id = ${category_id}`;
}

// ── Formula CRUD ──────────────────────────────────────────────────────────────

export async function createFormula(category_id, dto) {
  const [row] = await sql`
    INSERT INTO formulas (category_id, name, expression, output_unit, formula_type, version)
    VALUES (${category_id}, ${dto.name}, ${dto.expression}, ${dto.output_unit_id}, 'NON_MATERIAL', 1)
    RETURNING formula_id, name, expression, formula_type, version,
              output_unit AS output_unit_id
  `;
  const [unit] = await sql`SELECT symbol FROM units WHERE unit_id = ${dto.output_unit_id}`;
  return { ...row, output_unit_symbol: unit?.symbol ?? '', fields: [], outputs: [] };
}

export async function updateFormula(formula_id, dto) {
  const bumpVersion = 'expression' in dto;
  const [row] = await sql`
    UPDATE formulas
    SET
      name        = COALESCE(${dto.name           ?? null}, name),
      expression  = COALESCE(${dto.expression     ?? null}, expression),
      output_unit = COALESCE(${dto.output_unit_id ?? null}::uuid, output_unit),
      version     = version + ${bumpVersion ? 1 : 0}
    WHERE formula_id = ${formula_id}
    RETURNING formula_id, name, expression, formula_type, version,
              output_unit AS output_unit_id
  `;
  return row;
}

export async function deleteFormula(formula_id) {
  await sql`UPDATE field_definitions SET source_formula_id = NULL WHERE source_formula_id = ${formula_id}`;
  await sql`DELETE FROM field_definitions WHERE formula_id = ${formula_id}`;
  await sql`DELETE FROM formula_output    WHERE formula_id = ${formula_id}`;
  await sql`DELETE FROM formulas          WHERE formula_id = ${formula_id}`;
}

// ── Formula Output CRUD ───────────────────────────────────────────────────────
// formula_output rows define the named keys the engine registers in the
// variable context after evaluating this formula.  e.g. output_key = "volume_beton"
// is what MATERIAL formula expressions then reference.

export async function createFormulaOutput(formula_id, dto) {
  const [row] = await sql`
    INSERT INTO formula_output (formula_id, output_key, output_label, output_unit_id)
    VALUES (${formula_id}, ${dto.output_key}, ${dto.output_label}, ${dto.output_unit_id ?? null})
    RETURNING output_id, formula_id, output_key, output_label, output_unit_id
  `;
  // Return with unit symbol for the UI
  const [unit] = dto.output_unit_id
    ? await sql`SELECT symbol FROM units WHERE unit_id = ${dto.output_unit_id}`
    : [null];
  return { ...row, unit_symbol: unit?.symbol ?? '' };
}

export async function updateFormulaOutput(output_id, dto) {
  const updates = {};
  if ('output_key'    in dto) updates.output_key    = dto.output_key;
  if ('output_label'  in dto) updates.output_label  = dto.output_label;
  if ('output_unit_id' in dto) updates.output_unit_id = dto.output_unit_id;
  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE formula_output SET ${sql(updates)}
    WHERE  output_id = ${output_id}
    RETURNING output_id, formula_id, output_key, output_label, output_unit_id
  `;
  return row;
}

export async function deleteFormulaOutput(output_id) {
  await sql`DELETE FROM formula_output WHERE output_id = ${output_id}`;
}

// ── Field CRUD ────────────────────────────────────────────────────────────────

export async function createField(formula_id, dto) {
  const required = dto.source_formula_id ? false : (dto.required ?? true);
  const [row] = await sql`
    INSERT INTO field_definitions
      (formula_id, label_en, label_ar, variable_name, unit_id,
       required, default_value, source_formula_id, sort_order)
    VALUES
      (${formula_id}, ${dto.label_en}, ${dto.label_ar ?? ''},
       ${dto.variable_name}, ${dto.unit_id ?? null}, ${required},
       ${dto.default_value ?? null}, ${dto.source_formula_id ?? null},
       ${dto.sort_order ?? 0})
    RETURNING *
  `;
  return row;
}

export async function updateField(field_id, dto) {
  const updates = {};
  if ('label_en'          in dto) updates.label_en          = dto.label_en;
  if ('label_ar'          in dto) updates.label_ar          = dto.label_ar;
  if ('variable_name'     in dto) updates.variable_name     = dto.variable_name;
  if ('unit_id'           in dto) updates.unit_id           = dto.unit_id;
  if ('required'          in dto) updates.required          = dto.required;
  if ('default_value'     in dto) updates.default_value     = dto.default_value;
  if ('source_formula_id' in dto) updates.source_formula_id = dto.source_formula_id;
  if ('sort_order'        in dto) updates.sort_order        = dto.sort_order;
  if (updates.source_formula_id) updates.required = false;
  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE field_definitions SET ${sql(updates)}
    WHERE  field_id = ${field_id}
    RETURNING *
  `;
  return row;
}

export async function deleteField(field_id) {
  await sql`DELETE FROM field_definitions WHERE field_id = ${field_id}`;
}

// ── Config CRUD ───────────────────────────────────────────────────────────────

export async function createConfig(category_id, dto) {
  const [row] = await sql`
    INSERT INTO material_config (category_id, name, description)
    VALUES (${category_id}, ${dto.name}, ${dto.description ?? null})
    RETURNING config_id, name, description
  `;
  return row;
}

export async function updateConfig(config_id, dto) {
  const updates = {};
  if ('name'        in dto) updates.name        = dto.name;
  if ('description' in dto) updates.description = dto.description;
  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE material_config SET ${sql(updates)}
    WHERE  config_id = ${config_id}
    RETURNING config_id, name, description
  `;
  return row;
}

export async function deleteConfig(config_id) {
  await sql`UPDATE coefficients SET config_group_id = NULL WHERE config_group_id = ${config_id}`;
  await sql`DELETE FROM material_config WHERE config_id = ${config_id}`;
}

// ── Coefficient CRUD ──────────────────────────────────────────────────────────

export async function createCoefficient(category_id, dto) {
  const [row] = await sql`
    INSERT INTO coefficients
      (category_id, name_en, name_ar, value, unit_id, config_group_id)
    VALUES
      (${category_id}, ${dto.name_en}, ${dto.name_ar ?? ''},
       ${dto.value}, ${dto.unit_id ?? null}, ${dto.config_group_id ?? null})
    RETURNING coefficient_id, name_en, name_ar, value, config_group_id
  `;
  return row;
}

export async function updateCoefficient(coefficient_id, dto) {
  const updates = {};
  if ('name_en'         in dto) updates.name_en         = dto.name_en;
  if ('name_ar'         in dto) updates.name_ar         = dto.name_ar;
  if ('value'           in dto) updates.value           = dto.value;
  if ('unit_id'         in dto) updates.unit_id         = dto.unit_id;
  if ('config_group_id' in dto) updates.config_group_id = dto.config_group_id;
  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE coefficients SET ${sql(updates)}
    WHERE  coefficient_id = ${coefficient_id}
    RETURNING coefficient_id, name_en, name_ar, value, config_group_id
  `;
  return row;
}

export async function deleteCoefficient(coefficient_id) {
  await sql`DELETE FROM coefficients WHERE coefficient_id = ${coefficient_id}`;
}

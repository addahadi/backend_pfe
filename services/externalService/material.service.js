import sql from '../../config/database.js';
import { NotFoundError, ValidationError } from '../../utils/AppError.js';

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getAllMaterials({ search = '', categoryId = '', page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) {
    const like = `%${search}%`;
    conditions.push(sql`(rc.material_name_en ILIKE ${like} OR rc.material_name_ar ILIKE ${like})`);
  }
  if (categoryId) {
    conditions.push(sql`rc.category_id = ${categoryId}::uuid`);
  }

  const where = conditions.length
    ? sql`WHERE ${conditions.reduce((a, b) => sql`${a} AND ${b}`)}`
    : sql``;

  const [rows, countResult] = await Promise.all([
    sql`
      SELECT
        rc.material_id,
        rc.material_name_en,
        rc.material_name_ar,
        rc.category_id,
        c.name_en  AS category_name,
        rc.unit_id,
        u.symbol   AS unit_symbol,
        rc.formula_id,
        f.name     AS formula_name,
        rc.material_type,
        rc.unit_price_usd,
        rc.min_price_usd,
        rc.max_price_usd,
        rc.default_waste_factor
      FROM   resource_catalog rc
      LEFT JOIN categories c ON c.category_id = rc.category_id
      LEFT JOIN units      u ON u.unit_id      = rc.unit_id
      LEFT JOIN formulas   f ON f.formula_id   = rc.formula_id
      ${where}
      ORDER BY rc.material_name_en
      LIMIT  ${limit}
      OFFSET ${offset}
    `,
    sql`SELECT COUNT(*)::int AS total FROM resource_catalog rc ${where}`,
  ]);

  return {
    data: rows,
    pagination: { total: countResult[0]?.total ?? 0, page, limit, total_pages: Math.ceil((countResult[0]?.total ?? 0) / limit) },
  };
}

// ── Create ────────────────────────────────────────────────────────────────────
// category_id is derived from the selected formula_id — admin never picks it manually.

export async function createMaterial(dto) {
  const {
    material_name_en, material_name_ar,
    formula_id, unit_id,
    material_type = 'PRIMARY',
    unit_price_usd = 0, min_price_usd = 0, max_price_usd = 0,
    default_waste_factor = 0,
  } = dto;

  console.log(dto)
  // Derive category_id from formula
  const [formulaRow] = await sql`
    SELECT formula_id, category_id FROM formulas WHERE formula_id = ${formula_id} AND formula_type = 'MATERIAL'
  `;
  if (!formulaRow) throw new ValidationError('Formula not found or is not a MATERIAL formula');

  const category_id = formulaRow.category_id;
  console.log(category_id)

  const [row] = await sql`
    INSERT INTO resource_catalog
      (material_name_en, material_name_ar, category_id, formula_id,
       unit_id, material_type, unit_price_usd, min_price_usd, max_price_usd, default_waste_factor)
    VALUES
      (${material_name_en}, ${material_name_ar ?? ''},
       ${category_id}, ${formula_id},
       ${unit_id ?? null}, ${material_type},
       ${unit_price_usd}, ${min_price_usd}, ${max_price_usd}, ${default_waste_factor})
    RETURNING *
  `;

  // Return with joins
  const [joined] = await sql`
    SELECT rc.*, c.name_en AS category_name, u.symbol AS unit_symbol, f.name AS formula_name
    FROM   resource_catalog rc
    LEFT JOIN categories c ON c.category_id = rc.category_id
    LEFT JOIN units      u ON u.unit_id      = rc.unit_id
    LEFT JOIN formulas   f ON f.formula_id   = rc.formula_id
    WHERE  rc.material_id = ${row.material_id}
  `;
  return joined;
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateMaterial(material_id, dto) {
  const updates = {};
  if ('material_name_en'    in dto) updates.material_name_en    = dto.material_name_en;
  if ('material_name_ar'    in dto) updates.material_name_ar    = dto.material_name_ar;
  if ('unit_id'             in dto) updates.unit_id             = dto.unit_id;
  if ('material_type'       in dto) updates.material_type       = dto.material_type;
  if ('unit_price_usd'      in dto) updates.unit_price_usd      = dto.unit_price_usd;
  if ('min_price_usd'       in dto) updates.min_price_usd       = dto.min_price_usd;
  if ('max_price_usd'       in dto) updates.max_price_usd       = dto.max_price_usd;
  if ('default_waste_factor' in dto) updates.default_waste_factor = dto.default_waste_factor;

  // If formula_id changes, re-derive category_id
  if ('formula_id' in dto) {
    const [formulaRow] = await sql`
      SELECT category_id FROM formulas WHERE formula_id = ${dto.formula_id} AND formula_type = 'MATERIAL'
    `;
    if (!formulaRow) throw new ValidationError('Formula not found or is not a MATERIAL formula');
    updates.formula_id   = dto.formula_id;
    updates.category_id  = formulaRow.category_id;
  }

  if (!Object.keys(updates).length) return null;
  updates.updated_at = new Date();

  const [row] = await sql`
    UPDATE resource_catalog SET ${sql(updates)}
    WHERE  material_id = ${material_id}
    RETURNING material_id
  `;
  if (!row) throw new NotFoundError(`Material ${material_id} not found`);

  const [joined] = await sql`
    SELECT rc.*, c.name_en AS category_name, u.symbol AS unit_symbol, f.name AS formula_name
    FROM   resource_catalog rc
    LEFT JOIN categories c ON c.category_id = rc.category_id
    LEFT JOIN units      u ON u.unit_id      = rc.unit_id
    LEFT JOIN formulas   f ON f.formula_id   = rc.formula_id
    WHERE  rc.material_id = ${material_id}
  `;
  return joined;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteMaterial(material_id) {
  await sql`DELETE FROM resource_catalog WHERE material_id = ${material_id}`;
}

// ── MATERIAL formulas lookup (for the admin form dropdown) ────────────────────
// Returns all MATERIAL formulas grouped with their category name so the admin
// can pick a formula and the category is shown next to it.

export async function getMaterialFormulas() {
  return sql`
    SELECT f.formula_id, f.name, f.category_id, c.name_en AS category_name
    FROM   formulas f
    JOIN   categories c ON c.category_id = f.category_id
    WHERE  f.formula_type = 'MATERIAL'
    ORDER  BY c.name_en, f.name
  `;
}

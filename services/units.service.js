import sql from '../config/database.js';
import { NotFoundError } from '../utils/AppError.js';

export async function getUnits() {
  return sql`SELECT unit_id, name_en, name_ar, symbol FROM units ORDER BY symbol`;
}

export async function createUnit({ name_en, name_ar, symbol }) {
  const [row] = await sql`
    INSERT INTO units (name_en, name_ar, symbol)
    VALUES (${name_en}, ${name_ar ?? ''}, ${symbol})
    RETURNING unit_id, name_en, name_ar, symbol
  `;
  return row;
}

export async function updateUnit(unit_id, dto) {
  const updates = {};
  if ('name_en' in dto) updates.name_en = dto.name_en;
  if ('name_ar' in dto) updates.name_ar = dto.name_ar;
  if ('symbol'  in dto) updates.symbol  = dto.symbol;
  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE units SET ${sql(updates)}
    WHERE  unit_id = ${unit_id}
    RETURNING unit_id, name_en, name_ar, symbol
  `;
  if (!row) throw new NotFoundError(`Unit ${unit_id} not found`);
  return row;
}

export async function deleteUnit(unit_id) {
  // Soft-check: if referenced, this will throw a FK violation which bubbles as a 500
  await sql`DELETE FROM units WHERE unit_id = ${unit_id}`;
}

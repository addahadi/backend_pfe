import sql from '../../config/database.js';
import { NotFoundError } from '../../utils/AppError.js';

// ── Plan Types ────────────────────────────────────────────────────────────────

export async function getPlanTypes() {
  return sql`SELECT plan_type_id, name_en, name_ar, created_at FROM plan_types ORDER BY name_en`;
}

export async function createPlanType({ name_en, name_ar }) {
  const [row] = await sql`
    INSERT INTO plan_types (name_en, name_ar)
    VALUES (${name_en}, ${name_ar ?? ''})
    RETURNING plan_type_id, name_en, name_ar
  `;
  return row;
}

export async function updatePlanType(plan_type_id, { name_en, name_ar }) {
  const updates = {};
  if (name_en !== undefined) updates.name_en = name_en;
  if (name_ar !== undefined) updates.name_ar = name_ar;
  if (!Object.keys(updates).length) return null;

  const [row] = await sql`
    UPDATE plan_types SET ${sql(updates)}
    WHERE  plan_type_id = ${plan_type_id}
    RETURNING plan_type_id, name_en, name_ar
  `;
  if (!row) throw new NotFoundError(`PlanType ${plan_type_id} not found`);
  return row;
}

export async function deletePlanType(plan_type_id) {
  // Nullify references so plans don't orphan
  await sql`UPDATE plans SET plan_type_id = NULL WHERE plan_type_id = ${plan_type_id}`;
  await sql`DELETE FROM plan_types WHERE plan_type_id = ${plan_type_id}`;
}

// ── Plans ─────────────────────────────────────────────────────────────────────
// Full plan list with features as a nested array
export async function getPlansWithFeatures() {
  const rows = await sql`
    SELECT
      p.plan_id,
      p.name_en,
      p.name_ar,
      p.price,
      p.duration,
      p.plan_type_id,
      pt.name_en AS plan_type_name,
      f.feature_key,
      f.feature_value_en
    FROM plans p
    LEFT JOIN plan_types pt ON pt.plan_type_id = p.plan_type_id
    LEFT JOIN features   f  ON f.plan_id       = p.plan_id
    ORDER BY p.price
  `;

  const map = {};
  for (const r of rows) {
    if (!map[r.plan_id]) {
      map[r.plan_id] = {
        plan_id:       r.plan_id,
        name_en:       r.name_en,
        name_ar:       r.name_ar,
        price:         r.price,
        duration:      r.duration,
        plan_type_id:  r.plan_type_id,
        plan_type_name: r.plan_type_name,
        features:      [],
      };
    }
    if (r.feature_key) {
      map[r.plan_id].features.push({ key: r.feature_key, value: r.feature_value_en });
    }
  }
  return Object.values(map);
}

export async function deletePlan(plan_id) {
  // Deactivate subscriptions referencing this plan first
  await sql`UPDATE subscriptions SET status = 'INACTIVE' WHERE plan_id = ${plan_id}`;
  await sql`DELETE FROM features WHERE plan_id = ${plan_id}`;
  await sql`DELETE FROM plans    WHERE plan_id = ${plan_id}`;
}

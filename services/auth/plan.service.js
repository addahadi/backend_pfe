import sql from '../config/database.js';
import { NotFoundError } from '../utils/AppError.js';

// إنشاء Plan

export const createPlan = async ({ name_en, name_ar, price, duration, plan_type_id }) => {
  const result = await sql`
    INSERT INTO plans (name_en, name_ar, price, duration, plan_type_id)
    VALUES (${name_en}, ${name_ar}, ${price}, ${duration}, ${plan_type_id || null})
    RETURNING plan_id, name_en, name_ar, price, duration, plan_type_id
  `;

  return result[0];
};

//2. Get Plans with Features (🔥🔥 IMPORTANT FOR UI)
export const getPlans = async () => {
  const rows = await sql`
    SELECT 
      p.plan_id,
      p.name_en,
      p.name_ar,
      p.price,
      p.duration,
      f.feature_key,
      f.feature_value_en
    FROM plans p
    LEFT JOIN features f ON p.plan_id = f.plan_id
  `;

  const plans = {};

  rows.forEach((row) => {
    if (!plans[row.plan_id]) {
      plans[row.plan_id] = {
        id: row.plan_id,
        name_en: row.name_en,
        name_ar: row.name_ar,
        price: row.price,
        duration: row.duration,
        features: {},
      };
    }

    if (row.feature_key) {
      plans[row.plan_id].features[row.feature_key] = row.feature_value_en;
    }
  });

  return Object.values(plans);
};
export const updatePlan = async (planId, data) => {
  const { name_en, name_ar, plan_type_id, price, duration, features } = data;

  return await sql.begin(async (tx) => {
    // 1️⃣ check plan
    const plan = await tx`
      SELECT plan_id FROM plans WHERE plan_id = ${planId}
    `;

    if (!plan.length) {
      throw new NotFoundError('Plan not found');
    }

    // 2️⃣ update plan
    await tx`
      UPDATE plans
      SET 
        name_en = COALESCE(${name_en ?? null}, name_en),
        name_ar = COALESCE(${name_ar ?? null}, name_ar),
        plan_type_id = COALESCE(${plan_type_id ?? null}, plan_type_id),
        price = COALESCE(${price ?? null}, price),
        duration = COALESCE(${duration ?? null}, duration)
      WHERE plan_id = ${planId}
    `;

    // 3️⃣ UPSERT features (🔥 هنا السر)
    if (Array.isArray(features)) {
      for (const feature of features) {
        await tx`
          INSERT INTO features (
            feature_id,
            plan_id,
            feature_key,
            feature_value_en,
            feature_value_ar
          )
          VALUES (
            gen_random_uuid(),
            ${planId},
            ${feature.key},
            ${feature.value},
            ${feature.value}
          )
          ON CONFLICT (plan_id, feature_key)
          DO UPDATE SET 
            feature_value_en = EXCLUDED.feature_value_en,
            feature_value_ar = EXCLUDED.feature_value_ar
        `;
      }
    }

    return {
      message: 'Plan updated successfully (UPSERT)',
    };
  });
};
// get features

export const getPlanFeatures = async (planId) => {
  // 1️⃣ جلب features فقط
  const features = await sql`
    SELECT feature_key, feature_value_en
    FROM features
    WHERE plan_id = ${planId}
  `;

  // 2️⃣ إذا ماكان حتى feature
  if (features.length === 0) {
    throw new NotFoundError('No features found for this plan');
  }

  // 3️⃣ تحويلها إلى object
  const formattedFeatures = {};

  for (const f of features) {
    formattedFeatures[f.feature_key] = f.feature_value_en;
  }

  // 4️⃣ إرجاع فقط features
  return formattedFeatures;
};

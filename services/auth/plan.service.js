import sql from '../../config/database.js';
import { NotFoundError } from '../../utils/AppError.js';

// إنشاء Plan

export const createPlan = async ({ name_en, name_ar, price, duration, plan_type_id, features }) => {
  return await sql.begin(async (tx) => {
    const [plan] = await tx`
      INSERT INTO plans (name_en, name_ar, price, duration, plan_type_id)
      VALUES (${name_en}, ${name_ar}, ${price}, ${duration}, ${plan_type_id || null})
      RETURNING plan_id, name_en, name_ar, price, duration, plan_type_id
    `;

    if (Array.isArray(features) && features.length > 0) {
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
            ${plan.plan_id},
            ${feature.key},
            ${feature.value},
            ${feature.value}
          )
        `;
      }
    }

    return plan;
  });
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
      p.plan_type_id,
      pt.name_en as plan_type_name_en,
      f.feature_key,
      f.feature_value_en
    FROM plans p
    LEFT JOIN plan_types pt ON p.plan_type_id = pt.plan_type_id
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
        plan_type_id: row.plan_type_id,
        plan_type_name: row.plan_type_name_en,
        plan_type_name: row.plan_type_name_en,
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
      throw new NotFoundError('Plan not found', 'الخطة غير موجودة');
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

    // 3️⃣ Refined feature update: delete existing and re-insert
    if (Array.isArray(features)) {
      await tx`DELETE FROM features WHERE plan_id = ${planId}`;
      
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
    throw new NotFoundError('No features found for this plan', 'لا توجد ميزات لهذه الخطة');
  }

  // 3️⃣ تحويلها إلى object
  const formattedFeatures = {};

  for (const f of features) {
    formattedFeatures[f.feature_key] = f.feature_value_en;
  }

  // 4️⃣ إرجاع فقط features
  return formattedFeatures;
};
// delete plan
export const deletePlan = async (planId) => {
  return await sql.begin(async (tx) => {
    await tx`DELETE FROM features WHERE plan_id = ${planId}`;
    const result = await tx`DELETE FROM plans WHERE plan_id = ${planId} RETURNING plan_id`;
    if (!result.length) throw new NotFoundError('Plan not found', 'الخطة غير موجودة');
    return { message_en: 'Plan deleted successfully', message_ar: 'تم حذف الخطة بنجاح' };
  });
};

// --- Plan Types ---

export const getPlanTypes = async () => {
  return await sql`SELECT plan_type_id as id, name_en, name_ar FROM plan_types ORDER BY created_at DESC`;
};

export const createPlanType = async ({ name_en, name_ar }) => {
  const result = await sql`
    INSERT INTO plan_types (name_en, name_ar)
    VALUES (${name_en}, ${name_ar})
    RETURNING plan_type_id as id, name_en, name_ar
  `;
  return result[0];
};

export const updatePlanType = async (id, { name_en, name_ar }) => {
  const result = await sql`
    UPDATE plan_types
    SET 
      name_en = COALESCE(${name_en ?? null}, name_en),
      name_ar = COALESCE(${name_ar ?? null}, name_ar)
    WHERE plan_type_id = ${id}
    RETURNING plan_type_id as id, name_en, name_ar
  `;
  if (!result.length) throw new NotFoundError('Plan type not found', 'نوع الخطة غير موجود');
  return result[0];
};

export const deletePlanType = async (id) => {
  const result = await sql`DELETE FROM plan_types WHERE plan_type_id = ${id} RETURNING plan_type_id`;
  if (!result.length) throw new NotFoundError('Plan type not found', 'نوع الخطة غير موجود');
  return { message_en: 'Plan type deleted successfully', message_ar: 'تم حذف نوع الخطة بنجاح' };
};

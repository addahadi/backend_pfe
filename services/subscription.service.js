// استيراد الاتصال بقاعدة البيانات
import sql from '../config/database.js';
/*
Create Subscription Service

هذه الدالة مسؤولة عن:
1. التحقق من وجود plan
2. إلغاء الاشتراك القديم (إذا موجود)
3. حساب start_date و end_date
4. إنشاء اشتراك جديد
*/
export const createSubscription = async ({ userId, planId }) => {
  return await sql.begin(async (tx) => {
    // 1️⃣ check plan
    const plan = await tx`
      SELECT * FROM plans WHERE plan_id = ${planId}
    `;

    if (!plan.length) {
      throw new Error('Plan not found');
    }

    const selectedPlan = plan[0];

    // 2️⃣ check if already subscribed to same plan
    const existing = await tx`
      SELECT * FROM subscriptions
      WHERE user_id = ${userId}
      AND plan_id = ${planId}
      AND status = 'ACTIVE'
    `;

    if (existing.length) {
      throw new Error('You already have this plan');
    }

    // 3️⃣ deactivate old subscriptions
    await tx`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE user_id = ${userId} AND status = 'ACTIVE'
    `;

    // 4️⃣ get features snapshot
    const features = await tx`
      SELECT feature_key, feature_value_en
      FROM features
      WHERE plan_id = ${planId}
    `;

    const featuresSnapshot = {};

    for (const f of features) {
      featuresSnapshot[f.feature_key] = f.feature_value_en;
    }

    // 5️⃣ dates
    const start_date = new Date();
    const end_date = new Date();
    end_date.setDate(start_date.getDate() + selectedPlan.duration);

    // 6️⃣ create subscription
    const result = await tx`
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        start_date,
        end_date,
        status
      )
      VALUES (
        ${userId},
        ${planId},
        ${start_date},
        ${end_date},
        'ACTIVE'
      )
      RETURNING *
    `;

    // 7️⃣ (اختياري قوي 🔥) حفظ snapshot في JSON
    // لازم تضيف column في DB:
    // ALTER TABLE subscriptions ADD COLUMN features_snapshot jsonb;

    await tx`
      UPDATE subscriptions
      SET features_snapshot = ${JSON.stringify(featuresSnapshot)}
      WHERE subscription_id = ${result[0].subscription_id}
    `;

    return result[0];
  });
};
/*
Get My Subscription Service

هذه الدالة:
- تجيب الاشتراك الحالي (ACTIVE) للمستخدم
- تتحقق إذا الاشتراك مازال صالح (end_date)
*/
export const getMySubscription = async (userId) => {
  // -----------------------------
  // 1️⃣ جلب الاشتراك ACTIVE
  // -----------------------------
  const result = await sql`
    SELECT * FROM subscriptions
    WHERE user_id = ${userId}
      AND status = 'ACTIVE'
    LIMIT 1
  `;
  // إذا ما عندوش subscription
  if (result.length === 0) {
    return null;
  }
  const subscription = result[0];
  // -----------------------------
  // 2️⃣ التحقق من انتهاء الاشتراك
  // -----------------------------
  /*
  إذا end_date فات
  → الاشتراك لم يعد صالح
  */
  const now = new Date();

  if (new Date(subscription.end_date) < now) {
    // نحدث الحالة إلى INACTIVE
    await sql`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE id = ${subscription.id}
    `;

    return null;
  }

  // -----------------------------
  // 3️⃣ إرجاع الاشتراك
  // -----------------------------
  return subscription;
};

/*
Get Features By Plan

هذه الدالة:
- تجيب features الخاصة بالـ plan
*/
export const getPlanFeatures = async (planId) => {
  const features = await sql`
    SELECT feature_key, feature_value
    FROM features
    WHERE plan_id = ${planId}
  `;

  return features;
};

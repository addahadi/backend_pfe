// استيراد الاتصال بقاعدة البيانات
import sql from '../config/database.js';
import { NotFoundError, ConflictError } from '../../utils/AppError.js';

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
      throw new NotFoundError('Plan not found');
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
      throw new ConflictError('You already have this plan');
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
  // 1️⃣ جلب subscription
  // -----------------------------
  const result = await sql`
    SELECT * FROM subscriptions
    WHERE user_id = ${userId}
      AND status = 'ACTIVE'
    LIMIT 1
  `;

  if (!result.length) {
    return null;
  }

  const subscription = result[0];

  // -----------------------------
  // 2️⃣ جلب plan
  // -----------------------------
  const plans = await sql`
    SELECT name_en, price, duration
    FROM plans
    WHERE plan_id = ${subscription.plan_id}
  `;

  const plan = plans[0];

  // -----------------------------
  // 3️⃣ format (فقط current plan)
  // -----------------------------
  return {
    status: subscription.status,

    plan: {
      name: plan.name_en,
      price: plan.price,
      duration: plan.duration,
    },

    billingCycle: plan.duration >= 365 ? 'Annual' : 'Monthly',

    period: {
      start: subscription.start_date,
      end: subscription.end_date,
    },
  };
};

/*
Get Features By Plan

هذه الدالة:
- تجيب features الخاصة بالـ plan
*/

/*
export const getPlanFeatures = async (planId) => {
  const features = await sql`
    SELECT feature_key, feature_value
    FROM features
    WHERE plan_id = ${planId}
  `;

  return features;
};
*/
//get all etAllSubscriptions 
export const getAllSubscriptions = async () => {
  // -----------------------------
  // 1️⃣ جلب كل الاشتراكات مع ربط المستخدم و الـ plan
  // -----------------------------
  const rows = await sql`
    SELECT 
      s.subscription_id,      -- معرف الاشتراك
      s.status,               -- حالة الاشتراك (ACTIVE / INACTIVE)
      s.start_date,           -- تاريخ البداية
      s.end_date,             -- تاريخ النهاية

      u.id as user_id,        -- معرف المستخدم
      u.email,                -- ايميل المستخدم
      u.name,                 -- اسم المستخدم

      p.plan_id,              -- معرف الخطة
      p.name_en,              -- اسم الخطة
      p.price                 -- سعر الخطة

    FROM subscriptions s

    -- ربط الاشتراك مع المستخدم
    JOIN users u ON s.user_id = u.id

    -- ربط الاشتراك مع الخطة
    JOIN plans p ON s.plan_id = p.plan_id
  `;

  // -----------------------------
  // 2️⃣ تحويل البيانات إلى شكل مرتب (object)
  // -----------------------------
  return rows.map((r) => ({
    id: r.subscription_id,    // id الاشتراك
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,

 //comment just for push
    // بيانات المستخدم
    user: {
      id: r.user_id,
      name: r.name,
      email: r.email,
    },

    // بيانات الخطة
    plan: {
      id: r.plan_id,
      name: r.name_en,
      price: r.price,
    },
  }));
};
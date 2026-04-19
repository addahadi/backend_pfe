// استيراد الاتصال بقاعدة البيانات
import sql from '../config/database.js';
import jwt from 'jsonwebtoken';
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

// ──────────────────────────────────────────────────────────────
// Get Active Subscription with Plan Details
// ──────────────────────────────────────────────────────────────
export const getActiveSubscription = async (userId) => {
  const result = await sql`
    SELECT 
      s.*,
      p.plan_id,
      p.name_en,
      p.name_ar,
      p.price,
      p.duration
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.plan_id
    WHERE s.user_id = ${userId}
      AND s.status = 'ACTIVE'
    LIMIT 1
  `;

  if (!result.length) {
    throw new Error('No active subscription found');
  }

  return {
    subscription_id: result[0].subscription_id,
    plan_id: result[0].plan_id,
    plans: {
      name_en: result[0].name_en,
      name_ar: result[0].name_ar,
      price: result[0].price,
    },
    start_date: result[0].start_date,
    end_date: result[0].end_date,
  };
};

// ──────────────────────────────────────────────────────────────
// Get Plan with Features
// ──────────────────────────────────────────────────────────────
export const getPlanWithFeatures = async (planId) => {
  const plan = await sql`
    SELECT * FROM plans
    WHERE plan_id = ${planId}
  `;

  if (!plan.length) {
    throw new Error('Plan not found');
  }

  const features = await sql`
    SELECT feature_key, feature_value_en
    FROM features
    WHERE plan_id = ${planId}
  `;

  const featuresSnapshot = {};
  for (const f of features) {
    featuresSnapshot[f.feature_key] = f.feature_value_en;
  }

  return {
    plan_id: plan[0].plan_id,
    name_en: plan[0].name_en,
    name_ar: plan[0].name_ar,
    price: plan[0].price,
    duration: plan[0].duration,
    plan_types: plan[0].plan_type_id,
    features: featuresSnapshot,
  };
};

// ──────────────────────────────────────────────────────────────
// Compare Two Plans
// ──────────────────────────────────────────────────────────────
export const isSamePlan = (planId1, planId2) => {
  return planId1 === planId2;
};

// ──────────────────────────────────────────────────────────────
// Generate Switch Token (JWT - 15 minutes expiry)
// ──────────────────────────────────────────────────────────────
export const generateSwitchToken = (userId, subscriptionId, newPlanId) => {
  const payload = {
    userId,
    subscriptionId,
    newPlanId,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '15m',
  });
};

// ──────────────────────────────────────────────────────────────
// Validate Switch Token
// ──────────────────────────────────────────────────────────────
export const validateSwitchToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return {
      userId: decoded.userId,
      subscriptionId: decoded.subscriptionId,
      newPlanId: decoded.newPlanId,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('رمز التأكيد منتهي الصلاحية');
    }
    throw new Error('رمز التأكيد غير صالح');
  }
};

// ──────────────────────────────────────────────────────────────
// Execute Plan Switch Transaction
// ──────────────────────────────────────────────────────────────
export const executePlanSwitch = async (userId, subscriptionId, newPlan) => {
  return await sql.begin(async (tx) => {
    // 1️⃣ حذف سجل الاستخدام للاشتراك القديم
    await tx`
      DELETE FROM ai_usage_history
      WHERE subscription_id = ${subscriptionId}
    `;

    // 2️⃣ نهاية الاشتراك القديم
    await tx`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE subscription_id = ${subscriptionId}
        AND user_id = ${userId}
    `;

    // 3️⃣ حساب تاريخ النهاية
    const start_date = new Date();
    const end_date = new Date();
    end_date.setDate(start_date.getDate() + newPlan.duration);

    // 4️⃣ إنشاء الاشتراك الجديد
    const result = await tx`
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        start_date,
        end_date,
        status,
        features_snapshot
      )
      VALUES (
        ${userId},
        ${newPlan.plan_id},
        ${start_date},
        ${end_date},
        'ACTIVE',
        ${JSON.stringify(newPlan.features)}
      )
      RETURNING *
    `;

    // 5️⃣ إنشاء سجل استخدام جديد من الصفر
    await tx`
      INSERT INTO ai_usage_history (
        subscription_id,
        usage_limit,
        usage_count,
        reset_at
      )
      VALUES (
        ${result[0].subscription_id},
        0,
        0,
        ${start_date}
      )
    `;

    return result[0];
  });
};

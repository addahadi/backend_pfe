// استيراد الاتصال بقاعدة البيانات
import sql from '../../config/database.js';
import jwt from 'jsonwebtoken';
import { NotFoundError, ConflictError } from '../../utils/AppError.js';

/*
========================
CREATE SUBSCRIPTION (canonical — NotFoundError / ConflictError, single INSERT)
========================
*/
export const createSubscription = async ({ userId, planId }) => {
  return await sql.begin(async (tx) => {
    const plan = await tx`
      SELECT * FROM plans WHERE plan_id = ${planId}
    `;

    if (!plan.length) {
      throw new NotFoundError('Plan not found');
    }

    const selectedPlan = plan[0];

    const existing = await tx`
      SELECT subscription_id FROM subscriptions
      WHERE user_id = ${userId}
        AND plan_id  = ${planId}
        AND status   = 'ACTIVE'
    `;

    if (existing.length) {
      throw new ConflictError('You already have an active subscription to this plan');
    }

    await tx`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE user_id = ${userId} AND status = 'ACTIVE'
    `;

    const features = await tx`
      SELECT feature_key, feature_value_en
      FROM features
      WHERE plan_id = ${planId}
    `;

    const featuresSnapshot = {};
    for (const f of features) {
      featuresSnapshot[f.feature_key] = f.feature_value_en;
    }

    const start_date = new Date();
    const end_date = new Date();
    end_date.setDate(start_date.getDate() + selectedPlan.duration);

    const result = await tx`
      INSERT INTO subscriptions (
        user_id,
        plan_id,
        start_date,
        end_date,
        status,
        features_snapshot
      ) VALUES (
        ${userId},
        ${planId},
        ${start_date},
        ${end_date},
        'ACTIVE',
        ${featuresSnapshot}
      )
      RETURNING *
    `;

    return result[0];
  });
};

/*
========================
CREATE SUBSCRIPTION (legacy — two-step INSERT + UPDATE snapshot)
Preserved from former services/subscription.service.js root file.
========================
*/
export const createSubscriptionLegacy = async ({ userId, planId }) => {
  return await sql.begin(async (tx) => {
    const plan = await tx`
      SELECT * FROM plans WHERE plan_id = ${planId}
    `;

    if (!plan.length) {
      throw new Error('Plan not found');
    }

    const selectedPlan = plan[0];

    const existing = await tx`
      SELECT * FROM subscriptions
      WHERE user_id = ${userId}
      AND plan_id = ${planId}
      AND status = 'ACTIVE'
    `;

    if (existing.length) {
      throw new Error('You already have this plan');
    }

    await tx`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE user_id = ${userId} AND status = 'ACTIVE'
    `;

    const features = await tx`
      SELECT feature_key, feature_value_en
      FROM features
      WHERE plan_id = ${planId}
    `;

    const featuresSnapshot = {};

    for (const f of features) {
      featuresSnapshot[f.feature_key] = f.feature_value_en;
    }

    const start_date = new Date();
    const end_date = new Date();
    end_date.setDate(start_date.getDate() + selectedPlan.duration);

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

    await tx`
      UPDATE subscriptions
      SET features_snapshot = ${featuresSnapshot}
      WHERE subscription_id = ${result[0].subscription_id}
    `;

    return result[0];
  });
};

/*
========================
GET MY SUBSCRIPTION (raw row)
========================
*/
export const getMySubscription = async (userId) => {
  const result = await sql`
    SELECT *
    FROM subscriptions
    WHERE user_id = ${userId}
      AND status  = 'ACTIVE'
    LIMIT 1
  `;

  return result[0] ?? null;
};

/*
========================
GET MY SUBSCRIPTION (legacy — expiry invalidation)
Preserved from former root subscription.service.js; UPDATE uses subscription_id.
========================
*/
export const getMySubscriptionLegacy = async (userId) => {
  const result = await sql`
    SELECT * FROM subscriptions
    WHERE user_id = ${userId}
      AND status = 'ACTIVE'
    LIMIT 1
  `;

  if (result.length === 0) {
    return null;
  }

  const subscription = result[0];

  const now = new Date();

  if (new Date(subscription.end_date) < now) {
    await sql`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE subscription_id = ${subscription.subscription_id}
    `;

    return null;
  }

  return subscription;
};

/*
========================
GET MY SUBSCRIPTION (formatted for client)
========================
*/
export const getMySubscriptionForClient = async (userId) => {
  const result = await sql`
    SELECT
      s.subscription_id,
      s.status,
      s.start_date,
      s.end_date,
      s.features_snapshot,
      p.name_en  AS plan_name,
      p.price,
      p.duration
    FROM subscriptions s
    JOIN plans p ON p.plan_id = s.plan_id
    WHERE s.user_id = ${userId}
      AND s.status  = 'ACTIVE'
    LIMIT 1
  `;

  if (!result.length) return null;

  const row = result[0];

  return {
    subscription_id: row.subscription_id,
    status: row.status,
    features_snapshot: row.features_snapshot,
    plan: {
      name: row.plan_name,
      price: row.price,
      duration: row.duration,
    },
    billingCycle: row.duration >= 365 ? 'Annual' : 'Monthly',
    period: {
      start: row.start_date,
      end: row.end_date,
    },
  };
};

/*
========================
GET MY USAGE WITH LIMITS
========================
*/
export const getMyUsageWithLimits = async (userId) => {
  const subResult = await sql`
    SELECT subscription_id, end_date, features_snapshot
    FROM subscriptions
    WHERE user_id = ${userId}
      AND status  = 'ACTIVE'
    LIMIT 1
  `;

  if (!subResult.length) return null;

  const sub = subResult[0];
  const subId = sub.subscription_id;
  const features = sub.features_snapshot ?? {};

  const [projectsResult, aiResult, estimationResult] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM projects        WHERE user_id = ${userId} AND subscription_id = ${subId}`,
    sql`SELECT COUNT(*) AS count FROM ai_usage_history WHERE user_id = ${userId} AND subscription_id = ${subId}`,
    sql`SELECT COUNT(*) AS count FROM estimation       WHERE subscription_id = ${subId}`,
  ]);

  const entry = (featureKey, rawCount) => {
    const limitRaw = features[featureKey];
    const unlimited = limitRaw === 'unlimited';
    const limit = unlimited ? null : limitRaw ? parseInt(limitRaw) : null;
    const used = parseInt(rawCount);

    return {
      used,
      limit,
      unlimited,
      percentage: !unlimited && limit ? Math.min(100, Math.round((used / limit) * 100)) : null,
    };
  };

  return {
    subscription_id: subId,
    plan_ends_at: sub.end_date,
    usage: {
      projects: entry('projects_limit', projectsResult[0].count),
      ai: entry('ai_usage_limit', aiResult[0].count),
      estimations: entry('estimation_limit', estimationResult[0].count),
    },
  };
};

/*
========================
GET ALL SUBSCRIPTIONS (admin)
========================
*/
export const getAllSubscriptions = async () => {
  const rows = await sql`
    SELECT
      s.subscription_id,
      s.status,
      s.start_date,
      s.end_date,
      u.id    AS user_id,
      u.email,
      u.name,
      p.plan_id,
      p.name_en,
      p.price
    FROM subscriptions s
    JOIN users u ON s.user_id  = u.id
    JOIN plans p ON s.plan_id  = p.plan_id
    ORDER BY s.created_at DESC
  `;

  return rows.map((r) => ({
    id: r.subscription_id,
    status: r.status,
    start_date: r.start_date,
    end_date: r.end_date,
    user: {
      id: r.user_id,
      name: r.name,
      email: r.email,
    },
    plan: {
      id: r.plan_id,
      name: r.name_en,
      price: r.price,
    },
  }));
};

/*
Get Features By Plan
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
// Only embeds userId + newPlanId — subscriptionId no longer needed
// because confirmSwitchPlan delegates to createSubscription.
// ──────────────────────────────────────────────────────────────
export const generateSwitchToken = (userId, newPlanId) => {
  return jwt.sign(
    { userId, newPlanId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '15m' },
  );
};

// ──────────────────────────────────────────────────────────────
// Validate Switch Token
// ──────────────────────────────────────────────────────────────
export const validateSwitchToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return {
      userId: decoded.userId,
      newPlanId: decoded.newPlanId,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Confirmation token has expired');
    }
    throw new Error('Invalid confirmation token');
  }
};

// executePlanSwitch removed — confirmSwitchPlan now delegates to createSubscription directly.

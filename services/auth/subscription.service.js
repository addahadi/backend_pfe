import sql from '../../config/database.js';
import { NotFoundError, ConflictError } from '../../utils/AppError.js';

/*
========================
CREATE SUBSCRIPTION
========================
*/
export const createSubscription = async ({ userId, planId }) => {
  return await sql.begin(async (tx) => {
    // 1. Check plan exists
    const plan = await tx`
      SELECT * FROM plans WHERE plan_id = ${planId}
    `;

    if (!plan.length) {
      throw new NotFoundError('Plan not found');
    }

    const selectedPlan = plan[0];

    // 2. Check not already on same plan
    const existing = await tx`
      SELECT subscription_id FROM subscriptions
      WHERE user_id = ${userId}
        AND plan_id  = ${planId}
        AND status   = 'ACTIVE'
    `;

    if (existing.length) {
      throw new ConflictError('You already have an active subscription to this plan');
    }

    // 3. Deactivate any current active subscription
    await tx`
      UPDATE subscriptions
      SET status = 'INACTIVE'
      WHERE user_id = ${userId} AND status = 'ACTIVE'
    `;

    // 4. Build features snapshot from features table
    const features = await tx`
      SELECT feature_key, feature_value_en
      FROM features
      WHERE plan_id = ${planId}
    `;

    const featuresSnapshot = {};
    for (const f of features) {
      featuresSnapshot[f.feature_key] = f.feature_value_en;
    }

    // 5. Dates
    const start_date = new Date();
    const end_date   = new Date();
    end_date.setDate(start_date.getDate() + selectedPlan.duration);

    // 6. Insert new subscription with snapshot in one query
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
        ${planId},
        ${start_date},
        ${end_date},
        'ACTIVE',
        ${JSON.stringify(featuresSnapshot)}
      )
      RETURNING *
    `;

    return result[0];
  });
};

/*
========================
GET MY SUBSCRIPTION (raw row)
========================

Returns the raw DB row so middlewares (checkSubscription, checkUsage)
can access subscription_id and features_snapshot directly.

For the API response to the client use getMySubscriptionForClient().
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
GET MY SUBSCRIPTION (formatted for client)
========================

Returns a clean object for the GET /subscriptions/me endpoint.
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
    subscription_id:  row.subscription_id,
    status:           row.status,
    features_snapshot: row.features_snapshot,
    plan: {
      name:     row.plan_name,
      price:    row.price,
      duration: row.duration,
    },
    billingCycle: row.duration >= 365 ? 'Annual' : 'Monthly',
    period: {
      start: row.start_date,
      end:   row.end_date,
    },
  };
};

/*
========================
GET MY USAGE WITH LIMITS
========================

Powers the GET /subscriptions/me/usage endpoint.
Returns current usage vs limits for all 3 feature keys.
Counts are scoped to subscription_id so auto-renewal resets them.
*/
export const getMyUsageWithLimits = async (userId) => {
  // Get raw subscription row
  const subResult = await sql`
    SELECT subscription_id, end_date, features_snapshot
    FROM subscriptions
    WHERE user_id = ${userId}
      AND status  = 'ACTIVE'
    LIMIT 1
  `;

  if (!subResult.length) return null;

  const sub     = subResult[0];
  const subId   = sub.subscription_id;
  const features = sub.features_snapshot ?? {};

  // Count all three in parallel
  const [projectsResult, aiResult, estimationResult] = await Promise.all([
    sql`SELECT COUNT(*) AS count FROM projects        WHERE user_id = ${userId} AND subscription_id = ${subId}`,
    sql`SELECT COUNT(*) AS count FROM ai_usage_history WHERE user_id = ${userId} AND subscription_id = ${subId}`,
    sql`SELECT COUNT(*) AS count FROM estimation       WHERE subscription_id = ${subId}`,
  ]);

  // Helper: build usage entry for one feature key
  const entry = (featureKey, rawCount) => {
    const limitRaw = features[featureKey];
    const unlimited = limitRaw === 'unlimited';
    const limit     = unlimited ? null : (limitRaw ? parseInt(limitRaw) : null);
    const used      = parseInt(rawCount);

    return {
      used,
      limit,
      unlimited,
      // percentage for progress bar (null when unlimited)
      percentage: (!unlimited && limit) ? Math.min(100, Math.round((used / limit) * 100)) : null,
    };
  };

  return {
    subscription_id: subId,
    plan_ends_at:    sub.end_date,
    usage: {
      projects:    entry('projects_limit',  projectsResult[0].count),
      ai:          entry('ai_usage_limit',  aiResult[0].count),
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
    id:         r.subscription_id,
    status:     r.status,
    start_date: r.start_date,
    end_date:   r.end_date,
    user: {
      id:    r.user_id,
      name:  r.name,
      email: r.email,
    },
    plan: {
      id:    r.plan_id,
      name:  r.name_en,
      price: r.price,
    },
  }));
};

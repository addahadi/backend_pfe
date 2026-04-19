import sql from '../config/database.js';

/*
usageMap

Maps each feature_key to a function that counts current usage
scoped to (userId, subscriptionId).

Counting per subscription_id is intentional:
when auto-renewal creates a new subscription row,
the counter resets to 0 automatically — no cron job needed.

Feature keys must match exactly what admin stores in features table:
  - projects_limit
  - ai_usage_limit
  - estimation_limit
*/
const usageMap = {
  projects_limit: async (userId, subscriptionId) => {
    const result = await sql`
      SELECT COUNT(*) AS count
      FROM projects
      WHERE user_id = ${userId}
        AND subscription_id = ${subscriptionId}
    `;
    return parseInt(result[0].count);
  },

  ai_usage_limit: async (userId, subscriptionId) => {
    const result = await sql`
      SELECT COUNT(*) AS count
      FROM ai_usage_history
      WHERE user_id = ${userId}
        AND subscription_id = ${subscriptionId}
    `;
    return parseInt(result[0].count);
  },

  estimation_limit: async (userId, subscriptionId) => {
    const result = await sql`
      SELECT COUNT(*) AS count
      FROM estimation
      WHERE subscription_id = ${subscriptionId}
    `;
    return parseInt(result[0].count);
  },
};

/*
checkUsage(featureKey)

Factory middleware. Usage:
  router.post('/projects', verifyToken, checkSubscription, checkUsage('projects_limit'), createProject)
  router.post('/ai/predict', verifyToken, checkSubscription, checkUsage('ai_usage_limit'), runAi)
  router.post('/estimations', verifyToken, checkSubscription, checkUsage('estimation_limit'), createEstimation)
*/
export default function checkUsage(featureKey) {
  return async (req, res, next) => {
    try {
      const { userId }   = req.user;
      const subscription = req.subscription; // set by checkSubscription

      // Safeguard — should never happen if middleware order is correct
      if (!subscription) {
        return res.status(403).json({
          success: false,
          error: { code: 'NO_SUBSCRIPTION', message: 'No active subscription' },
        });
      }

      const features = subscription.features_snapshot;
      const limit    = features?.[featureKey];

      // Feature key not in this plan's snapshot
      if (limit === undefined || limit === null) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: 'This feature is not available in your current plan',
          },
        });
      }

      // Unlimited — skip counting
      if (limit === 'unlimited') {
        req.usageContext = { featureKey, used: null, limit: null, unlimited: true };
        return next();
      }

      // Get counter function
      const getUsage = usageMap[featureKey];

      if (!getUsage) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: `No usage counter implemented for: ${featureKey}`,
          },
        });
      }

      const used       = await getUsage(userId, subscription.subscription_id);
      const limitParsed = parseInt(limit);

      if (used >= limitParsed) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'LIMIT_REACHED',
            message: `You have reached your limit for ${featureKey.replace('_limit', '').replace('_', ' ')}`,
            details: { featureKey, used, limit: limitParsed },
          },
        });
      }

      // Attach for controller use (optional but useful)
      req.usageContext = { featureKey, used, limit: limitParsed, unlimited: false };

      next();
    } catch (error) {
      next(error);
    }
  };
}

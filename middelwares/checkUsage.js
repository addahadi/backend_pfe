import sql from '../config/database.js';
import { getPlanFeatures } from '../services/subscription.service.js';

/*
checkUsage Middleware

يخدم لـ:
- projects
- AI usage
- external services
*/

export default function checkUsage(featureKey, tableName) {
  return async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const subscription = req.subscription;

      // -----------------------------
      // 1️⃣ نجيب feature
      // -----------------------------
      const features = await getPlanFeatures(subscription.plan_id);

      const feature = features.find((f) => f.feature_key === featureKey);

      if (!feature) {
        return res.status(403).json({
          message: 'Feature not available',
        });
      }

      const limit = feature.feature_value;

      // -----------------------------
      // 2️⃣ إذا unlimited
      // -----------------------------
      if (limit === 'unlimited') {
        return next();
      }

      // -----------------------------
      // 3️⃣ نحسب الاستعمال
      // -----------------------------
      if (tableName === 'estimations') {
        const result = await sql`
    SELECT COUNT(*)
    FROM estimations e
    JOIN projects p ON e.project_id = p.project_id
    WHERE p.user_id = ${userId}
  `;

        count = parseInt(result[0].count);
      } else {
        const result = await sql`
    SELECT COUNT(*) FROM ${sql(tableName)}
    WHERE user_id = ${userId}
  `;

        count = parseInt(result[0].count);
      }

      // -----------------------------
      // 4️⃣ تحقق من limit
      // -----------------------------
      if (count >= parseInt(limit)) {
        return res.status(403).json({
          message: `${featureKey} limit reached`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

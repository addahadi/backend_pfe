import sql from '../config/database.js';
import { ForbiddenError } from '../utils/AppError.js';

/*
checkSubscription middleware

Responsibilities:
1. Fetch the user's ACTIVE subscription
2. If expired → auto-renew (new subscription row, same plan + snapshot)
3. If none → 403
4. Attach raw subscription row to req.subscription for checkUsage
*/
export default async function checkSubscription(req, res, next) {
  try {
    // ── 1. Fetch raw subscription row (we need subscription_id for usage counting)
    const rows = await sql`
      SELECT *
      FROM subscriptions
      WHERE user_id = ${req.user.userId}
        AND status = 'ACTIVE'
      LIMIT 1
    `;

    let subscription = rows[0] ?? null;

    // ── 2. Auto-renew if expired
    if (subscription && new Date(subscription.end_date) < new Date()) {
      // Deactivate expired
      await sql`
        UPDATE subscriptions
        SET status = 'INACTIVE'
        WHERE subscription_id = ${subscription.subscription_id}
      `;

      const plan = await sql`
        SELECT * FROM plans WHERE plan_id = ${subscription.plan_id}
      `;

      const selectedPlan = plan[0];
      const start_date = new Date();
      const end_date = new Date();
      end_date.setDate(start_date.getDate() + selectedPlan.duration);

      // New subscription row — carries same features_snapshot
      // This is what resets usage counters (subscription_id changes)
      const renewed = await sql`
        INSERT INTO subscriptions (
          user_id,
          plan_id,
          start_date,
          end_date,
          status,
          features_snapshot
        )
        VALUES (
          ${subscription.user_id},
          ${subscription.plan_id},
          ${start_date},
          ${end_date},
          'ACTIVE',
          ${subscription.features_snapshot}
        )
        RETURNING *
      `;

      subscription = renewed[0];
    }

    // ── 3. No subscription at all
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active subscription. Please choose a plan.',
        },
      });
    }

    // ── 4. Attach raw row — checkUsage needs subscription_id + features_snapshot
    req.subscription = subscription;

    next();
  } catch (error) {
    next(error);
  }
}

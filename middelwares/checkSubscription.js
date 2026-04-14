import sql from '../config/database.js';
import { getMySubscription } from '../services/subscription.service.js';

export default async function checkSubscription(req, res, next) {
  try {
    // -----------------------------
    // 1️⃣ جلب الاشتراك
    // -----------------------------
    let subscription = await getMySubscription(req.user.userId);

    // -----------------------------
    // 2️⃣ إذا كاين subscription لكن انتهى
    // -----------------------------
    if (subscription) {
      const now = new Date();

      if (new Date(subscription.end_date) < now) {
        // -----------------------------
        // 🔴 نوقف القديم
        // -----------------------------
        await sql`
          UPDATE subscriptions
          SET status = 'INACTIVE'
          WHERE subscription_id = ${subscription.subscription_id}
        `;

        // -----------------------------
        // 🟢 نجيب plan
        // -----------------------------
        const plan = await sql`
          SELECT * FROM plans 
          WHERE plan_id = ${subscription.plan_id}
        `;

        const selectedPlan = plan[0];

        // -----------------------------
        // 🟢 تواريخ جديدة
        // -----------------------------
        const start_date = new Date();
        const end_date = new Date();
        end_date.setDate(start_date.getDate() + selectedPlan.duration);

        // -----------------------------
        // 🟢 إنشاء subscription جديد
        // (نفس snapshot 🔥)
        // -----------------------------
        const result = await sql`
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
            ${JSON.stringify(subscription.features_snapshot)}
          )
          RETURNING *
        `;

        // نحدث subscription
        subscription = result[0];
      }
    }

    // -----------------------------
    // 3️⃣ إذا ما عندوش subscription
    // -----------------------------
    if (!subscription) {
      return res.status(403).json({
        message: 'No active subscription',
      });
    }

    // -----------------------------
    // 4️⃣ نحطو في req
    // -----------------------------
    req.subscription = subscription;

    next();
  } catch (error) {
    next(error);
  }
}
// استيراد الدالة اللي تجيب subscription
import { getMySubscription } from '../services/subscription.service.js';

/*
checkSubscription Middleware

هذه الدالة:
- تتحقق إذا المستخدم عندو اشتراك
- تمنع الوصول إذا ما عندوش
*/

export default async function checkSubscription(req, res, next) {
  try {
    // -----------------------------
    // 1️⃣ جلب الاشتراك الحالي
    // -----------------------------
    const subscription = await getMySubscription(req.user.userId);

    // -----------------------------
    // 2️⃣ إذا ما عندوش subscription
    // -----------------------------
    if (!subscription) {
      return res.status(403).json({
        message: 'No active subscription',
      });
    }

    // -----------------------------
    // 3️⃣ نحفظ الاشتراك في request
    // -----------------------------
    /*
    باش نستعملوه لاحقاً في controller
    */
    req.subscription = subscription;

    // -----------------------------
    // 4️⃣ نمرر للمرحلة التالية
    // -----------------------------
    next();
  } catch (error) {
    next(error);
  }
}

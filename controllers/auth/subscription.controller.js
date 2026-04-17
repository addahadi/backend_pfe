/*
Subscription Controller

الـ Controller:
- يستقبل request من المستخدم
- يرسلها إلى service
- يرجع response
*/
import * as subscriptionService from '../../services/auth/subscription.service.js';
/*
Create Subscription Controller
*/
export const create = async (req, res, next) => {
  try {
    // Debug (اختياري)
    console.log('user:', req.user);
    console.log('planId:', req.body.planId);

    const result = await subscriptionService.createSubscription({
      userId: req.user.userId,
      planId: req.body.planId,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/*
Get My Subscription Controller
*/

export const getMine = async (req, res, next) => {
  try {
    // userId من التوكن
    const subscription = await subscriptionService.getMySubscription(req.user.userId);

    // إذا ما عندوش subscription
    if (!subscription) {
      return res.status(404).json({
        message: 'No active subscription',
      });
    }

    // إرسال النتيجة
    res.json(subscription);
  } catch (error) {
    next(error);
  }
};

export const getAll = async (req, res, next) => {
  try {
    // -----------------------------
    // 1️⃣ استدعاء service
    // -----------------------------
    const result = await subscriptionService.getAllSubscriptions();

    // -----------------------------
    // 2️⃣ إرسال النتيجة
    // -----------------------------
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // -----------------------------
    // 3️⃣ تمرير الخطأ
    // -----------------------------
    next(error);
  }
};

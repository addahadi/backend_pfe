// controllers/subscription.controller.js
// المتحكم — تغيير الخطة في خطوتين

import {
  getActiveSubscription,
  getPlanWithFeatures,
  isSamePlan,
  generateSwitchToken,
  validateSwitchToken,
  executePlanSwitch,
} from "../services/subscription.service.js";

import { sendConfirmationEmail } from "../services/emailService.js";

// ══════════════════════════════════════════════════════════════
// PATCH /subscriptions/switch
// الخطوة 1 — طلب تغيير الخطة
//
// المدخلات:  { newPlanId }  في req.body
// الشرط:     المستخدم موثّق + لديه اشتراك نشط (checkSubscription)
// ══════════════════════════════════════════════════════════════
export const requestSwitchPlan = async (req, res) => {
  try {
    const userId    = req.user.id;           // جاء من verifyToken
    const { newPlanId } = req.body;

    // التحقق من وجود newPlanId في الطلب
    if (!newPlanId) {
      return res.status(400).json({ message: "يرجى تحديد الخطة الجديدة" });
    }

    // ── جلب الاشتراك النشط الحالي ──────────────────────────
    const currentSubscription = await getActiveSubscription(userId);

    // ── التحقق: هل الخطة الجديدة مختلفة عن الحالية؟ ────────
    if (isSamePlan(currentSubscription.plan_id, newPlanId)) {
      return res.status(400).json({ message: "أنت مشترك بالفعل في هذه الخطة" });
    }

    // ── التحقق من أن الخطة الجديدة موجودة في قاعدة البيانات ─
    const newPlan = await getPlanWithFeatures(newPlanId);

    // ── توليد رمز التأكيد (صالح 15 دقيقة) ─────────────────
    const confirmationToken = generateSwitchToken(
      userId,
      currentSubscription.subscription_id,
      newPlanId
    );

    // ── إرسال رمز التأكيد عبر البريد الإلكتروني ────────────
    await sendConfirmationEmail(req.user.email, confirmationToken);

    return res.status(200).json({
      message:  "تم إرسال رمز التأكيد إلى بريدك الإلكتروني",
      // إرجاع معلومات الخطتين للعرض في الواجهة
      currentPlan: {
        name_en: currentSubscription.plans.name_en,
        name_ar: currentSubscription.plans.name_ar,
        price:   currentSubscription.plans.price,
      },
      newPlan: {
        name_en: newPlan.name_en,
        name_ar: newPlan.name_ar,
        price:   newPlan.price,
      },
    });

  } catch (err) {
    console.error("[requestSwitchPlan]", err.message);
    return res.status(500).json({ message: err.message || "خطأ داخلي في الخادم" });
  }
};

// ══════════════════════════════════════════════════════════════
// POST /subscriptions/switch/confirm
// الخطوة 2 — تأكيد تغيير الخطة برمز التأكيد
//
// المدخلات:  { confirmationToken }  في req.body
// ══════════════════════════════════════════════════════════════
export const confirmSwitchPlan = async (req, res) => {
  try {
    const { confirmationToken } = req.body;

    if (!confirmationToken) {
      return res.status(400).json({ message: "رمز التأكيد مطلوب" });
    }

    // ── التحقق من الرمز واستخراج بيانات الطلب ──────────────
    let userId, subscriptionId, newPlanId;
    try {
      ({ userId, subscriptionId, newPlanId } = validateSwitchToken(confirmationToken));
    } catch (tokenErr) {
      // الرمز غير صالح أو منتهي الصلاحية
      return res.status(400).json({ message: tokenErr.message });
    }

    // ── جلب بيانات الخطة الجديدة (مع المميزات لبناء snapshot) ─
    const newPlan = await getPlanWithFeatures(newPlanId);

    // ── تنفيذ التغيير في قاعدة البيانات:
    //    إلغاء القديم → إنشاء الجديد → تسجيل في ai_usage_history
    const newSubscription = await executePlanSwitch(
      userId,
      subscriptionId,
      newPlan
    );

    // ── إرجاع الاستجابة الكاملة ─────────────────────────────
    return res.status(200).json({
      message: "تم تغيير الخطة بنجاح",
      subscription: {
        subscription_id: newSubscription.subscription_id,
        status:          newSubscription.status,
        start_date:      newSubscription.start_date,
        end_date:        newSubscription.end_date,
        plan: {
          name_en: newPlan.name_en,
          name_ar: newPlan.name_ar,
          price:   newPlan.price,
          type:    newPlan.plan_types?.name_en,
        },
        features_snapshot: newSubscription.features_snapshot,
      },
    });

  } catch (err) {
    console.error("[confirmSwitchPlan]", err.message);
    return res.status(500).json({ message: err.message || "خطأ داخلي في الخادم" });
  }
};

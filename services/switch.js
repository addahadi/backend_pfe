// services/subscription.service.js
// خدمة الاشتراك — منطق تغيير الخطة مع قاعدة البيانات الحقيقية

import supabase from "../config/supabase.js";
import crypto from "crypto";

// مخزن مؤقت لرموز التأكيد (يُنصح بجدول في Supabase في الإنتاج)
const tokenStore = new Map();
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 دقيقة

// ─────────────────────────────────────────────────────────────
// جلب الاشتراك النشط للمستخدم مع بيانات الخطة
// ─────────────────────────────────────────────────────────────
export const getActiveSubscription = async (userId) => {
  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      subscription_id,
      status,
      start_date,
      end_date,
      features_snapshot,
      plan_id,
      plans (
        plan_id,
        name_en,
        name_ar,
        price,
        duration,
        plan_type_id,
        plan_types ( name_en, name_ar )
      )
    `)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single();

  if (error || !data) throw new Error("لا يوجد اشتراك نشط لهذا المستخدم");
  return data;
};

// ─────────────────────────────────────────────────────────────
// جلب الخطة المطلوبة مع مميزاتها من جدول features
// ─────────────────────────────────────────────────────────────
export const getPlanWithFeatures = async (planId) => {
  const { data, error } = await supabase
    .from("plans")
    .select(`
      plan_id,
      name_en,
      name_ar,
      price,
      duration,
      plan_type_id,
      plan_types ( name_en, name_ar ),
      features (
        feature_id,
        feature_key,
        feature_value_en,
        feature_value_ar
      )
    `)
    .eq("plan_id", planId)
    .single();

  if (error || !data) throw new Error("الخطة المطلوبة غير موجودة");
  return data;
};

// ─────────────────────────────────────────────────────────────
// التحقق من أن المستخدم لا يطلب نفس الخطة الحالية
// ─────────────────────────────────────────────────────────────
export const isSamePlan = (currentPlanId, newPlanId) => {
  return currentPlanId === newPlanId;
};

// ─────────────────────────────────────────────────────────────
// توليد رمز تأكيد مرتبط بمعلومات التغيير
// ─────────────────────────────────────────────────────────────
export const generateSwitchToken = (userId, subscriptionId, newPlanId) => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + TOKEN_TTL_MS;

  // حفظ بيانات الطلب مؤقتاً مع الرمز
  tokenStore.set(token, {
    userId,
    subscriptionId,
    newPlanId,
    expiresAt,
  });

  return token;
};

// ─────────────────────────────────────────────────────────────
// التحقق من صحة رمز التأكيد وانتهاء صلاحيته
// ─────────────────────────────────────────────────────────────
export const validateSwitchToken = (token) => {
  const entry = tokenStore.get(token);

  // الرمز غير موجود في المخزن
  if (!entry) throw new Error("الرمز غير صالح");

  // الرمز منتهي الصلاحية → حذفه وإرجاع خطأ
  if (Date.now() > entry.expiresAt) {
    tokenStore.delete(token);
    throw new Error("الرمز منتهي الصلاحية");
  }

  // رمز لمرة واحدة → حذفه بعد الاستخدام
  tokenStore.delete(token);

  return entry; // { userId, subscriptionId, newPlanId }
};

// ─────────────────────────────────────────────────────────────
// تنفيذ تغيير الخطة في قاعدة البيانات
//
// الخطوات:
//   1) إلغاء الاشتراك القديم (status → CANCELLED)
//   2) إنشاء اشتراك جديد بالخطة الجديدة
//   3) تسجيل استخدام الذكاء الاصطناعي في ai_usage_history
// ─────────────────────────────────────────────────────────────
export const executePlanSwitch = async (
  userId,
  subscriptionId,
  newPlan
) => {
  // ── 1) إلغاء الاشتراك القديم ──────────────────────────────
  const { error: cancelError } = await supabase
    .from("subscriptions")
    .update({ status: "CANCELLED", updated_at: new Date().toISOString() })
    .eq("subscription_id", subscriptionId);

  if (cancelError) throw new Error("فشل إلغاء الاشتراك الحالي");

  // ── 2) حساب تواريخ الاشتراك الجديد ───────────────────────
  const startDate = new Date();
  const endDate   = new Date();
  endDate.setDate(endDate.getDate() + newPlan.duration); // مدة الخطة بالأيام

  // بناء features_snapshot من مميزات الخطة الجديدة
  const featuresSnapshot = (newPlan.features || []).reduce((acc, f) => {
    acc[f.feature_key] = {
      en: f.feature_value_en,
      ar: f.feature_value_ar,
    };
    return acc;
  }, {});

  // ── 3) إنشاء الاشتراك الجديد ──────────────────────────────
  const { data: newSubscription, error: createError } = await supabase
    .from("subscriptions")
    .insert({
      user_id:           userId,
      plan_id:           newPlan.plan_id,
      status:            "ACTIVE",
      start_date:        startDate.toISOString().split("T")[0],
      end_date:          endDate.toISOString().split("T")[0],
      features_snapshot: featuresSnapshot,
    })
    .select()
    .single();

  if (createError) throw new Error("فشل إنشاء الاشتراك الجديد");

  // ── 4) تسجيل الحدث في سجل استخدام الذكاء الاصطناعي ───────
  await supabase.from("ai_usage_history").insert({
    user_id:    userId,
    usage_type: "PLAN_SWITCH", // نوع الاستخدام: تغيير الخطة
  });

  return newSubscription;
};

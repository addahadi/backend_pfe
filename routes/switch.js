// routes/subscription.route.js
// مسارات الاشتراك — تغيير الخطة

import { Router } from "express";
import verifyToken from "../middelwares/verfytToken.js";
import checkSubscription from "../middelwares/checkSubscription.js";
import {
  requestSwitchPlan,
  confirmSwitchPlan,
} from "../controllers/switch.js";

const router = Router();

// ─────────────────────────────────────────────────────────────
// PATCH /subscriptions/switch
// الخطوة 1: طلب تغيير الخطة → توليد رمز التأكيد وإرسال الإيميل
// محمي بالمصادقة + التحقق من الاشتراك النشط
// ─────────────────────────────────────────────────────────────
router.patch("/switch", verifyToken, checkSubscription, requestSwitchPlan);

// ─────────────────────────────────────────────────────────────
// POST /subscriptions/switch/confirm
// الخطوة 2: تأكيد تغيير الخطة برمز التأكيد
// ─────────────────────────────────────────────────────────────
router.post("/switch/confirm", verifyToken, confirmSwitchPlan);

export default router;

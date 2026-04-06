// استيراد express
import express from 'express';

// استيراد controller
import { create, getMine } from '../controllers/subscription.controller.js';

// middleware التحقق من التوكن
import verifyToken from '../middelwares/verfytToken.js';

// middleware validation
import { validate } from '../middelwares/validate.js';

// schema
import { createSubscriptionSchema } from '../schemas/subscription.schema.js';

const router = express.Router();

/*
POST /subscriptions

هذا route يسمح للمستخدم بإنشاء اشتراك

Flow:
1. verifyToken → التحقق من المستخدم
2. validate → التحقق من البيان
3. controller → تنفيذ المنطق
*/
router.post('/subscriptions', verifyToken, validate(createSubscriptionSchema), create);

/*
GET /subscriptions/me

هذا route:
- يرجع الاشتراك الحالي للمستخدم
*/

router.get('/subscriptions/me', verifyToken, getMine);

export default router;

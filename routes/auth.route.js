/*
Auth Routes

Defines API endpoints for authentication.
*/

import express from 'express';

import { addFeature, createPlan, getPlans, login, register, verify } from '../controllers/auth.controller.js';
import { validate } from '../middelwares/validate.js';
import { loginShema } from '../schemas/auth.schema.js';

import { registerSchema } from '../schemas/auth.schema.js';
import { refresh } from '../controllers/auth.controller.js';
import { refreshSchema } from '../schemas/auth.schema.js';
import verifyToken from '../middelwares/verfytToken.js';
import { createPlanShema, featureSchema } from '../schemas/auth.schema.js';

const router = express.Router();

/*
POST /auth/register

Registers new user
*/
router.post('/register', validate(registerSchema), register);
/*
POST /auth/login

الخطوات:
1- validate → التحقق من البيانات عبر Zod
2- login controller → تنفيذ منطق تسجيل الدخول
*/

router.post('/login', validate(loginShema), login);

//update acces token
router.post('/refresh', validate(refreshSchema), refresh);

//هذا endpoint يستخدم للتأكد أن access token صالح

router.get('/verify', verifyToken, verify);
//
router.post('plans',validate(createPlanShema),createPlan);
router.post('/features',validate(featureSchema),addFeature);
router.get('plans',getPlans);

export default router;

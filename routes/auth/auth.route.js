/*
Auth Routes

Defines API endpoints for authentication.
*/

import express from 'express';
import verifyToken from '../../middelwares/verfytToken.js';
import { authRateLimit } from '../../middelwares/authRateLimit.js';

import { forgotPasswordSchema, resetPasswordSchema } from '../../schemas/auth.schema.js';
import { forgotPassword, verifyResetToken, resetPassword, getMe } from '../../controllers/auth/auth.controller.js';
import { login, register, verify, logout, refresh } from '../../controllers/auth/auth.controller.js';
import { validate } from '../../middelwares/validate.js';
import { loginShema, registerSchema, refreshSchema } from '../../schemas/auth.schema.js';

// 10 attempts per minute per IP on sensitive auth endpoints
const authLimiter = authRateLimit(10, 60_000);

const router = express.Router();



/*
POST /auth/register

Registers new user
*/
router.post('/register', authLimiter, validate(registerSchema), register);
/*
POST /auth/login

الخطوات:
1- validate → التحقق من البيانات عبر Zod
2- login controller → تنفيذ منطق تسجيل الدخول
*/

router.post('/login', authLimiter, validate(loginShema), login);

//update acces token
router.put('/refresh', validate(refreshSchema), refresh);

//هذا endpoint يستخدم للتأكد أن access token صالح

router.get('/verify', verifyToken, verify);
router.get('/me', verifyToken, getMe);
router.post('/logout', verifyToken, logout);


/*
POST /auth/forgot-password

يستقبل الإيميل ويرسل رابط إعادة التعيين
*/
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);

/*
GET /auth/verify-reset-token

يتحقق من صلاحية التوكن قبل عرض فورم كلمة السر الجديدة
*/
router.get('/verify-reset-token', verifyResetToken);

/*
POST /auth/reset-password

يستقبل التوكن وكلمة السر الجديدة ويحدثها
*/
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), resetPassword);


export default router;

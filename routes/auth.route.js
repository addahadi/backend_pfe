/*
Auth Routes

Defines API endpoints for authentication.
*/

import express from 'express';

import { login, register, verify, logout } from '../controllers/auth.controller.js';
import { validate } from '../middelwares/validate.js';
import { loginShema } from '../schemas/auth.schema.js';

import { registerSchema } from '../schemas/auth.schema.js';
import { refresh } from '../controllers/auth.controller.js';
import { refreshSchema } from '../schemas/auth.schema.js';
import verifyToken from '../middelwares/verfytToken.js';
// استيراد schemas الخاصة بنسيان كلمة السر
import { forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.schema.js';

// استيراد controllers الخاصة بنسيان كلمة السر
import { forgotPassword, verifyResetToken, resetPassword } from '../controllers/auth.controller.js';

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
router.put('/refresh', validate(refreshSchema), refresh);

//هذا endpoint يستخدم للتأكد أن access token صالح

router.get('/verify', verifyToken, verify);
//logout
router.post('/logout', logout);


/*
POST /auth/forgot-password

يستقبل الإيميل ويرسل رابط إعادة التعيين
*/
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

/*
GET /auth/verify-reset-token

يتحقق من صلاحية التوكن قبل عرض فورم كلمة السر الجديدة
*/
router.get('/verify-reset-token', verifyResetToken);

/*
POST /auth/reset-password

يستقبل التوكن وكلمة السر الجديدة ويحدثها
*/
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);


export default router;

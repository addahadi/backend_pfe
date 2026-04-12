/*
Auth Routes

Defines API endpoints for authentication.
*/

import express from 'express';

import { login, register, verify, logout, refresh } from '../../controllers/auth/auth.controller.js';
import { validate } from '../../middelwares/validate.js';
import { loginShema, registerSchema, refreshSchema } from '../../schemas/auth.schema.js';
import verifyToken from '../../middelwares/verfytToken.js';

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
export default router;

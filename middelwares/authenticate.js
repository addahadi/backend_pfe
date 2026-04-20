import jwt from 'jsonwebtoken';
import sql from '../config/database.js';
import { AuthError, NotFoundError, AppError } from '../utils/AppError.js';

export default async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next(new AuthError('Token required'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // 1. جلب الـ id، والـ role، والـ status من قاعدة البيانات
    const rows = await sql`SELECT id, role, status FROM users WHERE id = ${decoded.userId} LIMIT 1`;

    if (rows.length === 0) {
      return next(new NotFoundError('User not found in database.'));
    }

    const user = rows[0];

    // 2. 🛑 التحقق مما إذا كان الحساب غير مفعل (أو محظور)
    // ملاحظة: تأكد أن اسم العمود في الداتا بيز هو 'status' وأن القيمة هي 'INACTIVE'
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      return next(new AppError('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE', 403));
    }

    // 3. تمرير البيانات للمسار التالي
    req.user = {
      userId: user.id,
      role: user.role,
      status: user.status // أضفناها هنا في حال احتجتها في أي كنترولر لاحقاً
    };

    next();
  } catch (err) {
    return next(new AuthError('Invalid or expired token'));
  }
}
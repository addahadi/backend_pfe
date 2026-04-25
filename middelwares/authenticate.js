import jwt from 'jsonwebtoken';
import sql from '../config/database.js';
import { AuthError, NotFoundError, AppError } from '../utils/AppError.js';

export default async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next(new AuthError('Token required'));
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const rows = await sql`SELECT id, role, status FROM users WHERE id = ${decoded.userId} LIMIT 1`;
    if (rows.length === 0) return next(new NotFoundError('User not found in database.'));
    const user = rows[0];
    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      return next(new AppError('Your account is inactive.', 'ACCOUNT_INACTIVE', 403));
    }
    req.user = { userId: user.id, role: user.role, status: user.status };
    next();
  } catch (err) {
    return next(new AuthError('Invalid or expired token'));
  }
}
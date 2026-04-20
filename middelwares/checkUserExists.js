import sql from '../config/database.js';
import { NotFoundError } from '../utils/AppError.js';

/**
 * Lightweight guard that confirms the authenticated user still exists in DB.
 * Must run AFTER authenticate (req.user.userId must be set).
 */
export default async function checkUserExists(req, res, next) {
  try {
    const rows = await sql`SELECT id FROM users WHERE id = ${req.user.userId} LIMIT 1`;
    if (rows.length === 0) {
      return next(new NotFoundError('User not found'));
    }
    next();
  } catch (err) {
    next(err);
  }
}

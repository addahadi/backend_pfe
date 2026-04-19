import sql from '../config/database.js';
import { AuthError, NotFoundError } from '../utils/AppError.js';

/**
 * Middleware: checkUserExists
 *
 * Reads `req.user.userId` (set by verifyToken) and confirms the user
 * exists in the `users` table.  Responds 404 if not found.
 */
export default async function checkUserExists(req, res, next) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new AuthError('Authenticated user id is missing.');
    }

    const rows = await sql`SELECT id FROM users WHERE id = ${userId} LIMIT 1`;

    if (rows.length === 0) {
      throw new NotFoundError('User not found in database.');
    }

    next();
  } catch (error) {
    next(error);
  }
}

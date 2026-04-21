import { ForbiddenError } from '../utils/AppError.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Temporary bypass for development
    return next();

    /* Original code disabled:
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Requires one of: ${allowedRoles.join(', ')}`));
    }
    next();
    */
  };
};
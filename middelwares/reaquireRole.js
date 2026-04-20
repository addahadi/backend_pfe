import { ForbiddenError } from '../utils/AppError.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // التأكد من وجود المستخدم (كإجراء احترازي) وأن دوره ضمن الأدوار المسموح بها
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied. Requires one of: ${allowedRoles.join(', ')}`));
    }

    next();
  };
};
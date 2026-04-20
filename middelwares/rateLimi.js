import { AppError } from '../utils/AppError.js';

const requests = {};

export const rateLimit = (limit = 10, windowMs = 60000) => {
  return (req, res, next) => {
    const userId = req.user.userId;

    if (!requests[userId]) {
      requests[userId] = [];
    }

    const now = Date.now();

    // نحذف القديم
    requests[userId] = requests[userId].filter(
      (time) => now - time < windowMs
    );

    // نزيد request
    requests[userId].push(now);

    // تحقق limit
    if (requests[userId].length > limit) {
      return next(new AppError('Too many requests, try later', 'RATE_LIMIT', 429));
    }

    next();
  };
};
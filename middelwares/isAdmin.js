export const isAdmin = (req, res, next) => {
  // -----------------------------
  // التحقق من أن المستخدم Admin
  // -----------------------------
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      message: 'Access denied: Admin only',
    });
  }

  next();
};
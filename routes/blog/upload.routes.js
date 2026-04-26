// routes/upload.routes.js
import { Router } from 'express';
// ✅ المسار الصحيح: من routes/ إلى middelwares/
import upload from '../../middlewares/upload.js';
import { uploadCover } from '../../controllers/blog/articles.controller.js';
import authenticate from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/requireRole.js';
const router = Router();

// ✅ مسار رفع صورة الغلاف
// ملاحظة: 'cover' يجب أن يطابق اسم الحقل في الفرونت إند
router.post(
  '/admin/upload/cover',
  authenticate,
  requireRole('ADMIN'),
  upload.single('cover'),
  uploadCover
);

export default router;

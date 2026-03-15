// استيراد مكتبة Zod للتحقق من البيانات (Validation)
import { z } from 'zod';

/*
Register Schema

هذا الـ schema يحدد شكل البيانات (data structure)
التي يجب أن تصل إلى السيرفر عند تسجيل مستخدم جديد.

The schema defines the required fields for user registration.
*/
export const registerSchema = z.object({
  /*
  name

  اسم المستخدم.

  - يجب أن يكون String
  - الحد الأدنى 3 أحرف
  - يستخدم لمنع الأسماء القصيرة جدا

  User name must be at least 3 characters.
  */
  name: z.string().min(3, 'name must be at least 3 characters'),

  /*
  email

  البريد الإلكتروني للمستخدم.

  - يجب أن يكون نص (string)
  - يجب أن يكون بصيغة email صحيحة

  Zod will automatically check the email format.

  Example:
  user@mail.com
  */
  email: z.string().email('invalid email format'),

  /*
  password

  كلمة المرور الخاصة بالمستخدم.

  - يجب أن تكون string
  - الحد الأدنى 6 أحرف

  This prevents weak passwords.
  */
  password: z.string().min(6, 'password must be at least 6 characters'),
});




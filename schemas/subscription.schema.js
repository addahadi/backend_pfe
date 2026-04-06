// استيراد Zod للتحقق من البيانات
import { z } from 'zod';

/*
Subscription Schema

هذا schema يتحقق من:
- planId يجب أن يكون رقم
*/
export const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
});

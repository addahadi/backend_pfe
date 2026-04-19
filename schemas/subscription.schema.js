// استيراد Zod للتحقق من البيانات
import { z } from 'zod';

/*
Subscription Schema

هذا schema يتحقق من:
- planId يجب أن يكون نص (string)
*/
export const createSubscriptionSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

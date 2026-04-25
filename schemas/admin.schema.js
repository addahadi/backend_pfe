import { z } from 'zod';

const adminUserStatusSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['active', 'banned', 'suspended', 'inactive'])
);

const adminUserStatusFilterSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string') return 'all';
    const normalised = value.trim().toLowerCase();
    return normalised || 'all';
  },
  z
    .enum(['all', 'active', 'banned', 'suspended', 'inactive'])
    .transform((value) => (value === 'all' ? 'ALL' : value))
);

export const adminUsersQuerySchema = z.object({
  status: adminUserStatusFilterSchema.optional().default('ALL'),
  plan: z
    .string()
    .trim()
    .max(100, 'plan filter is too long')
    .optional()
    .default('ALL')
    .transform((value) => value || 'ALL'),
  search: z
    .string()
    .trim()
    .max(100, 'search is too long')
    .optional()
    .default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const adminUserIdParamSchema = z.object({
  userId: z.string().uuid('invalid user id'),
});

export const updateAdminUserStatusSchema = z.object({
  status: adminUserStatusSchema,
});

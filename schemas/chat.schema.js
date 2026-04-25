import { z } from 'zod';

/**
 * Schema for GET /api/questions
 * Validates that both user_id (UUID) and display_location are provided.
 */
export const getQuestionsByLocationSchema = z.object({
  display_location: z.string().min(1, 'display_location is required'),
});

/**
 * Schema for GET /api/faq/:questionId  (answer by question id)
 * Validates the optional language field.
 */
export const getAnswerByQuestionIdSchema = z.object({
  language: z.enum(['en', 'ar']).optional().default('en'),
});

/**
 * Schema for POST /api/expert
 * Validates that user_message is a non-empty string.
 */
export const expertStageSchema = z.object({
  user_message: z.string().min(1, 'user_message is required'),
});

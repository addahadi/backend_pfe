import { Router } from 'express';
import authenticate from '../../middlewares/authenticate.js';
import checkUserExists from '../../middlewares/checkUserExists.js';
import checkSubscription from '../../middlewares/checkSubscription.js';
import checkUsage from '../../middlewares/checkUsage.js';
import { rateLimit } from '../../middlewares/rateLimit.js';
import { validate } from '../../middlewares/validate.js';
import {
  getQuestionsByLocationSchema,
  getAnswerByQuestionIdSchema,
  expertStageSchema,
} from '../../schemas/chat.schema.js';

import {
  getQuestionsByDisplayLocation,
  getAnswerByQuestionId,
  handleExpertStage,
} from '../../controllers/AI/chat.controller.js';

const router = Router();

// Shared guard: valid JWT + user exists in DB
const guard = [authenticate, checkUserExists];

// GET /api/questions — list questions for a display location (static FAQ, no usage cost)
router.post(
  '/questions',
  ...guard,
  validate(getQuestionsByLocationSchema),
  getQuestionsByDisplayLocation,
);

// POST /api/faq/:questionId — static FAQ answer (no usage cost)
router.post(
  '/faq/:questionId',
  ...guard,
  validate(getAnswerByQuestionIdSchema),
  getAnswerByQuestionId,
);

// POST /api/expert — LLM chatbot (counts against ai_usage_limit)
router.post(
  '/expert',
  ...guard,
  checkSubscription,
  checkUsage('ai_usage_limit'),
  rateLimit(30, 60_000),   // max 30 AI calls/min per user
  validate(expertStageSchema),
  handleExpertStage,
);

export default router;

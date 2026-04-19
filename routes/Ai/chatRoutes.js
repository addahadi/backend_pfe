import { Router } from 'express';
import verifyToken from '../../middelwares/verfytToken.js';
import checkUserExists from '../../middelwares/checkUserExists.js';
import { validate } from '../../middelwares/validate.js';
import {
  getQuestionsByLocationSchema,
  getAnswerByQuestionIdSchema,
  expertStageSchema,
} from '../../schemas/chat.schema.js';

import {
  getQuestionsByDisplayLocation,
  getAnswerByQuestionId,
  handleExpertStage,
} from '../../controllers/AI/chatController.js';

const router = Router();

// Shared guard: every chat route requires a valid JWT + existing user
const guard = [verifyToken, checkUserExists];

// GET /api/questions  – list questions for a display location (no answers)
router.post(
  '/questions',
  ...guard,
  validate(getQuestionsByLocationSchema),
  getQuestionsByDisplayLocation,
);

// GET /api/faq/:questionId  – get answer for a specific question
router.post(
  '/faq/:questionId',
  ...guard,
  validate(getAnswerByQuestionIdSchema),
  getAnswerByQuestionId,
);

// POST /api/expert  – open-text LLM chatbot
router.post(
  '/expert',
  ...guard,
  validate(expertStageSchema),
  handleExpertStage,
);

export default router;
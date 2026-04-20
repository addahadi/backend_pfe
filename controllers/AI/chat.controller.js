import sql from '../../config/database.js';
import * as aiService from '../../services/Ai/aiService.js';
import { NotFoundError, AuthError } from '../../utils/AppError.js';
import { ok } from '../../utils/http.js';

// ─────────────────────────────────────────────
// GET /api/questions
// Returns predefined questions for a display location (no answers).
// Validation is handled by Zod via the validate middleware.
// User-existence check is handled by checkUserExists middleware.
// ─────────────────────────────────────────────
export const getQuestionsByDisplayLocation = async (req, res, next) => {
  const { display_location } = req.body;

  try {
    const rows = await sql`
      SELECT id, question_text_en, question_text_ar, display_location
      FROM   predefined_questions
      WHERE  display_location = ${display_location}
      ORDER  BY created_at DESC
    `;

    if (rows.length === 0) {
      throw new NotFoundError('No questions found for the specified display location.');
    }

    const questions = rows.map((q) => ({
      id: q.id,
      language: {
        en: q.question_text_en,
        ar: q.question_text_ar,
      },
    }));

    ok(res, { questions, display_location, user_id: req.user.userId });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// GET /api/faq/:questionId
// Returns the full question + answer for a given question id,
// then logs the lookup in ai_usage_history.
// Validation is handled by Zod via the validate middleware.
// User-existence check is handled by checkUserExists middleware.
// ─────────────────────────────────────────────
export const getAnswerByQuestionId = async (req, res, next) => {
  const { questionId } = req.params;
  const { language = 'en' } = req.body; // already validated/defaulted by Zod
  const userId = req.user?.userId;

  if (!userId) throw new AuthError('Authenticated user id is missing.');

  try {
    // 1. Fetch question + answer in both languages
    const rows = await sql`
      SELECT id, question_text_en, question_text_ar, answer_text_en, answer_text_ar
      FROM   predefined_questions
      WHERE  id = ${questionId}
    `;

    if (rows.length === 0) {
      throw new NotFoundError('Question not found in database.');
    }

    const data = rows[0];
    const lang = language === 'ar' ? 'ar' : 'en';

    // 2. Log usage in ai_usage_history
    await sql`
      INSERT INTO ai_usage_history (user_id, usage_date, usage_type, created_at)
      VALUES (${userId}, CURRENT_DATE, ${'QUERY'}, CURRENT_TIMESTAMP)
    `;

    // 3. Return bilingual content + the resolved reply for the chosen language
    ok(res, {
      id: data.id,
      question: {
        en: data.question_text_en,
        ar: data.question_text_ar,
      },
      answer: {
        en: data.answer_text_en,
        ar: data.answer_text_ar,
      },
      selectedLanguage: lang,
      user_id: userId,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// POST /api/expert
// Sends user message to the LLM and returns the AI reply.
// Validation is handled by Zod via the validate middleware.
// User-existence check is handled by checkUserExists middleware.
// ─────────────────────────────────────────────
export const handleExpertStage = async (req, res, next) => {
  const { user_message } = req.body;
  const userId = req.user.userId;

  try {
    // 1. Get response from Groq
    const aiReply = await aiService.getExpertResponse(user_message);

    // 2. Log usage history
    await sql`
      INSERT INTO ai_usage_history (user_id, usage_date, usage_type, created_at)
      VALUES (${userId}, CURRENT_DATE, ${'ANALYSIS'}, CURRENT_TIMESTAMP)
    `;

    // 3. Return AI response
    ok(res, { message: aiReply, user_id: userId });
  } catch (error) {
    next(error);
  }
};
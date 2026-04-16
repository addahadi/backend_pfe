const pool = require('../config/supabase');
const aiService = require('../services/aiService');

// Helper function to validate user exists in database
const userExists = async (userId) => {
    try {
        const query = 'SELECT id FROM users WHERE id = $1';
        const result = await pool.query(query, [userId]);
        return result.rows.length > 0;
    } catch (error) {
        console.error("User validation error:", error);
        throw new Error("Failed to validate user. Database connection issue.");
    }
};

// Get questions by display location (without answers)
const getQuestionsByDisplayLocation = async (req, res) => {
    const { user_id, display_location } = req.body;

    // Validate required fields
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required and must be a valid UUID from the users table." });
    }

    if (!display_location) {
        return res.status(400).json({ error: "display_location is required." });
    }

    try {
        // Validate user exists in database
        const isValidUser = await userExists(user_id);
        if (!isValidUser) {
            return res.status(403).json({ error: "User not found in database. Please provide a valid user_id." });
        }

        // 1. Fetch questions by display location (without answers)
        const query = `SELECT id, question_text_en, question_text_ar, display_location
                       FROM predefined_questions 
                       WHERE display_location = $1
                       ORDER BY created_at DESC`;
        const result = await pool.query(query, [display_location]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No questions found for the specified display location." });
        }

        // 2. Log the usage history for tracking
        const insertQuery = `INSERT INTO ai_usage_history (user_id, usage_date, usage_type, created_at) 
                             VALUES ($1, CURRENT_DATE, $2, CURRENT_TIMESTAMP)`;
        await pool.query(insertQuery, [user_id, 'QUERY']);

        // 3. Format response with bilingual content (without answers)
        const questions = result.rows.map(q => ({
            id: q.id,
            language: {
                en: q.question_text_en,
                ar: q.question_text_ar
            }
        }));

        res.status(200).json({ questions, display_location, user_id: user_id });

    } catch (error) {
        console.error("Get Questions By Display Location Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Phase 1: Predefined FAQ Questions (from Database) - Get specific question
const handleWelcomeStage = async (req, res) => {
    const { question_id, user_id, language } = req.body;

    // Validate user_id is provided
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required and must be a valid UUID from the users table." });
    }

    try {
        // Validate user exists in database
        const isValidUser = await userExists(user_id);
        if (!isValidUser) {
            return res.status(403).json({ error: "User not found in database. Please provide a valid user_id." });
        }

        // 1. Fetch the question and answer in both languages from PostgreSQL
        const query = `SELECT id, question_text_en, question_text_ar, answer_text_en, answer_text_ar 
                       FROM predefined_questions 
                       WHERE id = $1`;
        const result = await pool.query(query, [question_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Question not found in database." });
        }

        const data = result.rows[0];
        
        // Determine which language to return (default to English)
        const lang = language === 'ar' ? 'ar' : 'en';
        const answerField = lang === 'ar' ? 'answer_text_ar' : 'answer_text_en';
        const questionField = lang === 'ar' ? 'question_text_ar' : 'question_text_en';

        // 2. Log the usage history for tracking
        const insertQuery = `INSERT INTO ai_usage_history (user_id, usage_date, usage_type, created_at) 
                             VALUES ($1, CURRENT_DATE, $2, CURRENT_TIMESTAMP)`;
        await pool.query(insertQuery, [user_id, 'QUERY']);

        // 3. Send response to frontend with bilingual content
        res.status(200).json({ 
            id: data.id,
            question: {
                en: data.question_text_en,
                ar: data.question_text_ar
            },
            answer: {
                en: data.answer_text_en,
                ar: data.answer_text_ar
            },
            selectedLanguage: lang,
            reply: data[answerField],
            user_id: user_id 
        });

    } catch (error) {
        console.error("Welcome Stage Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Phase 2: Open Text LLM Chatbot
const handleExpertStage = async (req, res) => {
    const { user_message, user_id } = req.body;

    // Validate user_id is provided
    if (!user_id) {
        return res.status(400).json({ error: "user_id is required and must be a valid UUID from the users table." });
    }

    if (!user_message) {
        return res.status(400).json({ error: "User message is required." });
    }

    try {
        // Validate user exists in database
        const isValidUser = await userExists(user_id);
        if (!isValidUser) {
            return res.status(403).json({ error: "User not found in database. Please provide a valid user_id." });
        }

        // 1. Get the response from Groq
        const aiReply = await aiService.getExpertResponse(user_message);

        // 2. Log the usage history
        const insertQuery = `INSERT INTO ai_usage_history (user_id, usage_date, usage_type, created_at) 
                             VALUES ($1, CURRENT_DATE, $2, CURRENT_TIMESTAMP)`;
        await pool.query(insertQuery, [user_id, 'ANALYSIS']);

        // 3. Send the AI response to frontend
        res.status(200).json({ reply: aiReply, user_id: user_id });

    } catch (error) {
        console.error("Expert Stage Error:", error);
        res.status(503).json({ error: "AI Service is temporarily unavailable." });
    }
};

module.exports = {
    getQuestionsByDisplayLocation,
    handleWelcomeStage,
    handleExpertStage
};
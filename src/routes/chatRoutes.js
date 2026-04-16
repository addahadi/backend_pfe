const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Route to get questions by display location: http://localhost:3000/api/questions
router.post('/questions', chatController.getQuestionsByDisplayLocation);

// Route for Phase 1: http://localhost:3000/api/faq
router.post('/faq', chatController.handleWelcomeStage);

// Route for Phase 2: http://localhost:3000/api/expert
router.post('/expert', chatController.handleExpertStage);

module.exports = router;
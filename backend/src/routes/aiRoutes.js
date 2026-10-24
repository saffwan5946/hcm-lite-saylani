const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate, authorize } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// M8: AI Assistant endpoints
router.post('/chat', authenticate, aiRateLimiter, aiController.chat);
router.post('/summarize', authenticate, authorize('Admin', 'HR'), aiRateLimiter, aiController.summarizeKPIs);
router.post('/smart-leave', authenticate, aiRateLimiter, aiController.smartLeave);

module.exports = router;


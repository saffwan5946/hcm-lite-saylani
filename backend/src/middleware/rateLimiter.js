const rateLimit = require('express-rate-limit');

/**
 * AI Rate limiter: max 20 requests per user per hour
 */
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // friendly limit (30 requests per hour)
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      isAiGenerated: true,
      message: 'AI request limit reached (~20 requests per hour). Please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { aiRateLimiter };


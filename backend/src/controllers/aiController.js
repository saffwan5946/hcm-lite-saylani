const aiService = require('../services/aiService');

const chat = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt string is required.' });
    }

    const result = await aiService.processAIChat({
      prompt,
      user: req.user,
      req
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const summarizeKPIs = async (req, res, next) => {
  try {
    const { kpis } = req.body;
    if (!kpis || typeof kpis !== 'object') {
      return res.status(400).json({ success: false, message: 'kpis object is required.' });
    }

    const bullets = aiService.summarizeDashboardKPIs(kpis);
    res.json({
      success: true,
      data: {
        summaryBullets: bullets,
        isAiGenerated: true
      }
    });
  } catch (err) {
    next(err);
  }
};

const smartLeave = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'prompt string is required.' });
    }

    const extracted = await aiService.parseSmartLeave(prompt);
    res.json({
      success: true,
      data: {
        parsedForm: extracted,
        isAiGenerated: true
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  chat,
  summarizeKPIs,
  smartLeave
};


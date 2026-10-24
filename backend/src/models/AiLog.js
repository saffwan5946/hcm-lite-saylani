const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userRole: {
    type: String,
    required: true
  },
  endpoint: {
    type: String, // '/ai/chat', '/ai/summarize', '/ai/smart-leave'
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  toolUsed: {
    type: String,
    default: null
  },
  toolArguments: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  response: {
    type: String,
    required: true
  },
  isFallback: {
    type: Boolean,
    default: false
  },
  durationMs: {
    type: Number,
    default: 0
  }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AiLog', aiLogSchema);


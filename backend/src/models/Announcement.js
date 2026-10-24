const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    default: 'Management'
  },
  targetRole: {
    type: String,
    enum: ['all', 'HR', 'Employee'],
    default: 'all'
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);


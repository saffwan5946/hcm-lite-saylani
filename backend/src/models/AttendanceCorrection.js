const mongoose = require('mongoose');

const attendanceCorrectionSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true
  },
  requestedCheckIn: {
    type: Date,
    required: true
  },
  requestedCheckOut: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewComment: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceCorrection', attendanceCorrectionSchema);


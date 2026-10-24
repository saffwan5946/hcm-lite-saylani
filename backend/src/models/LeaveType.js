const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true // 'annual', 'sick', 'casual', 'unpaid'
  },
  displayName: {
    type: String,
    required: true
  },
  yearlyQuota: {
    type: Number,
    required: true,
    default: 0 // -1 or 9999 for unlimited
  },
  isPaid: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('LeaveType', leaveTypeSchema);


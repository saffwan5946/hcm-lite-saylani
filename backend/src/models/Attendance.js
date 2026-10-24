const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true
  },
  checkIn: {
    type: Date,
    required: true
  },
  checkOut: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'late', 'half_day', 'absent', 'missing_checkout', 'on_leave'],
    default: 'present'
  },
  workHours: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    enum: ['web', 'camera', 'correction'],
    default: 'web'
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    distanceMeters: { type: Number, default: null },
    isWithinRadius: { type: Boolean, default: true }
  },
  faceVerified: {
    type: Boolean,
    default: false
  },
  remarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Ensure unique index per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);


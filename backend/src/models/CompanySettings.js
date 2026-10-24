const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  officeHours: {
    start: { type: String, default: '09:00' }, // HH:mm
    end: { type: String, default: '18:00' },
    graceMinutes: { type: Number, default: 15 }, // late after 09:15
    halfDayHours: { type: Number, default: 5 }   // half_day under 5h
  },
  weekendDays: {
    type: [String],
    default: ['Saturday', 'Sunday']
  },
  officeLocation: {
    latitude: { type: Number, default: 24.8607 },   // e.g. Karachi default
    longitude: { type: Number, default: 67.0011 },
    radiusMeters: { type: Number, default: 150 },   // Geofence radius in meters
    addressText: { type: String, default: 'Main Office' }
  },
  latePenaltyRule: {
    enabled: { type: Boolean, default: true },
    latesPerPenalty: { type: Number, default: 3 }, // 3 lates = 0.5 day
    penaltyDays: { type: Number, default: 0.5 }
  },
  isConfigured: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);


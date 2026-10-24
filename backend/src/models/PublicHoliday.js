const mongoose = require('mongoose');

const publicHolidaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: String, // 'YYYY-MM-DD'
    required: true,
    unique: true
  },
  year: {
    type: Number,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('PublicHoliday', publicHolidaySchema);


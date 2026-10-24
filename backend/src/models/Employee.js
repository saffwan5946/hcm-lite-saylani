const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    default: '',
    trim: true
  },
  address: {
    type: String,
    default: '',
    trim: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    default: 'Male'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  },
  dateOfJoining: {
    type: Date,
    required: true,
    default: Date.now
  },
  dateOfExit: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Probation', 'Resigned', 'Terminated'],
    default: 'Active'
  },
  salary: {
    basic: { type: Number, required: true, min: 0 },
    hra: { type: Number, default: 0 },      // 40% of basic
    medical: { type: Number, default: 0 },  // 10% of basic
    gross: { type: Number, default: 0 }     // 1.5 * basic
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  faceEnrolled: {
    type: Boolean,
    default: false
  },
  faceDescriptor: {
    type: [Number],
    default: []
  }
}, { timestamps: true });

// Virtual full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Auto calculate HRA, Medical, and Gross on save
employeeSchema.pre('save', function(next) {
  if (this.isModified('salary.basic')) {
    const basic = Number(this.salary.basic) || 0;
    this.salary.hra = Math.round(basic * 0.40);
    this.salary.medical = Math.round(basic * 0.10);
    this.salary.gross = Math.round(basic * 1.50);
  }
  next();
});

module.exports = mongoose.model('Employee', employeeSchema);


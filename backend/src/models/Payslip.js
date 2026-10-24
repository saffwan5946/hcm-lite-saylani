const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema({
  payrollRun: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollRun',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  period: {
    type: String, // 'YYYY-MM'
    required: true
  },
  workingDays: {
    type: Number,
    required: true
  },
  presentDays: {
    type: Number,
    default: 0
  },
  halfDays: {
    type: Number,
    default: 0
  },
  absentDays: {
    type: Number,
    default: 0
  },
  unpaidLeaveDays: {
    type: Number,
    default: 0
  },
  paidLeaveDays: {
    type: Number,
    default: 0
  },
  lateCount: {
    type: Number,
    default: 0
  },
  latePenaltyDeductionDays: {
    type: Number,
    default: 0
  },
  basicSalary: {
    type: Number,
    required: true
  },
  hra: {
    type: Number,
    default: 0
  },
  medical: {
    type: Number,
    default: 0
  },
  grossSalary: {
    type: Number,
    required: true
  },
  attendanceDeductions: {
    type: Number,
    default: 0
  },
  latePenaltyDeductions: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  taxDeduction: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    required: true
  },
  isFinalized: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

payslipSchema.index({ employee: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Payslip', payslipSchema);


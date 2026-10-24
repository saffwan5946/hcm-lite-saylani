const PayrollRun = require('../models/PayrollRun');
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const CompanySettings = require('../models/CompanySettings');
const PublicHoliday = require('../models/PublicHoliday');
const { getWorkingDaysInMonth, toDateString } = require('../utils/dateUtils');
const { calculateMonthlyTax } = require('../utils/taxCalculator');
const { recordAuditLog } = require('./auditService');

/**
 * Creates or refreshes a Monthly Payroll Draft (HR only)
 */
async function generateMonthlyPayrollDraft({ year, month, req }) {
  const period = `${year}-${String(month).padStart(2, '0')}`;

  // Check if finalized run already exists
  const existingFinalized = await PayrollRun.findOne({ period, status: 'finalized' });
  if (existingFinalized) {
    const error = new Error(`Payroll for period ${period} is already finalized and locked.`);
    error.statusCode = 400;
    throw error;
  }

  // 1. Calculate working days in the month
  const settings = await CompanySettings.findOne();
  const weekendDays = settings?.weekendDays || ['Saturday', 'Sunday'];
  const holidays = await PublicHoliday.find({ year });
  const holidayDateStrings = holidays.map(h => h.date);

  const monthWorkingDays = getWorkingDaysInMonth(year, month, weekendDays, holidayDateStrings);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStartStr = `${period}-01`;
  const monthEndStr = `${period}-${String(daysInMonth).padStart(2, '0')}`;

  // 2. Fetch all active or eligible employees for the period
  const employees = await Employee.find({
    dateOfJoining: { $lte: new Date(monthEndStr) },
    $or: [
      { dateOfExit: null },
      { dateOfExit: { $gte: new Date(monthStartStr) } }
    ]
  }).populate('department').populate('designation');

  // Find or create draft PayrollRun
  let payrollRun = await PayrollRun.findOne({ period, status: 'draft' });
  if (!payrollRun) {
    payrollRun = new PayrollRun({
      month,
      year,
      period,
      workingDays: monthWorkingDays,
      status: 'draft',
      preparedBy: req.user._id
    });
  } else {
    payrollRun.workingDays = monthWorkingDays;
    payrollRun.preparedBy = req.user._id;
  }

  // 3. Clear existing draft payslips for this period to recalculate cleanly
  await Payslip.deleteMany({ payrollRun: payrollRun._id });

  let totalGross = 0;
  let totalDeductions = 0;
  let totalTax = 0;
  let totalNet = 0;
  const payslips = [];

  for (const emp of employees) {
    // Attendance in this month
    const attendances = await Attendance.find({
      employee: emp._id,
      date: { $gte: monthStartStr, $lte: monthEndStr }
    });

    const presentDays = attendances.filter(a => a.status === 'present').length;
    const lateCount = attendances.filter(a => a.status === 'late').length;
    const halfDays = attendances.filter(a => a.status === 'half_day').length;

    // Leaves in this month
    const approvedLeaves = await LeaveRequest.find({
      employee: emp._id,
      status: 'approved',
      startDate: { $lte: monthEndStr },
      endDate: { $gte: monthStartStr }
    });

    const unpaidLeaveDays = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() === 'unpaid')
      .reduce((sum, l) => sum + (l.workingDays || 0), 0);

    const paidLeaveDays = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() !== 'unpaid')
      .reduce((sum, l) => sum + (l.workingDays || 0), 0);

    // Absent days = Expected working days - (present + late + half_day + paid_leave + unpaid_leave)
    // Prorate joiners/leavers if joined after month start or left before month end
    let empExpectedWorkingDays = monthWorkingDays;
    const joinDateStr = toDateString(emp.dateOfJoining);
    if (joinDateStr > monthStartStr) {
      // Joined during the month -> calculate prorated days
      const { calculateWorkingDays } = require('../utils/dateUtils');
      empExpectedWorkingDays = calculateWorkingDays(joinDateStr, monthEndStr, weekendDays, holidayDateStrings);
    }

    const recordedDays = presentDays + lateCount + halfDays + paidLeaveDays + unpaidLeaveDays;
    const absentDays = Math.max(0, empExpectedWorkingDays - recordedDays);

    // Salary Structure
    const basicSalary = emp.salary.basic;
    const hra = Math.round(basicSalary * 0.40);
    const medical = Math.round(basicSalary * 0.10);
    const grossSalary = Math.round(basicSalary * 1.50);

    // Per day = gross / working days
    const perDayRate = monthWorkingDays > 0 ? (grossSalary / monthWorkingDays) : 0;

    // Attendance deductions = (absent + unpaid + 0.5 * half_day) * perDayRate
    const attendanceDeductDays = absentDays + unpaidLeaveDays + (0.5 * halfDays);
    const attendanceDeductions = Math.round(attendanceDeductDays * perDayRate);

    // Late penalty rule: 3 lates = 0.5 day deduction
    const latePenaltyDeductionDays = Math.floor(lateCount / 3) * 0.5;
    const latePenaltyDeductions = Math.round(latePenaltyDeductionDays * perDayRate);

    // Tax calculation on annual gross (gross * 12)
    const taxDeduction = calculateMonthlyTax(grossSalary);

    const totalEmpDeductions = attendanceDeductions + latePenaltyDeductions + taxDeduction;
    const netSalary = Math.max(0, grossSalary - totalEmpDeductions);

    totalGross += grossSalary;
    totalDeductions += (attendanceDeductions + latePenaltyDeductions);
    totalTax += taxDeduction;
    totalNet += netSalary;

    const payslip = new Payslip({
      payrollRun: payrollRun._id,
      employee: emp._id,
      month,
      year,
      period,
      workingDays: monthWorkingDays,
      presentDays: presentDays + lateCount, // Both attended
      halfDays,
      absentDays,
      unpaidLeaveDays,
      paidLeaveDays,
      lateCount,
      latePenaltyDeductionDays,
      basicSalary,
      hra,
      medical,
      grossSalary,
      attendanceDeductions,
      latePenaltyDeductions,
      totalDeductions: totalEmpDeductions,
      taxDeduction,
      netSalary,
      isFinalized: false
    });

    payslips.push(payslip);
  }

  payrollRun.totalEmployees = employees.length;
  payrollRun.totalGross = totalGross;
  payrollRun.totalDeductions = totalDeductions;
  payrollRun.totalTax = totalTax;
  payrollRun.totalNet = totalNet;

  await payrollRun.save();
  await Payslip.insertMany(payslips);

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'PayrollRun',
    entityId: payrollRun._id,
    details: `Generated payroll draft for period ${period} (${employees.length} employees, Net: PKR ${totalNet.toLocaleString()})`
  });

  return { payrollRun, payslipsCount: payslips.length };
}

/**
 * Finalize monthly payroll (Admin only)
 * Locks the month, preventing further edits
 */
async function finalizeMonthlyPayroll({ period, req }) {
  const payrollRun = await PayrollRun.findOne({ period });
  if (!payrollRun) {
    const error = new Error(`No payroll run found for period ${period}.`);
    error.statusCode = 404;
    throw error;
  }

  if (payrollRun.status === 'finalized') {
    const error = new Error(`Payroll for period ${period} has already been finalized and locked.`);
    error.statusCode = 400;
    throw error;
  }

  payrollRun.status = 'finalized';
  payrollRun.finalizedBy = req.user._id;
  payrollRun.finalizedAt = new Date();
  await payrollRun.save();

  // Lock all payslips for this period
  await Payslip.updateMany({ payrollRun: payrollRun._id }, { isFinalized: true });

  await recordAuditLog({
    req,
    action: 'FINALIZE',
    entity: 'PayrollRun',
    entityId: payrollRun._id,
    details: `Admin finalized and locked payroll for period ${period} (Total Net: PKR ${payrollRun.totalNet.toLocaleString()})`,
    after: { period, status: 'finalized', finalizedAt: payrollRun.finalizedAt }
  });

  return payrollRun;
}

/**
 * Get payroll run details by period
 */
async function getPayrollRun(period) {
  const payrollRun = await PayrollRun.findOne({ period })
    .populate('preparedBy', 'email')
    .populate('finalizedBy', 'email');

  if (!payrollRun) return null;

  const payslips = await Payslip.find({ payrollRun: payrollRun._id })
    .populate({
      path: 'employee',
      populate: [{ path: 'department' }, { path: 'designation' }]
    })
    .sort({ 'employee.employeeCode': 1 });

  return { payrollRun, payslips };
}

/**
 * List all payroll runs
 */
async function listPayrollRuns() {
  return PayrollRun.find()
    .populate('preparedBy', 'email')
    .populate('finalizedBy', 'email')
    .sort({ period: -1 });
}

/**
 * Get single payslip by ID
 */
async function getPayslipById(payslipId) {
  return Payslip.findById(payslipId)
    .populate({
      path: 'employee',
      populate: [{ path: 'department' }, { path: 'designation' }]
    })
    .populate('payrollRun');
}

module.exports = {
  generateMonthlyPayrollDraft,
  finalizeMonthlyPayroll,
  getPayrollRun,
  listPayrollRuns,
  getPayslipById
};


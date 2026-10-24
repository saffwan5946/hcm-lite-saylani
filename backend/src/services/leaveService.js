const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const Employee = require('../models/Employee');
const CompanySettings = require('../models/CompanySettings');
const PublicHoliday = require('../models/PublicHoliday');
const { calculateWorkingDays } = require('../utils/dateUtils');
const { recordAuditLog } = require('./auditService');

/**
 * Calculates leave balance summary for an employee
 */
async function getEmployeeLeaveBalance(employeeId) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const leaveTypes = await LeaveType.find({});
  const approvedLeaves = await LeaveRequest.find({
    employee: employee._id,
    status: 'approved'
  });

  return leaveTypes.map(lt => {
    const usedDays = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() === lt.name.toLowerCase())
      .reduce((sum, l) => sum + (l.workingDays || 0), 0);

    const isUnlimited = lt.yearlyQuota >= 9999 || lt.name === 'unpaid';
    const remainingDays = isUnlimited ? 9999 : Math.max(0, lt.yearlyQuota - usedDays);

    return {
      leaveTypeId: lt._id,
      name: lt.name,
      displayName: lt.displayName,
      quota: isUnlimited ? 'Unlimited' : lt.yearlyQuota,
      used: usedDays,
      remaining: isUnlimited ? 'Unlimited' : remainingDays,
      isPaid: lt.isPaid
    };
  });
}

/**
 * Apply for leave
 * Validates working days (excludes weekends and public holidays)
 * Checks for date overlap (returns 422)
 * Checks for quota over-balance (returns 422)
 */
async function applyLeave({
  employeeId,
  leaveTypeName,
  startDate,
  endDate,
  reason,
  req
}) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const normType = leaveTypeName.trim().toLowerCase();
  const leaveType = await LeaveType.findOne({ name: normType });
  if (!leaveType) {
    const error = new Error(`Invalid leave type '${leaveTypeName}'. Allowed: annual, sick, casual, unpaid.`);
    error.statusCode = 400;
    throw error;
  }

  if (new Date(startDate) > new Date(endDate)) {
    const error = new Error('Start date cannot be after end date.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch company settings for weekends and public holidays
  const settings = await CompanySettings.findOne();
  const weekendDays = settings?.weekendDays || ['Saturday', 'Sunday'];
  const holidays = await PublicHoliday.find({});
  const holidayDateStrings = holidays.map(h => h.date);

  // 2. Compute working days (skips weekends and public holidays)
  const workingDays = calculateWorkingDays(startDate, endDate, weekendDays, holidayDateStrings);
  if (workingDays <= 0) {
    const error = new Error('Selected date range does not contain any working days (all dates fall on weekends or public holidays).');
    error.statusCode = 422;
    throw error;
  }

  // 3. Overlap check with existing pending or approved leaves -> 422
  const overlap = await LeaveRequest.findOne({
    employee: employee._id,
    status: { $in: ['pending', 'approved'] },
    $or: [
      { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
    ]
  });

  if (overlap) {
    const error = new Error(`Leave overlap conflict: An existing ${overlap.status} leave request covers this date period (${overlap.startDate} to ${overlap.endDate}).`);
    error.statusCode = 422;
    throw error;
  }

  // 4. Over-balance check -> 422
  const isUnlimited = leaveType.yearlyQuota >= 9999 || leaveType.name === 'unpaid';
  if (!isUnlimited) {
    const approvedLeaves = await LeaveRequest.find({
      employee: employee._id,
      leaveTypeName: normType,
      status: 'approved'
    });
    const alreadyUsed = approvedLeaves.reduce((sum, l) => sum + (l.workingDays || 0), 0);
    const balanceRemaining = leaveType.yearlyQuota - alreadyUsed;

    if (workingDays > balanceRemaining) {
      const error = new Error(`Insufficient leave balance: Requested ${workingDays} working days, but only ${balanceRemaining} days remaining for ${leaveType.displayName}.`);
      error.statusCode = 422;
      throw error;
    }
  }

  const leaveRequest = await LeaveRequest.create({
    employee: employee._id,
    leaveType: leaveType._id,
    leaveTypeName: normType,
    startDate,
    endDate,
    workingDays,
    reason: reason.trim(),
    status: 'pending'
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'LeaveRequest',
    entityId: leaveRequest._id,
    details: `Leave applied by '${employee.employeeCode}' (${leaveType.displayName}: ${startDate} to ${endDate}, ${workingDays} days)`,
    after: { type: normType, startDate, endDate, workingDays, reason }
  });

  return leaveRequest;
}

/**
 * Review leave request (HR only)
 * Approve or Reject with comment
 */
async function reviewLeaveRequest(leaveRequestId, { status, reviewComment = '', req }) {
  if (!['approved', 'rejected'].includes(status)) {
    const error = new Error("Invalid review status. Must be 'approved' or 'rejected'.");
    error.statusCode = 400;
    throw error;
  }

  const leave = await LeaveRequest.findById(leaveRequestId).populate('employee');
  if (!leave) {
    const error = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (leave.status !== 'pending') {
    const error = new Error(`Leave request has already been ${leave.status}.`);
    error.statusCode = 400;
    throw error;
  }

  const before = leave.toObject();
  leave.status = status;
  leave.reviewComment = reviewComment.trim();
  leave.reviewedBy = req.user._id;
  await leave.save();

  await recordAuditLog({
    req,
    action: status === 'approved' ? 'APPROVE' : 'REJECT',
    entity: 'LeaveRequest',
    entityId: leave._id,
    details: `Leave request for '${leave.employee.employeeCode}' was ${status} by HR (${leave.workingDays} days)`,
    before,
    after: { status, reviewComment }
  });

  return leave;
}

/**
 * Cancel pending leave request (Employee self-service)
 */
async function cancelLeaveRequest(leaveRequestId, req) {
  const leave = await LeaveRequest.findById(leaveRequestId).populate('employee');
  if (!leave) {
    const error = new Error('Leave request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (req.user.role === 'Employee' && leave.employee._id.toString() !== req.user.employee?._id?.toString()) {
    const error = new Error('Access denied: You can only cancel your own leave requests.');
    error.statusCode = 403;
    throw error;
  }

  if (leave.status !== 'pending') {
    const error = new Error(`Cannot cancel a leave request that is already ${leave.status}.`);
    error.statusCode = 400;
    throw error;
  }

  leave.status = 'cancelled';
  await leave.save();

  await recordAuditLog({
    req,
    action: 'UPDATE',
    entity: 'LeaveRequest',
    entityId: leave._id,
    details: `Leave request cancelled by '${leave.employee.employeeCode}'`,
    after: { status: 'cancelled' }
  });

  return leave;
}

/**
 * List leave requests
 */
async function listLeaveRequests({ employeeId = null, status = null }) {
  const query = {};
  if (employeeId) query.employee = employeeId;
  if (status) query.status = status;

  return LeaveRequest.find(query)
    .populate('employee')
    .populate('leaveType')
    .sort({ createdAt: -1 });
}

module.exports = {
  getEmployeeLeaveBalance,
  applyLeave,
  reviewLeaveRequest,
  cancelLeaveRequest,
  listLeaveRequests
};


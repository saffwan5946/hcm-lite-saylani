const Attendance = require('../models/Attendance');
const AttendanceCorrection = require('../models/AttendanceCorrection');
const CompanySettings = require('../models/CompanySettings');
const Employee = require('../models/Employee');
const LeaveRequest = require('../models/LeaveRequest');
const { getDistanceMeters } = require('../utils/haversine');
const { toDateString } = require('../utils/dateUtils');
const { recordAuditLog } = require('./auditService');

/**
 * Check-in endpoint logic
 * Server stamps the time. One record per employee per day (second check-in = 409).
 * Late after office start + grace minutes (e.g. 09:15).
 * If camera check-in: verifies GPS location is within office radius.
 */
async function checkIn({
  employeeId,
  source = 'web',
  location = null,
  faceVerified = false,
  req
}) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const todayStr = toDateString(now);

  // Check if already checked in today (duplicate check-in = 409)
  const existingAttendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
  if (existingAttendance) {
    const error = new Error('Already checked in for today.');
    error.statusCode = 409;
    throw error;
  }

  const settings = await CompanySettings.findOne() || {
    officeHours: { start: '09:00', end: '18:00', graceMinutes: 15, halfDayHours: 5 },
    officeLocation: { latitude: 24.8607, longitude: 67.0011, radiusMeters: 150 }
  };

  // Geofence check if location is provided or source is camera
  let distanceMeters = null;
  let isWithinRadius = true;

  if (location && location.latitude && location.longitude) {
    if (location.accuracy && location.accuracy > 100) {
      const error = new Error(`GPS accuracy is too low (${Math.round(location.accuracy)}m > 100m threshold). Please move outdoors or try again.`);
      error.statusCode = 400;
      throw error;
    }

    const officeLat = settings.officeLocation?.latitude || 24.8607;
    const officeLng = settings.officeLocation?.longitude || 67.0011;
    const allowedRadius = settings.officeLocation?.radiusMeters || 150;

    distanceMeters = getDistanceMeters(location.latitude, location.longitude, officeLat, officeLng);
    isWithinRadius = distanceMeters <= allowedRadius;

    if (source === 'camera' && !isWithinRadius) {
      const error = new Error(`Location outside office premises (${distanceMeters}m away from office, allowed radius: ${allowedRadius}m). Attendance rejected.`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Calculate Late status: office start 09:00 + grace 15 min = 09:15
  const [startHour, startMin] = (settings.officeHours?.start || '09:00').split(':').map(Number);
  const graceMin = settings.officeHours?.graceMinutes || 15;

  const thresholdDate = new Date(now);
  thresholdDate.setHours(startHour, startMin + graceMin, 0, 0);

  const isLate = now.getTime() > thresholdDate.getTime();
  const status = isLate ? 'late' : 'present';

  const attendance = await Attendance.create({
    employee: employee._id,
    date: todayStr,
    checkIn: now,
    status,
    source,
    location: location ? {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy || null,
      distanceMeters,
      isWithinRadius
    } : undefined,
    faceVerified: Boolean(faceVerified),
    remarks: isLate ? `Late check-in at ${now.toLocaleTimeString()}` : 'On time'
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'Attendance',
    entityId: attendance._id,
    details: `Check-in recorded for '${employee.employeeCode}' (Status: ${status}, Source: ${source})`,
    after: { date: todayStr, checkIn: now, status, source }
  });

  return attendance;
}

/**
 * Check-out endpoint logic
 * Calculates total work hours and evaluates half-day status (under 5 hours = half_day)
 */
async function checkOut({ employeeId, req }) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const now = new Date();
  const todayStr = toDateString(now);

  const attendance = await Attendance.findOne({ employee: employee._id, date: todayStr });
  if (!attendance) {
    const error = new Error('No check-in record found for today. You must check in first.');
    error.statusCode = 400;
    throw error;
  }

  if (attendance.checkOut) {
    const error = new Error('Already checked out for today.');
    error.statusCode = 400;
    throw error;
  }

  const checkInTime = new Date(attendance.checkIn).getTime();
  const checkOutTime = now.getTime();
  const workDurationHours = Number(((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2));

  attendance.checkOut = now;
  attendance.workHours = workDurationHours;

  const settings = await CompanySettings.findOne();
  const halfDayThreshold = settings?.officeHours?.halfDayHours || 5;

  // Half day if work hours < 5h
  if (workDurationHours < halfDayThreshold) {
    attendance.status = 'half_day';
    attendance.remarks = `Worked ${workDurationHours}h (< ${halfDayThreshold}h required for full day)`;
  }

  await attendance.save();

  await recordAuditLog({
    req,
    action: 'UPDATE',
    entity: 'Attendance',
    entityId: attendance._id,
    details: `Check-out recorded for '${employee.employeeCode}' (${workDurationHours} hrs, Status: ${attendance.status})`,
    after: { checkOut: now, workHours: workDurationHours, status: attendance.status }
  });

  return attendance;
}

/**
 * Daily Attendance Board (HR & Admin)
 * Displays attendance for a specific date, highlighting present, late, half-day, absent, and on-leave employees
 */
async function getDailyAttendanceBoard(dateStr) {
  const targetDate = dateStr || toDateString(new Date());

  // 1. Fetch all active employees
  const employees = await Employee.find({ status: { $in: ['Active', 'Probation'] } })
    .populate('department')
    .populate('designation')
    .sort({ 'department.name': 1, firstName: 1 });

  // 2. Fetch all attendance records for date
  const attendances = await Attendance.find({ date: targetDate });
  const attendanceMap = new Map();
  attendances.forEach(a => attendanceMap.set(a.employee.toString(), a));

  // 3. Fetch approved leaves for date
  const approvedLeaves = await LeaveRequest.find({
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
    status: 'approved'
  });
  const onLeaveEmpIds = new Set(approvedLeaves.map(l => l.employee.toString()));

  const board = employees.map(emp => {
    const empId = emp._id.toString();
    const att = attendanceMap.get(empId);
    const isOnLeave = onLeaveEmpIds.has(empId);

    let status = 'absent';
    let checkIn = null;
    let checkOut = null;
    let workHours = 0;
    let source = null;

    if (att) {
      status = att.status;
      checkIn = att.checkIn;
      checkOut = att.checkOut;
      workHours = att.workHours;
      source = att.source;
      if (!att.checkOut && targetDate < toDateString(new Date())) {
        status = 'missing_checkout';
      }
    } else if (isOnLeave) {
      status = 'on_leave';
    }

    return {
      employeeId: emp._id,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.department?.name || 'General',
      designation: emp.designation?.title || 'Staff',
      status,
      checkIn,
      checkOut,
      workHours,
      source
    };
  });

  const summary = {
    total: board.length,
    present: board.filter(b => b.status === 'present').length,
    late: board.filter(b => b.status === 'late').length,
    halfDay: board.filter(b => b.status === 'half_day').length,
    onLeave: board.filter(b => b.status === 'on_leave').length,
    absent: board.filter(b => b.status === 'absent').length,
    missingCheckout: board.filter(b => b.status === 'missing_checkout').length
  };

  return { date: targetDate, summary, records: board };
}

/**
 * Attendance Correction: Employee submits correction request
 */
async function requestCorrection({ employeeId, date, requestedCheckIn, requestedCheckOut, reason, req }) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const existingPending = await AttendanceCorrection.findOne({
    employee: employee._id,
    date,
    status: 'pending'
  });
  if (existingPending) {
    const error = new Error('A correction request is already pending for this date.');
    error.statusCode = 400;
    throw error;
  }

  const correction = await AttendanceCorrection.create({
    employee: employee._id,
    date,
    requestedCheckIn: new Date(requestedCheckIn),
    requestedCheckOut: new Date(requestedCheckOut),
    reason: reason.trim()
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    details: `Attendance correction requested by '${employee.employeeCode}' for date ${date}`
  });

  return correction;
}

/**
 * Attendance Correction Review (HR Only)
 */
async function reviewCorrection(correctionId, { status, reviewComment, req }) {
  const correction = await AttendanceCorrection.findById(correctionId).populate('employee');
  if (!correction) {
    const error = new Error('Correction request not found.');
    error.statusCode = 404;
    throw error;
  }

  if (correction.status !== 'pending') {
    const error = new Error(`Request has already been ${correction.status}.`);
    error.statusCode = 400;
    throw error;
  }

  correction.status = status;
  correction.reviewComment = reviewComment || '';
  correction.reviewedBy = req.user._id;
  await correction.save();

  // If approved, update or create Attendance record
  if (status === 'approved') {
    const checkIn = new Date(correction.requestedCheckIn);
    const checkOut = new Date(correction.requestedCheckOut);
    const workHours = Number(((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2));

    await Attendance.findOneAndUpdate(
      { employee: correction.employee._id, date: correction.date },
      {
        employee: correction.employee._id,
        date: correction.date,
        checkIn,
        checkOut,
        workHours,
        status: workHours < 5 ? 'half_day' : 'present',
        source: 'correction',
        remarks: `Corrected by HR: ${reviewComment || 'Approved'}`
      },
      { upsert: true, new: true }
    );
  }

  await recordAuditLog({
    req,
    action: status === 'approved' ? 'APPROVE' : 'REJECT',
    entity: 'AttendanceCorrection',
    entityId: correction._id,
    details: `Attendance correction for '${correction.employee.employeeCode}' on ${correction.date} was ${status} by HR`,
    after: { status, reviewComment }
  });

  return correction;
}

module.exports = {
  checkIn,
  checkOut,
  getDailyAttendanceBoard,
  requestCorrection,
  reviewCorrection
};


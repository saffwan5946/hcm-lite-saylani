const attendanceService = require('../services/attendanceService');

const checkIn = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : (req.body.employeeId || req.user.employee?._id);

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile not identified.' });
    }

    const { source, location, faceVerified } = req.body;
    const result = await attendanceService.checkIn({
      employeeId,
      source: source || 'web',
      location,
      faceVerified,
      req
    });

    res.status(201).json({
      success: true,
      message: `Checked in successfully (Status: ${result.status})`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : (req.body.employeeId || req.user.employee?._id);

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile not identified.' });
    }

    const result = await attendanceService.checkOut({ employeeId, req });
    res.json({
      success: true,
      message: `Checked out successfully (${result.workHours} hrs worked)`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getBoard = async (req, res, next) => {
  try {
    const data = await attendanceService.getDailyAttendanceBoard(req.query.date);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const requestCorrection = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : req.body.employeeId;

    const { date, requestedCheckIn, requestedCheckOut, reason } = req.body;
    if (!date || !requestedCheckIn || !requestedCheckOut || !reason) {
      return res.status(400).json({ success: false, message: 'date, requestedCheckIn, requestedCheckOut, and reason are required.' });
    }

    const correction = await attendanceService.requestCorrection({
      employeeId,
      date,
      requestedCheckIn,
      requestedCheckOut,
      reason,
      req
    });

    res.status(201).json({ success: true, data: correction });
  } catch (err) {
    next(err);
  }
};

const reviewCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'." });
    }

    const result = await attendanceService.reviewCorrection(id, { status, reviewComment, req });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkIn,
  checkOut,
  getBoard,
  requestCorrection,
  reviewCorrection
};


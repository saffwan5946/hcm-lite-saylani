const leaveService = require('../services/leaveService');

const getBalance = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : (req.query.employeeId || req.user.employee?._id);

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile not identified.' });
    }

    const balances = await leaveService.getEmployeeLeaveBalance(employeeId);
    res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
};

const apply = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : (req.body.employeeId || req.user.employee?._id);

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile not identified.' });
    }

    const { leaveTypeName, startDate, endDate, reason } = req.body;
    if (!leaveTypeName || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: 'leaveTypeName, startDate, endDate, and reason are required.' });
    }

    const result = await leaveService.applyLeave({
      employeeId,
      leaveTypeName,
      startDate,
      endDate,
      reason,
      req
    });

    res.status(201).json({
      success: true,
      message: `Leave applied successfully (${result.workingDays} working days)`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const review = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewComment } = req.body;
    const result = await leaveService.reviewLeaveRequest(id, { status, reviewComment, req });
    res.json({
      success: true,
      message: `Leave request ${status} successfully.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const cancel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await leaveService.cancelLeaveRequest(id, req);
    res.json({
      success: true,
      message: 'Leave request cancelled successfully.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : req.query.employeeId;

    const data = await leaveService.listLeaveRequests({
      employeeId,
      status: req.query.status
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBalance,
  apply,
  review,
  cancel,
  list
};


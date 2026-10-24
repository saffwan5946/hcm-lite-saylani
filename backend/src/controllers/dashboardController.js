const dashboardService = require('../services/dashboardService');

const getHRDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getHRDashboardData({
      departmentId: req.query.departmentId,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const data = await dashboardService.getAdminDashboardData({
      departmentId: req.query.departmentId
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getEmployeeDashboard = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'Employee' 
      ? req.user.employee?._id 
      : (req.query.employeeId || req.user.employee?._id);

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee profile not linked.' });
    }

    const data = await dashboardService.getEmployeeDashboardData(employeeId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHRDashboard,
  getAdminDashboard,
  getEmployeeDashboard
};


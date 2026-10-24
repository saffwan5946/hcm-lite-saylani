const authService = require('../services/authService');

const getStatus = async (req, res, next) => {
  try {
    const status = await authService.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
};

const setupFirstRun = async (req, res, next) => {
  try {
    const { companyName, adminEmail, adminPassword, officeHours, officeLocation } = req.body;
    if (!companyName || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, message: 'companyName, adminEmail, and adminPassword are required.' });
    }

    const result = await authService.performFirstRunSetup({
      companyName,
      adminEmail,
      adminPassword,
      officeHours,
      officeLocation,
      req
    });

    res.status(201).json({
      success: true,
      message: 'First-run setup completed successfully. You may now log in.',
      data: { companyName: result.company.companyName, adminEmail: result.admin.email }
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const result = await authService.loginUser({ email, password, req });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
      req
    });
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role,
        mustChangePassword: req.user.mustChangePassword,
        employee: req.user.employee
      }
    });
  } catch (err) {
    next(err);
  }
};

const createHR = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }
    const hr = await authService.createHRUser({ email, password, req });
    res.status(201).json({ success: true, data: hr });
  } catch (err) {
    next(err);
  }
};

const manageUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isActive, newPassword } = req.body;
    const updated = await authService.manageUserStatus({ userId, isActive, newPassword, req });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStatus,
  setupFirstRun,
  login,
  changePassword,
  getMe,
  createHR,
  manageUser
};


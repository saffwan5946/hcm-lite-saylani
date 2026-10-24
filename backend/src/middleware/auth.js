const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Middleware to authenticate requests via JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.userId).populate('employee');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid authentication token.' });
  }
};

/**
 * Middleware to authorize roles
 * @param  {...string} roles Allowed roles ('Admin', 'HR', 'Employee')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: '${req.user.role}' does not have permission to perform this action.`
      });
    }
    next();
  };
};

/**
 * Scope guard middleware: verifies that an Employee only accesses their own employee record
 * For Admin and HR, access is granted. For Employee, requested param or query must match user's employee ID.
 */
const scopeGuard = (paramKey = 'employeeId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.role === 'Admin' || req.user.role === 'HR') {
      return next();
    }

    // Role is Employee
    const requestedId = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];
    const ownEmployeeId = req.user.employee ? req.user.employee._id.toString() : null;

    if (!ownEmployeeId) {
      return res.status(403).json({ success: false, message: 'Employee profile not linked to user account.' });
    }

    if (requestedId && requestedId.toString() !== ownEmployeeId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are only permitted to view or manage your own records.'
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize, scopeGuard };


const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const CompanySettings = require('../models/CompanySettings');
const LeaveType = require('../models/LeaveType');
const env = require('../config/env');
const { recordAuditLog } = require('./auditService');

/**
 * Checks system initialization status:
 * Returns whether company settings exist and if at least one Admin account is created
 */
async function getSystemStatus() {
  const company = await CompanySettings.findOne();
  const adminCount = await User.countDocuments({ role: 'Admin' });

  return {
    isConfigured: !!(company && adminCount > 0),
    hasCompany: !!company,
    hasAdmin: adminCount > 0,
    companyName: company?.companyName || null
  };
}

/**
 * Performs first-run setup:
 * Creates CompanySettings, default LeaveTypes, and first Admin user
 */
async function performFirstRunSetup({
  companyName,
  adminEmail,
  adminPassword,
  officeHours = { start: '09:00', end: '18:00', graceMinutes: 15, halfDayHours: 5 },
  officeLocation = { latitude: 24.8607, longitude: 67.0011, radiusMeters: 150 },
  req
}) {
  const adminCount = await User.countDocuments({ role: 'Admin' });
  if (adminCount > 0) {
    const error = new Error('System is already initialized with an Admin account.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Create or update company settings
  let company = await CompanySettings.findOne();
  if (!company) {
    company = await CompanySettings.create({
      companyName: companyName.trim(),
      officeHours,
      officeLocation,
      weekendDays: ['Saturday', 'Sunday'],
      isConfigured: true
    });
  } else {
    company.companyName = companyName.trim();
    company.officeHours = officeHours;
    company.officeLocation = officeLocation;
    company.isConfigured = true;
    await company.save();
  }

  // 2. Initialize default leave types if not yet created (annual 14, sick 8, casual 10, unpaid 999)
  const defaultLeaveTypes = [
    { name: 'annual', displayName: 'Annual Leave', yearlyQuota: 14, isPaid: true, description: 'Statutory annual vacation' },
    { name: 'sick', displayName: 'Sick Leave', yearlyQuota: 8, isPaid: true, description: 'Medical or sick leave' },
    { name: 'casual', displayName: 'Casual Leave', yearlyQuota: 10, isPaid: true, description: 'Short notice / urgent personal leave' },
    { name: 'unpaid', displayName: 'Unpaid Leave', yearlyQuota: 9999, isPaid: false, description: 'Loss of pay leave' }
  ];

  for (const lt of defaultLeaveTypes) {
    const exists = await LeaveType.findOne({ name: lt.name });
    if (!exists) {
      await LeaveType.create(lt);
    }
  }

  // 3. Create Admin user
  const admin = await User.create({
    email: adminEmail.trim().toLowerCase(),
    password: adminPassword,
    role: 'Admin',
    mustChangePassword: false,
    isActive: true
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'CompanySettings',
    entityId: company._id,
    details: `First-run system setup completed for '${company.companyName}' with Admin '${admin.email}'`,
    after: { companyName: company.companyName, adminEmail: admin.email }
  });

  return { company, admin };
}

/**
 * Authenticates user credentials and returns JWT token + user profile
 */
async function loginUser({ email, password, req }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).populate({
    path: 'employee',
    populate: [{ path: 'department' }, { path: 'designation' }]
  });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account has been deactivated. Please contact an Administrator.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
      employeeId: user.employee ? user.employee._id : null
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  await recordAuditLog({
    req: { ...req, user },
    action: 'LOGIN',
    entity: 'User',
    entityId: user._id,
    details: `User '${user.email}' (${user.role}) logged in successfully`
  });

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      employee: user.employee
    }
  };
}

/**
 * Changes user password (supports first-time mandatory password reset)
 */
async function changePassword({ userId, currentPassword, newPassword, req }) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // If not mandatory first change, verify old password
  if (!user.mustChangePassword) {
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const error = new Error('Incorrect current password.');
      error.statusCode = 400;
      throw error;
    }
  }

  if (!newPassword || newPassword.length < 6) {
    const error = new Error('New password must be at least 6 characters.');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  await recordAuditLog({
    req,
    action: 'PASSWORD_RESET',
    entity: 'User',
    entityId: user._id,
    details: `Password changed for '${user.email}'`
  });

  return { message: 'Password updated successfully.' };
}

/**
 * Admin creates HR user login
 */
async function createHRUser({ email, password, req }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const error = new Error(`User with email '${normalizedEmail}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const hrUser = await User.create({
    email: normalizedEmail,
    password: password || 'SaylaniHR@2026',
    role: 'HR',
    mustChangePassword: true,
    isActive: true
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'User',
    entityId: hrUser._id,
    details: `Admin created HR login for '${hrUser.email}'`,
    after: { email: hrUser.email, role: 'HR' }
  });

  return hrUser;
}

/**
 * Admin toggles user activation or resets temporary password
 */
async function manageUserStatus({ userId, isActive, newPassword, req }) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const before = { isActive: user.isActive };

  if (typeof isActive === 'boolean') {
    user.isActive = isActive;
  }
  if (newPassword) {
    user.password = newPassword;
    user.mustChangePassword = true;
  }

  await user.save();

  await recordAuditLog({
    req,
    action: 'UPDATE',
    entity: 'User',
    entityId: user._id,
    details: `Admin updated user account status for '${user.email}'`,
    before,
    after: { isActive: user.isActive, passwordReset: !!newPassword }
  });

  return user;
}

module.exports = {
  getSystemStatus,
  performFirstRunSetup,
  loginUser,
  changePassword,
  createHRUser,
  manageUserStatus
};


const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveType = require('../models/LeaveType');
const Attendance = require('../models/Attendance');
const Payslip = require('../models/Payslip');
const { recordAuditLog } = require('./auditService');
const { dryRunValidateEmployeeRows } = require('../utils/csvParser');

/**
 * Register a new employee (HR only)
 * Creates Employee profile and automatically generates User account with temporary password
 */
async function registerEmployee({
  employeeCode,
  firstName,
  lastName,
  email,
  phone = '',
  address = '',
  gender = 'Male',
  departmentId,
  designationId,
  dateOfJoining = new Date(),
  basicSalary,
  temporaryPassword = 'ChangeMe@2026',
  req
}) {
  const normEmail = email.trim().toLowerCase();
  const normCode = employeeCode.trim().toUpperCase();

  // Check unique code & email
  const existingCode = await Employee.findOne({ employeeCode: normCode });
  if (existingCode) {
    const error = new Error(`Employee code '${normCode}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const existingEmail = await User.findOne({ email: normEmail });
  if (existingEmail) {
    const error = new Error(`User account for email '${normEmail}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  // Verify department & designation
  const dept = await Department.findById(departmentId);
  if (!dept) {
    const error = new Error('Specified Department does not exist.');
    error.statusCode = 404;
    throw error;
  }

  let desig = null;
  const mongoose = require('mongoose');
  if (designationId && mongoose.isValidObjectId(designationId)) {
    desig = await Designation.findById(designationId);
  }

  if (!desig) {
    const title = (req?.body?.designationTitle || req?.body?.designation || 'Staff Specialist').trim();
    desig = await Designation.findOne({ title: new RegExp(`^${title}$`, 'i'), department: dept._id });
    if (!desig) {
      desig = await Designation.create({ title, department: dept._id });
    }
  }

  const basic = Number(basicSalary);
  if (isNaN(basic) || basic <= 0) {
    const error = new Error('Basic salary must be greater than 0.');
    error.statusCode = 400;
    throw error;
  }

  // 1. Create Employee
  const employee = await Employee.create({
    employeeCode: normCode,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normEmail,
    phone: phone.trim(),
    address: address.trim(),
    gender,
    department: dept._id,
    designation: desig._id,
    dateOfJoining: new Date(dateOfJoining),
    salary: {
      basic,
      hra: Math.round(basic * 0.40),
      medical: Math.round(basic * 0.10),
      gross: Math.round(basic * 1.50)
    }
  });

  // 2. Create User login with temporary password and mustChangePassword = true
  const user = await User.create({
    email: normEmail,
    password: temporaryPassword,
    role: 'Employee',
    mustChangePassword: true,
    isActive: true,
    employee: employee._id
  });

  employee.user = user._id;
  await employee.save();

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'Employee',
    entityId: employee._id,
    details: `Employee registered: '${employee.firstName} ${employee.lastName}' (${employee.employeeCode}) with auto-generated login`,
    after: {
      employeeCode: employee.employeeCode,
      email: employee.email,
      department: dept.name,
      designation: desig.title,
      grossSalary: employee.salary.gross
    }
  });

  return {
    employee: await employee.populate(['department', 'designation']),
    temporaryPassword
  };
}

/**
 * List employees with search, department filtering, status filtering, and pagination
 */
async function listEmployees({
  search = '',
  departmentId = '',
  status = '',
  page = 1,
  limit = 20,
  sortBy = 'employeeCode',
  sortOrder = 'asc'
}) {
  const query = {};

  if (search && search.trim() !== '') {
    const regex = new RegExp(search.trim(), 'i');
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { employeeCode: regex },
      { email: regex }
    ];
  }

  if (departmentId && departmentId.trim() !== '') {
    query.department = departmentId;
  }

  if (status && status.trim() !== '') {
    query.status = status;
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [employees, total] = await Promise.all([
    Employee.find(query)
      .populate('department')
      .populate('designation')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Employee.countDocuments(query)
  ]);

  return {
    employees,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  };
}

/**
 * Employee 360 profile:
 * Personal details, job details, salary structure, leave balances, recent attendance, and payslips
 */
async function getEmployee360(employeeId, requestingUser) {
  const employee = await Employee.findById(employeeId)
    .populate('department')
    .populate('designation')
    .populate('user', 'email role isActive lastLogin');

  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  // Scope check: If employee is viewing, hide colleagues' 360
  if (requestingUser.role === 'Employee') {
    if (!requestingUser.employee || requestingUser.employee._id.toString() !== employee._id.toString()) {
      const error = new Error('Access denied: You may only view your own Employee 360 profile.');
      error.statusCode = 403;
      throw error;
    }
  }

  // 1. Leave balances
  const leaveTypes = await LeaveType.find({});
  const approvedLeaves = await LeaveRequest.find({
    employee: employee._id,
    status: 'approved'
  });

  const leaveBalances = leaveTypes.map(lt => {
    const used = approvedLeaves
      .filter(l => l.leaveTypeName.toLowerCase() === lt.name.toLowerCase())
      .reduce((acc, curr) => acc + (curr.workingDays || 0), 0);
    const quota = lt.yearlyQuota;
    return {
      type: lt.name,
      displayName: lt.displayName,
      quota,
      used,
      remaining: quota >= 9999 ? 'Unlimited' : Math.max(0, quota - used)
    };
  });

  // 2. Recent attendance (last 15 records)
  const recentAttendance = await Attendance.find({ employee: employee._id })
    .sort({ date: -1 })
    .limit(15);

  // 3. Payslips (latest 6)
  const recentPayslips = await Payslip.find({ employee: employee._id })
    .sort({ period: -1 })
    .limit(6);

  return {
    employee,
    leaveBalances,
    recentAttendance,
    recentPayslips
  };
}

/**
 * Update employee details
 * HR can edit job & salary; Employee can ONLY edit own phone and address
 */
async function updateEmployeeDetails(employeeId, updates, req) {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    const error = new Error('Employee not found.');
    error.statusCode = 404;
    throw error;
  }

  const isEmployeeRole = req.user.role === 'Employee';
  const before = employee.toObject();

  if (isEmployeeRole) {
    // Only phone and address permitted
    if (updates.phone !== undefined) employee.phone = updates.phone.trim();
    if (updates.address !== undefined) employee.address = updates.address.trim();
  } else {
    // HR / Admin
    if (updates.firstName) employee.firstName = updates.firstName.trim();
    if (updates.lastName) employee.lastName = updates.lastName.trim();
    if (updates.phone !== undefined) employee.phone = updates.phone.trim();
    if (updates.address !== undefined) employee.address = updates.address.trim();
    if (updates.gender) employee.gender = updates.gender;
    if (updates.departmentId) employee.department = updates.departmentId;
    if (updates.designationId) employee.designation = updates.designationId;
    if (updates.status) employee.status = updates.status;
    if (updates.dateOfExit !== undefined) employee.dateOfExit = updates.dateOfExit;

    if (updates.basicSalary !== undefined) {
      const basic = Number(updates.basicSalary);
      if (basic > 0) {
        employee.salary.basic = basic;
        employee.salary.hra = Math.round(basic * 0.40);
        employee.salary.medical = Math.round(basic * 0.10);
        employee.salary.gross = Math.round(basic * 1.50);
      }
    }
  }

  await employee.save();

  await recordAuditLog({
    req,
    action: 'UPDATE',
    entity: 'Employee',
    entityId: employee._id,
    details: `Updated employee profile '${employee.employeeCode}'`,
    before,
    after: employee.toObject()
  });

  return employee.populate(['department', 'designation']);
}

/**
 * Dry-run validation of CSV rows (HR only)
 */
async function dryRunCSV(rows) {
  return dryRunValidateEmployeeRows(rows);
}

/**
 * Bulk import valid employee rows from CSV
 */
async function importEmployeeRows(validRows, req) {
  const createdEmployees = [];

  for (const row of validRows) {
    // Verify designation exists or create default
    let desig = await Designation.findOne({
      title: new RegExp(`^${row.designationTitle}$`, 'i'),
      department: row.departmentId
    });

    if (!desig) {
      desig = await Designation.create({
        title: row.designationTitle || 'Specialist',
        department: row.departmentId
      });
    }

    const regResult = await registerEmployee({
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      address: row.address,
      gender: row.gender,
      departmentId: row.departmentId,
      designationId: desig._id,
      dateOfJoining: row.dateOfJoining,
      basicSalary: row.basicSalary,
      temporaryPassword: 'SaylaniEmployee@2026',
      req
    });

    createdEmployees.push(regResult.employee);
  }

  return {
    importedCount: createdEmployees.length,
    employees: createdEmployees
  };
}

module.exports = {
  registerEmployee,
  listEmployees,
  getEmployee360,
  updateEmployeeDetails,
  dryRunCSV,
  importEmployeeRows
};


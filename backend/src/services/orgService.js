const CompanySettings = require('../models/CompanySettings');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeaveType = require('../models/LeaveType');
const PublicHoliday = require('../models/PublicHoliday');
const { recordAuditLog } = require('./auditService');

/**
 * Get company settings
 */
async function getCompanySettings() {
  let settings = await CompanySettings.findOne();
  if (!settings) {
    settings = await CompanySettings.create({
      companyName: 'Saylani HCM Enterprise',
      officeHours: { start: '09:00', end: '18:00', graceMinutes: 15, halfDayHours: 5 },
      weekendDays: ['Saturday', 'Sunday'],
      officeLocation: { latitude: 24.8607, longitude: 67.0011, radiusMeters: 150, addressText: 'Saylani IT Park, Karachi' }
    });
  }
  return settings;
}

/**
 * Update company settings (Admin only)
 */
async function updateCompanySettings(updates, req) {
  let settings = await CompanySettings.findOne();
  const before = settings ? settings.toObject() : null;

  if (!settings) {
    settings = new CompanySettings(updates);
  } else {
    Object.assign(settings, updates);
  }

  await settings.save();

  await recordAuditLog({
    req,
    action: 'UPDATE',
    entity: 'CompanySettings',
    entityId: settings._id,
    details: 'Company settings and attendance parameters updated',
    before,
    after: settings.toObject()
  });

  return settings;
}

// ---------------- Department Operations ----------------
async function listDepartments() {
  return Department.find().sort({ name: 1 });
}

async function createDepartment({ name, code, description, req }) {
  const normalizedName = name.trim();
  const existing = await Department.findOne({ name: new RegExp(`^${normalizedName}$`, 'i') });
  if (existing) {
    const error = new Error(`Department '${normalizedName}' already exists.`);
    error.statusCode = 409;
    throw error;
  }

  const dept = await Department.create({
    name: normalizedName,
    code: code ? code.trim().toUpperCase() : normalizedName.slice(0, 3).toUpperCase(),
    description: description || ''
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'Department',
    entityId: dept._id,
    details: `Department created: '${dept.name}' (${dept.code})`,
    after: dept.toObject()
  });

  return dept;
}

// ---------------- Designation Operations ----------------
async function listDesignations(departmentId) {
  const query = departmentId ? { department: departmentId } : {};
  return Designation.find(query).populate('department').sort({ title: 1 });
}

async function createDesignation({ title, departmentId, req }) {
  const dept = await Department.findById(departmentId);
  if (!dept) {
    const error = new Error('Department not found.');
    error.statusCode = 404;
    throw error;
  }

  const desig = await Designation.create({
    title: title.trim(),
    department: dept._id
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'Designation',
    entityId: desig._id,
    details: `Designation created: '${desig.title}' in department '${dept.name}'`,
    after: desig.toObject()
  });

  return desig.populate('department');
}

// ---------------- Leave Types ----------------
async function listLeaveTypes() {
  return LeaveType.find().sort({ displayName: 1 });
}

async function updateLeaveTypeQuota(id, { yearlyQuota, isPaid, displayName, req }) {
  const lt = await LeaveType.findById(id);
  if (!lt) {
    const error = new Error('Leave type not found.');
    error.statusCode = 404;
    throw error;
  }

  const before = lt.toObject();
  if (yearlyQuota !== undefined) lt.yearlyQuota = Number(yearlyQuota);
  if (isPaid !== undefined) lt.isPaid = Boolean(isPaid);
  if (displayName) lt.displayName = displayName.trim();
  await lt.save();

  await recordAuditLog({
    req,
    action: 'UPDATE',
    entity: 'LeaveType',
    entityId: lt._id,
    details: `Leave type quota updated: '${lt.displayName}' (${lt.yearlyQuota} days)`,
    before,
    after: lt.toObject()
  });

  return lt;
}

// ---------------- Public Holidays ----------------
async function listPublicHolidays(year) {
  const query = year ? { year: Number(year) } : {};
  return PublicHoliday.find(query).sort({ date: 1 });
}

async function addPublicHoliday({ name, date, req }) {
  const holidayYear = new Date(date).getFullYear();
  const existing = await PublicHoliday.findOne({ date });
  if (existing) {
    const error = new Error(`Holiday already exists for date '${date}'.`);
    error.statusCode = 409;
    throw error;
  }

  const holiday = await PublicHoliday.create({
    name: name.trim(),
    date,
    year: holidayYear
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'PublicHoliday',
    entityId: holiday._id,
    details: `Public holiday added: '${holiday.name}' on ${holiday.date}`,
    after: holiday.toObject()
  });

  return holiday;
}

async function deletePublicHoliday(id, req) {
  const holiday = await PublicHoliday.findById(id);
  if (!holiday) {
    const error = new Error('Public holiday not found.');
    error.statusCode = 404;
    throw error;
  }

  const before = holiday.toObject();
  await holiday.deleteOne();

  await recordAuditLog({
    req,
    action: 'DELETE',
    entity: 'PublicHoliday',
    entityId: id,
    details: `Public holiday deleted: '${holiday.name}' on ${holiday.date}`,
    before
  });

  return { message: 'Public holiday removed.' };
}

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  listDepartments,
  createDepartment,
  listDesignations,
  createDesignation,
  listLeaveTypes,
  updateLeaveTypeQuota,
  listPublicHolidays,
  addPublicHoliday,
  deletePublicHoliday
};


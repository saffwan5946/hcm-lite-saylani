const orgService = require('../services/orgService');

const getSettings = async (req, res, next) => {
  try {
    const settings = await orgService.getCompanySettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const updated = await orgService.updateCompanySettings(req.body, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const getDepartments = async (req, res, next) => {
  try {
    const departments = await orgService.listDepartments();
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required.' });
    const dept = await orgService.createDepartment({ name, code, description, req });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
};

const getDesignations = async (req, res, next) => {
  try {
    const designations = await orgService.listDesignations(req.query.departmentId);
    res.json({ success: true, data: designations });
  } catch (err) {
    next(err);
  }
};

const createDesignation = async (req, res, next) => {
  try {
    const { title, departmentId } = req.body;
    if (!title || !departmentId) {
      return res.status(400).json({ success: false, message: 'Title and departmentId are required.' });
    }
    const desig = await orgService.createDesignation({ title, departmentId, req });
    res.status(201).json({ success: true, data: desig });
  } catch (err) {
    next(err);
  }
};

const getLeaveTypes = async (req, res, next) => {
  try {
    const types = await orgService.listLeaveTypes();
    res.json({ success: true, data: types });
  } catch (err) {
    next(err);
  }
};

const updateLeaveType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updated = await orgService.updateLeaveTypeQuota(id, req.body, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const getHolidays = async (req, res, next) => {
  try {
    const holidays = await orgService.listPublicHolidays(req.query.year);
    res.json({ success: true, data: holidays });
  } catch (err) {
    next(err);
  }
};

const addHoliday = async (req, res, next) => {
  try {
    const { name, date } = req.body;
    if (!name || !date) return res.status(400).json({ success: false, message: 'Name and date are required.' });
    const holiday = await orgService.addPublicHoliday({ name, date, req });
    res.status(201).json({ success: true, data: holiday });
  } catch (err) {
    next(err);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    const result = await orgService.deletePublicHoliday(req.params.id, req);
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  getDepartments,
  createDepartment,
  getDesignations,
  createDesignation,
  getLeaveTypes,
  updateLeaveType,
  getHolidays,
  addHoliday,
  deleteHoliday
};


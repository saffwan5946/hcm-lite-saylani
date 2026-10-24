const employeeService = require('../services/employeeService');

const register = async (req, res, next) => {
  try {
    const result = await employeeService.registerEmployee({
      ...req.body,
      req
    });
    res.status(201).json({
      success: true,
      message: 'Employee registered successfully and user login created.',
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const list = async (req, res, next) => {
  try {
    const data = await employeeService.listEmployees(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const get360 = async (req, res, next) => {
  try {
    const data = await employeeService.getEmployee360(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const updated = await employeeService.updateEmployeeDetails(req.params.id, req.body, req);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

const csvDryRun = async (req, res, next) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, message: 'Expected an array of rows.' });
    }
    const report = await employeeService.dryRunCSV(rows);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

const csvImport = async (req, res, next) => {
  try {
    const { validRows } = req.body;
    if (!Array.isArray(validRows) || validRows.length === 0) {
      return res.status(400).json({ success: false, message: 'validRows array must not be empty.' });
    }
    const result = await employeeService.importEmployeeRows(validRows, req);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  list,
  get360,
  update,
  csvDryRun,
  csvImport
};


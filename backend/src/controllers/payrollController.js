const payrollService = require('../services/payrollService');
const orgService = require('../services/orgService');
const { generatePayslipPDF } = require('../services/pdfService');

const createDraft = async (req, res, next) => {
  try {
    const { year, month } = req.body;
    if (!year || !month) {
      return res.status(400).json({ success: false, message: 'Year and month are required.' });
    }

    const result = await payrollService.generateMonthlyPayrollDraft({
      year: Number(year),
      month: Number(month),
      req
    });

    res.status(201).json({
      success: true,
      message: `Payroll draft generated for ${result.payrollRun.period} (${result.payslipsCount} payslips)`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const finalize = async (req, res, next) => {
  try {
    const { period } = req.body;
    if (!period) return res.status(400).json({ success: false, message: 'Period is required.' });

    const result = await payrollService.finalizeMonthlyPayroll({ period, req });
    res.json({
      success: true,
      message: `Payroll for period ${period} finalized and locked.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getRun = async (req, res, next) => {
  try {
    const data = await payrollService.getPayrollRun(req.params.period);
    if (!data) return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const listRuns = async (req, res, next) => {
  try {
    const runs = await payrollService.listPayrollRuns();
    res.json({ success: true, data: runs });
  } catch (err) {
    next(err);
  }
};

const getPayslip = async (req, res, next) => {
  try {
    const payslip = await payrollService.getPayslipById(req.params.id);
    if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found.' });

    // Scope check: employee can only see own payslip
    if (req.user.role === 'Employee' && payslip.employee._id.toString() !== req.user.employee?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own payslip.' });
    }

    res.json({ success: true, data: payslip });
  } catch (err) {
    next(err);
  }
};

const downloadPayslipPDF = async (req, res, next) => {
  try {
    const payslip = await payrollService.getPayslipById(req.params.id);
    if (!payslip) return res.status(404).json({ success: false, message: 'Payslip not found.' });

    // Scope check
    if (req.user.role === 'Employee' && payslip.employee._id.toString() !== req.user.employee?._id?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only download your own payslip.' });
    }

    const company = await orgService.getCompanySettings();
    generatePayslipPDF(payslip, company, payslip.employee, res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDraft,
  finalize,
  getRun,
  listRuns,
  getPayslip,
  downloadPayslipPDF
};


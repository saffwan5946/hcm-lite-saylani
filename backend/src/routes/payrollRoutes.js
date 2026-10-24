const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/draft', authenticate, authorize('HR'), payrollController.createDraft);
router.post('/finalize', authenticate, authorize('Admin'), payrollController.finalize);
router.get('/runs', authenticate, authorize('Admin', 'HR'), payrollController.listRuns);
router.get('/runs/:period', authenticate, authorize('Admin', 'HR'), payrollController.getRun);
router.get('/payslip/:id', authenticate, payrollController.getPayslip);
router.get('/payslip/:id/pdf', authenticate, payrollController.downloadPayslipPDF);

module.exports = router;


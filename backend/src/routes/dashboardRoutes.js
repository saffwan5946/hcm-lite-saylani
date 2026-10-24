const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/hr', authenticate, authorize('HR'), dashboardController.getHRDashboard);
router.get('/admin', authenticate, authorize('Admin'), dashboardController.getAdminDashboard);
router.get('/employee', authenticate, dashboardController.getEmployeeDashboard);

module.exports = router;


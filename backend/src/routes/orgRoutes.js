const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');
const { authenticate, authorize } = require('../middleware/auth');

// Company settings (Admin manage, HR view)
router.get('/settings', authenticate, orgController.getSettings);
router.put('/settings', authenticate, authorize('Admin'), orgController.updateSettings);

// Departments
router.get('/departments', authenticate, orgController.getDepartments);
router.post('/departments', authenticate, authorize('Admin'), orgController.createDepartment);

// Designations
router.get('/designations', authenticate, orgController.getDesignations);
router.post('/designations', authenticate, authorize('Admin'), orgController.createDesignation);

// Leave Types & Quotas
router.get('/leave-types', authenticate, orgController.getLeaveTypes);
router.put('/leave-types/:id', authenticate, authorize('Admin'), orgController.updateLeaveType);

// Public Holidays
router.get('/holidays', authenticate, orgController.getHolidays);
router.post('/holidays', authenticate, authorize('Admin'), orgController.addHoliday);
router.delete('/holidays/:id', authenticate, authorize('Admin'), orgController.deleteHoliday);

module.exports = router;


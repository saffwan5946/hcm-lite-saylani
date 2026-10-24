const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate, authorize, scopeGuard } = require('../middleware/auth');

router.get('/', authenticate, employeeController.list);
router.post('/register', authenticate, authorize('HR'), employeeController.register);
router.get('/:id/360', authenticate, scopeGuard('id'), employeeController.get360);
router.patch('/:id', authenticate, scopeGuard('id'), employeeController.update);

// CSV Bulk Import & Dry-run
router.post('/csv/dry-run', authenticate, authorize('HR'), employeeController.csvDryRun);
router.post('/csv/import', authenticate, authorize('HR'), employeeController.csvImport);

module.exports = router;


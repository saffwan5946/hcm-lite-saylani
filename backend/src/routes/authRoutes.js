const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/status', authController.getStatus);
router.post('/setup', authController.setupFirstRun);
router.post('/login', authController.login);
router.post('/change-password', authenticate, authController.changePassword);
router.get('/me', authenticate, authController.getMe);

// Admin user administration
router.post('/hr', authenticate, authorize('Admin'), authController.createHR);
router.patch('/users/:userId', authenticate, authorize('Admin'), authController.manageUser);

module.exports = router;


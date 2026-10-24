const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/check-in', authenticate, attendanceController.checkIn);
router.post('/check-out', authenticate, attendanceController.checkOut);
router.get('/board', authenticate, authorize('Admin', 'HR'), attendanceController.getBoard);

// Attendance corrections
router.post('/correction', authenticate, attendanceController.requestCorrection);
router.patch('/correction/:id/review', authenticate, authorize('HR'), attendanceController.reviewCorrection);

module.exports = router;


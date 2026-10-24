const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const orgRoutes = require('./orgRoutes');
const employeeRoutes = require('./employeeRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const leaveRoutes = require('./leaveRoutes');
const payrollRoutes = require('./payrollRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const aiRoutes = require('./aiRoutes');
const commsRoutes = require('./commsRoutes');

router.use('/auth', authRoutes);
router.use('/org', orgRoutes);
router.use('/employees', employeeRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ai', aiRoutes);
router.use('/comms', commsRoutes);

module.exports = router;


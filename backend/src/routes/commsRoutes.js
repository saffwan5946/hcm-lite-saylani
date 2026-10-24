const express = require('express');
const router = express.Router();
const commsController = require('../controllers/commsController');
const { authenticate, authorize } = require('../middleware/auth');

// Announcements
router.get('/announcements', authenticate, commsController.getAnnouncements);
router.post('/announcements', authenticate, authorize('Admin', 'HR'), commsController.postAnnouncement);

// In-app Notifications
router.get('/notifications', authenticate, commsController.getNotifications);
router.patch('/notifications/:id/read', authenticate, commsController.markNotificationRead);

// Audit logs (Admin only)
router.get('/audit-logs', authenticate, authorize('Admin'), commsController.getAuditLogs);

module.exports = router;


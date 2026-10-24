const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { recordAuditLog } = require('./auditService');

/**
 * Post an announcement (Admin & HR)
 */
async function postAnnouncement({ title, content, priority = 'normal', targetRole = 'all', req }) {
  const authorName = req.user.role === 'Admin' ? 'Management (Admin)' : 'HR Operations';

  const announcement = await Announcement.create({
    title: title.trim(),
    content: content.trim(),
    priority,
    author: req.user._id,
    authorName,
    targetRole
  });

  await recordAuditLog({
    req,
    action: 'CREATE',
    entity: 'Announcement',
    entityId: announcement._id,
    details: `Announcement posted: '${announcement.title}' (Priority: ${priority}, Target: ${targetRole})`,
    after: { title, priority, targetRole }
  });

  return announcement;
}

/**
 * List announcements
 */
async function listAnnouncements(userRole) {
  const query = userRole === 'Admin' 
    ? {} 
    : { targetRole: { $in: ['all', userRole] } };

  return Announcement.find(query).sort({ createdAt: -1 }).limit(20);
}

/**
 * List user notifications
 */
async function listUserNotifications(userId) {
  return Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(30);
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );
}

/**
 * Create a notification for a user
 */
async function sendNotification({ recipientId, title, message, type = 'general', link = '' }) {
  return Notification.create({
    recipient: recipientId,
    title,
    message,
    type,
    link
  });
}

/**
 * Query Audit Logs (Admin only)
 */
async function listAuditLogs({ action, entity, page = 1, limit = 50 }) {
  const query = {};
  if (action) query.action = action;
  if (entity) query.entity = entity;

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(query)
  ]);

  return {
    logs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    }
  };
}

module.exports = {
  postAnnouncement,
  listAnnouncements,
  listUserNotifications,
  markNotificationAsRead,
  sendNotification,
  listAuditLogs
};


const commsService = require('../services/commsService');

const postAnnouncement = async (req, res, next) => {
  try {
    const { title, content, priority, targetRole } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const item = await commsService.postAnnouncement({
      title,
      content,
      priority,
      targetRole,
      req
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const getAnnouncements = async (req, res, next) => {
  try {
    const items = await commsService.listAnnouncements(req.user.role);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const items = await commsService.listUserNotifications(req.user._id);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const item = await commsService.markNotificationAsRead(req.params.id, req.user._id);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const data = await commsService.listAuditLogs(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  postAnnouncement,
  getAnnouncements,
  getNotifications,
  markNotificationRead,
  getAuditLogs
};


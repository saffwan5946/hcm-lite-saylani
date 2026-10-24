const AuditLog = require('../models/AuditLog');

/**
 * Service to record immutable audit log entries
 * @param {Object} params
 * @param {Object} params.req - Express req object for actor context & IP
 * @param {string} params.action - 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'FINALIZE' | 'LOGIN' | 'PASSWORD_RESET'
 * @param {string} params.entity - 'User' | 'Employee' | 'Attendance' | 'LeaveRequest' | 'PayrollRun' | 'CompanySettings' | 'Department'
 * @param {string} params.entityId - ID of entity affected
 * @param {string} [params.details] - Human-readable summary
 * @param {Object} [params.before] - State before change
 * @param {Object} [params.after] - State after change
 */
async function recordAuditLog({ req, action, entity, entityId = null, details = '', before = null, after = null }) {
  try {
    const actorId = req && req.user ? req.user._id : null;
    const actorEmail = req && req.user ? req.user.email : 'system@hcmlite.internal';
    const actorRole = req && req.user ? req.user.role : 'System';
    const ipAddress = (req && req.headers && (req.headers['x-forwarded-for'] || req.socket?.remoteAddress)) || '127.0.0.1';

    // Strip sensitive passwords from before/after snapshots
    const sanitize = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      const clone = JSON.parse(JSON.stringify(obj));
      if (clone.password) delete clone.password;
      return clone;
    };

    await AuditLog.create({
      actor: actorId,
      actorEmail,
      actorRole,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      details,
      before: sanitize(before),
      after: sanitize(after),
      ipAddress
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { recordAuditLog };


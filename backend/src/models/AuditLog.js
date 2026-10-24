const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  actorEmail: {
    type: String,
    required: true
  },
  actorRole: {
    type: String,
    required: true
  },
  action: {
    type: String, // 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'FINALIZE', 'LOGIN', 'PASSWORD_RESET'
    required: true
  },
  entity: {
    type: String, // 'User', 'Employee', 'Attendance', 'LeaveRequest', 'PayrollRun', 'CompanySettings', 'Department'
    required: true
  },
  entityId: {
    type: String,
    default: null
  },
  details: {
    type: String,
    default: ''
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Immutable - cannot be updated
});

module.exports = mongoose.model('AuditLog', auditLogSchema);


const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: [
      'CREATE', 'READ', 'UPDATE', 'DELETE',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'APPROVE', 'REJECT', 'SUBMIT',
      'EXPORT', 'IMPORT', 'BACKUP', 'RESTORE'
    ]
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    enum: [
      'User', 'Department', 'Team', 'Leave', 'Attendance', 
      'Payroll', 'Job', 'Performance', 'Training', 'SystemSettings'
    ]
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: String,
    trim: true,
    maxlength: [1000, 'Details cannot exceed 1000 characters']
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    trim: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'LOW'
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED', 'WARNING'],
    default: 'SUCCESS'
  },
  errorMessage: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ resourceId: 1 });
auditLogSchema.index({ severity: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log activity
auditLogSchema.statics.logActivity = async function(logData) {
  try {
    const auditLog = new this(logData);
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

// Static method to get user activity
auditLogSchema.statics.getUserActivity = function(userId, limit = 50) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'firstName lastName email');
};

// Static method to get resource activity
auditLogSchema.statics.getResourceActivity = function(resource, resourceId, limit = 50) {
  return this.find({ resource, resourceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'firstName lastName email');
};

// Static method to get security events
auditLogSchema.statics.getSecurityEvents = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    createdAt: { $gte: startDate },
    $or: [
      { action: { $in: ['LOGIN_FAILED', 'LOGOUT'] } },
      { severity: { $in: ['HIGH', 'CRITICAL'] } },
      { status: 'FAILED' }
    ]
  }).sort({ createdAt: -1 })
    .populate('user', 'firstName lastName email');
};

// Transform output
auditLogSchema.methods.toJSON = function() {
  const auditLogObject = this.toObject();
  return auditLogObject;
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

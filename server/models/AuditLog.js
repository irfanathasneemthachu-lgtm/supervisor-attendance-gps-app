const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // User Info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userType',
    required: true
  },
  userType: {
    type: String,
    enum: ['Supervisor', 'Admin'],
    required: true
  },
  userName: String,
  
  // Action
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'CLOCK_IN',
      'CLOCK_OUT',
      'CLOCK_IN_OUTSIDE_LOCATION',
      'CLOCK_OUT_OUTSIDE_LOCATION',
      'VIEW_ATTENDANCE',
      'EXPORT_REPORT',
      'CREATE_SUPERVISOR',
      'UPDATE_SUPERVISOR',
      'DELETE_SUPERVISOR',
      'CREATE_WORKPLACE',
      'UPDATE_WORKPLACE',
      'DELETE_WORKPLACE'
    ],
    index: true
  },
  
  // Related Data
  entityId: mongoose.Schema.Types.ObjectId,
  entityType: String,
  changes: mongoose.Schema.Types.Mixed,
  
  // GPS Data (for tracking)
  ipAddress: String,
  userAgent: String,
  latitude: Number,
  longitude: Number,
  accuracy: Number,
  
  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    immutable: true
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

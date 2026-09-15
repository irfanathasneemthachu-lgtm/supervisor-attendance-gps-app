const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientType',
    required: true
  },
  recipientType: {
    type: String,
    enum: ['Supervisor', 'Admin'],
    required: true
  },
  
  // Notification Details
  type: {
    type: String,
    enum: [
      'CLOCK_IN_SUCCESS',
      'CLOCK_OUT_SUCCESS',
      'LATE_ARRIVAL',
      'CLOCK_IN_OUTSIDE_LOCATION',
      'CLOCK_OUT_OUTSIDE_LOCATION',
      'LOCATION_PERMISSION_DISABLED',
      'GPS_UNAVAILABLE',
      'MISSING_CLOCK_OUT',
      'SUPERVISOR_ABSENT',
      'MULTIPLE_CLOCK_INS'
    ],
    required: true,
    index: true
  },
  title: String,
  message: String,
  
  // Related Data
  attendanceId: mongoose.Schema.Types.ObjectId,
  supervisorId: mongoose.Schema.Types.ObjectId,
  
  // Status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
    immutable: true
  }
});

module.exports = mongoose.model('Notification', notificationSchema);

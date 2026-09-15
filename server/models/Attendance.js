const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  // Supervisor Info
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supervisor',
    required: true,
    index: true
  },
  supervisorName: String,
  employeeId: String,
  
  // Workplace Info
  workplace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workplace',
    required: true,
    index: true
  },
  workplaceName: String,
  
  // Date
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Clock-In Record
  clockInTime: Date,
  clockInLatitude: Number,
  clockInLongitude: Number,
  clockInAccuracy: Number,
  clockInDistanceFromWorkplace: Number,
  clockInLocationVerified: Boolean,
  clockInServerTimestamp: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  // Clock-Out Record
  clockOutTime: Date,
  clockOutLatitude: Number,
  clockOutLongitude: Number,
  clockOutAccuracy: Number,
  clockOutDistanceFromWorkplace: Number,
  clockOutLocationVerified: Boolean,
  clockOutServerTimestamp: Date,
  
  // Calculated Values
  totalWorkingHours: Number,
  totalWorkingMinutes: Number,
  
  // Status
  status: {
    type: String,
    enum: [
      'NOT_CLOCKED_IN',
      'CLOCKED_IN',
      'CLOCKED_OUT',
      'ABSENT',
      'LATE',
      'OUTSIDE_LOCATION_CLOCK_IN',
      'OUTSIDE_LOCATION_CLOCK_OUT'
    ],
    default: 'NOT_CLOCKED_IN',
    index: true
  },
  
  // Notes (for admin)
  adminNotes: String,
  
  // Audit Trail
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate clock-ins
attendanceSchema.index({ supervisor: 1, date: 1 }, { unique: true });

// Prevent modification of GPS coordinates
attendanceSchema.pre('findByIdAndUpdate', function(next) {
  const update = this.getUpdate();
  
  const restrictedFields = [
    'clockInLatitude', 'clockInLongitude',
    'clockOutLatitude', 'clockOutLongitude',
    'clockInServerTimestamp', 'clockOutServerTimestamp',
    'clockInTime', 'clockOutTime'
  ];
  
  restrictedFields.forEach(field => {
    if (update[field] !== undefined) {
      throw new Error(`Cannot modify ${field}`);
    }
  });
  
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);

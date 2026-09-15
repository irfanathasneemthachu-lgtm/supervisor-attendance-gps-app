const mongoose = require('mongoose');

const workplaceSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  
  // GPS Coordinates
  latitude: {
    type: Number,
    required: true,
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,
    min: -180,
    max: 180
  },
  
  // Geofence Configuration
  geofenceRadius: {
    type: Number,
    required: true,
    default: 100,
    min: 10,
    max: 1000,
    description: 'Radius in meters'
  },
  
  // Clock-in Settings
  allowOutsideClockIn: {
    type: Boolean,
    default: false,
    description: 'If false, clock-in is blocked outside geofence. If true, it is allowed but flagged.'
  },
  
  // Assigned Supervisors
  assignedSupervisors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supervisor'
  }],
  
  // Default Working Hours
  defaultWorkingHours: {
    start: {
      type: String,
      default: '09:00'
    },
    end: {
      type: String,
      default: '17:00'
    }
  },
  
  // Admin Info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.module = mongoose.model('Workplace', workplaceSchema);

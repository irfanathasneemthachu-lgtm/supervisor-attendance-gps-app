const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Attendance = require('../models/Attendance');
const Supervisor = require('../models/Supervisor');
const Workplace = require('../models/Workplace');
const { 
  calculateDistance, 
  isWithinGeofence, 
  createAuditLog, 
  createNotification,
  validateGPSCoordinates,
  calculateWorkingHours
} = require('../utils/locationHelper');

const GEOFENCE_RADIUS = parseInt(process.env.GEOFENCE_RADIUS) || 100;

/**
 * Clock In - POST /api/attendance/clock-in
 */
router.post('/clock-in', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const supervisorId = req.user.userId;
    
    // Validate GPS coordinates
    if (!validateGPSCoordinates(latitude, longitude, accuracy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GPS coordinates'
      });
    }
    
    // Get supervisor with workplace
    const supervisor = await Supervisor.findById(supervisorId).populate('assignedWorkplace');
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found'
      });
    }
    
    if (!supervisor.assignedWorkplace) {
      return res.status(400).json({
        success: false,
        message: 'No workplace assigned'
      });
    }
    
    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingAttendance = await Attendance.findOne({
      supervisor: supervisorId,
      date: { $gte: today }
    });
    
    if (existingAttendance && existingAttendance.clockInTime) {
      return res.status(409).json({
        success: false,
        message: 'Already clocked in today. Please clock out first.'
      });
    }
    
    const workplace = supervisor.assignedWorkplace;
    
    // Calculate distance
    const distance = calculateDistance(
      latitude,
      longitude,
      workplace.latitude,
      workplace.longitude
    );
    
    // Check if within geofence
    const isVerified = isWithinGeofence(
      latitude,
      longitude,
      workplace.latitude,
      workplace.longitude,
      workplace.geofenceRadius
    );
    
    // Check if clock-in outside location is allowed
    if (!isVerified && !workplace.allowOutsideClockIn) {
      await createAuditLog(
        supervisorId,
        'Supervisor',
        'CLOCK_IN_OUTSIDE_LOCATION',
        null,
        null,
        { distance, latitude, longitude },
        req.ip,
        req.headers['user-agent']
      );
      
      await createNotification(
        supervisorId,
        'Supervisor',
        'CLOCK_IN_OUTSIDE_LOCATION',
        '⚠️ Clock-In Outside Location',
        `Your clock-in location (${distance}m away) is outside the permitted workplace area.`,
        null,
        supervisorId
      );
      
      return res.status(403).json({
        success: false,
        message: 'Clock-in blocked: You are outside the assigned workplace',
        distance,
        requiresApproval: false
      });
    }
    
    // Create or update attendance record
    let attendance = existingAttendance;
    
    if (!attendance) {
      attendance = new Attendance({
        supervisor: supervisorId,
        supervisorName: supervisor.getFullName(),
        employeeId: supervisor.employeeId,
        workplace: workplace._id,
        workplaceName: workplace.name,
        date: today
      });
    }
    
    // Set clock-in data
    attendance.clockInTime = new Date();
    attendance.clockInLatitude = latitude;
    attendance.clockInLongitude = longitude;
    attendance.clockInAccuracy = accuracy;
    attendance.clockInDistanceFromWorkplace = distance;
    attendance.clockInLocationVerified = isVerified;
    attendance.clockInServerTimestamp = new Date();
    
    if (isVerified) {
      attendance.status = 'CLOCKED_IN';
    } else {
      attendance.status = 'OUTSIDE_LOCATION_CLOCK_IN';
    }
    
    await attendance.save();
    
    // Create audit log
    await createAuditLog(
      supervisorId,
      'Supervisor',
      'CLOCK_IN',
      attendance._id,
      'Attendance',
      { distance, latitude, longitude, verified: isVerified },
      req.ip,
      req.headers['user-agent']
    );
    
    // Create success notification
    await createNotification(
      supervisorId,
      'Supervisor',
      'CLOCK_IN_SUCCESS',
      '✅ Clock-In Successful',
      `Clocked in at ${attendance.clockInTime.toLocaleTimeString()} - Location ${isVerified ? 'Verified' : 'Outside Area'}`,
      attendance._id,
      supervisorId
    );
    
    res.json({
      success: true,
      message: isVerified ? '✅ Location Verified' : '⚠️ Outside Assigned Location',
      attendance: {
        _id: attendance._id,
        clockInTime: attendance.clockInTime,
        distance,
        verified: isVerified,
        accuracy
      }
    });
  } catch (error) {
    console.error('Clock-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Clock-in failed',
      error: error.message
    });
  }
});

/**
 * Clock Out - POST /api/attendance/clock-out
 */
router.post('/clock-out', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const supervisorId = req.user.userId;
    
    // Validate GPS coordinates
    if (!validateGPSCoordinates(latitude, longitude, accuracy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GPS coordinates'
      });
    }
    
    // Get supervisor
    const supervisor = await Supervisor.findById(supervisorId).populate('assignedWorkplace');
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found'
      });
    }
    
    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      supervisor: supervisorId,
      date: { $gte: today }
    }).populate('workplace');
    
    if (!attendance || !attendance.clockInTime) {
      return res.status(400).json({
        success: false,
        message: 'Not clocked in today'
      });
    }
    
    if (attendance.clockOutTime) {
      return res.status(409).json({
        success: false,
        message: 'Already clocked out today'
      });
    }
    
    const workplace = attendance.workplace;
    
    // Calculate distance from NEW location (not reusing clock-in)
    const distance = calculateDistance(
      latitude,
      longitude,
      workplace.latitude,
      workplace.longitude
    );
    
    // Check if within geofence
    const isVerified = isWithinGeofence(
      latitude,
      longitude,
      workplace.latitude,
      workplace.longitude,
      workplace.geofenceRadius
    );
    
    // Set clock-out data
    attendance.clockOutTime = new Date();
    attendance.clockOutLatitude = latitude;
    attendance.clockOutLongitude = longitude;
    attendance.clockOutAccuracy = accuracy;
    attendance.clockOutDistanceFromWorkplace = distance;
    attendance.clockOutLocationVerified = isVerified;
    attendance.clockOutServerTimestamp = new Date();
    
    // Calculate working hours
    const workingHours = calculateWorkingHours(attendance.clockInTime, attendance.clockOutTime);
    attendance.totalWorkingHours = workingHours.hours;
    attendance.totalWorkingMinutes = workingHours.totalMinutes;
    
    // Set final status
    if (attendance.clockInLocationVerified && isVerified) {
      attendance.status = 'CLOCKED_OUT';
    } else if (!isVerified) {
      attendance.status = 'OUTSIDE_LOCATION_CLOCK_OUT';
    }
    
    await attendance.save();
    
    // Create audit log
    await createAuditLog(
      supervisorId,
      'Supervisor',
      'CLOCK_OUT',
      attendance._id,
      'Attendance',
      { distance, latitude, longitude, verified: isVerified, workingHours: workingHours.formatted },
      req.ip,
      req.headers['user-agent']
    );
    
    // Create success notification
    await createNotification(
      supervisorId,
      'Supervisor',
      'CLOCK_OUT_SUCCESS',
      '✅ Clock-Out Successful',
      `Clocked out at ${attendance.clockOutTime.toLocaleTimeString()} - Total Hours: ${workingHours.formatted}`,
      attendance._id,
      supervisorId
    );
    
    res.json({
      success: true,
      message: 'Attendance completed',
      attendance: {
        _id: attendance._id,
        clockInTime: attendance.clockInTime,
        clockOutTime: attendance.clockOutTime,
        distance,
        verified: isVerified,
        totalWorkingHours: workingHours.formatted,
        clockInVerified: attendance.clockInLocationVerified
      }
    });
  } catch (error) {
    console.error('Clock-out error:', error);
    res.status(500).json({
      success: false,
      message: 'Clock-out failed',
      error: error.message
    });
  }
});

/**
 * Get Today's Attendance
 */
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const supervisorId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      supervisor: supervisorId,
      date: { $gte: today }
    }).populate('workplace');
    
    if (!attendance) {
      return res.json({
        success: true,
        message: 'Not clocked in today',
        attendance: null,
        status: 'NOT_CLOCKED_IN'
      });
    }
    
    res.json({
      success: true,
      attendance,
      status: attendance.status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance',
      error: error.message
    });
  }
});

/**
 * Get Attendance History
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const supervisorId = req.user.userId;
    const { startDate, endDate, limit = 30 } = req.query;
    
    let query = { supervisor: supervisorId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const attendance = await Attendance.find(query)
      .populate('workplace')
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      count: attendance.length,
      attendance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance history',
      error: error.message
    });
  }
});

module.exports = router;

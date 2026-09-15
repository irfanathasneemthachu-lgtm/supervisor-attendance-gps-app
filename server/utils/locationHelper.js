const geolib = require('geolib');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

/**
 * Calculate distance between two GPS points in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  return geolib.getDistance(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 }
  );
};

/**
 * Check if location is within geofence
 */
const isWithinGeofence = (supervisorLat, supervisorLon, workplaceLat, workplaceLon, radius) => {
  const distance = calculateDistance(supervisorLat, supervisorLon, workplaceLat, workplaceLon);
  return distance <= radius;
};

/**
 * Create audit log entry
 */
const createAuditLog = async (userId, userType, action, entityId, entityType, changes, ipAddress, userAgent) => {
  try {
    const auditLog = new AuditLog({
      userId,
      userType,
      action,
      entityId,
      entityType,
      changes,
      ipAddress,
      userAgent,
      timestamp: new Date()
    });
    
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

/**
 * Create notification
 */
const createNotification = async (recipientId, recipientType, notificationType, title, message, attendanceId = null, supervisorId = null) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      recipientType,
      type: notificationType,
      title,
      message,
      attendanceId,
      supervisorId,
      isRead: false,
      createdAt: new Date()
    });
    
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Calculate working hours between two times
 */
const calculateWorkingHours = (clockInTime, clockOutTime) => {
  if (!clockInTime || !clockOutTime) return null;
  
  const inTime = new Date(clockInTime);
  const outTime = new Date(clockOutTime);
  
  const diffMs = outTime - inTime;
  const diffMins = Math.floor(diffMs / 60000);
  
  const hours = Math.floor(diffMins / 60);
  const minutes = diffMins % 60;
  
  return {
    totalMinutes: diffMins,
    hours,
    minutes,
    formatted: `${hours}h ${minutes}m`
  };
};

/**
 * Format location verification status
 */
const formatLocationStatus = (isVerified, distance) => {
  if (isVerified === null || isVerified === undefined) {
    return 'UNKNOWN';
  }
  return isVerified ? 'VERIFIED' : 'OUTSIDE_LOCATION';
};

/**
 * Validate GPS coordinates
 */
const validateGPSCoordinates = (latitude, longitude, accuracy) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  if (accuracy && accuracy < 0) {
    return false;
  }
  return true;
};

module.exports = {
  calculateDistance,
  isWithinGeofence,
  createAuditLog,
  createNotification,
  calculateWorkingHours,
  formatLocationStatus,
  validateGPSCoordinates
};

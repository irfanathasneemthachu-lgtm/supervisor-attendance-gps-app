const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Supervisor = require('../models/Supervisor');
const Workplace = require('../models/Workplace');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { createAuditLog } = require('../utils/locationHelper');
const bcrypt = require('bcryptjs');

/**
 * GET All Attendance Records with Filters
 */
router.get('/attendance', async (req, res) => {
  try {
    const { supervisor, workplace, status, startDate, endDate, limit = 50, page = 1 } = req.query;
    
    let query = {};
    
    if (supervisor) query.supervisor = supervisor;
    if (workplace) query.workplace = workplace;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const records = await Attendance.find(query)
      .populate('supervisor', 'firstName lastName employeeId')
      .populate('workplace', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Attendance.countDocuments(query);
    
    res.json({
      success: true,
      count: records.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records',
      error: error.message
    });
  }
});

/**
 * GET Single Attendance Record with Map Data
 */
router.get('/attendance/:id', async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id)
      .populate('supervisor', 'firstName lastName employeeId')
      .populate('workplace');
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }
    
    res.json({
      success: true,
      record,
      mapData: {
        workplace: {
          lat: record.workplace.latitude,
          lon: record.workplace.longitude,
          name: record.workplace.name,
          radius: record.workplace.geofenceRadius
        },
        clockIn: {
          lat: record.clockInLatitude,
          lon: record.clockInLongitude,
          time: record.clockInTime,
          verified: record.clockInLocationVerified,
          distance: record.clockInDistanceFromWorkplace
        },
        clockOut: record.clockOutLatitude ? {
          lat: record.clockOutLatitude,
          lon: record.clockOutLongitude,
          time: record.clockOutTime,
          verified: record.clockOutLocationVerified,
          distance: record.clockOutDistanceFromWorkplace
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance record',
      error: error.message
    });
  }
});

/**
 * GET All Supervisors
 */
router.get('/supervisors', async (req, res) => {
  try {
    const { workplace, isActive = true, limit = 50, page = 1 } = req.query;
    
    let query = { isActive: isActive === 'true' };
    if (workplace) query.assignedWorkplace = workplace;
    
    const skip = (page - 1) * limit;
    
    const supervisors = await Supervisor.find(query)
      .populate('assignedWorkplace')
      .sort({ firstName: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Supervisor.countDocuments(query);
    
    res.json({
      success: true,
      count: supervisors.length,
      total,
      supervisors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supervisors',
      error: error.message
    });
  }
});

/**
 * POST Create Supervisor
 */
router.post('/supervisors', async (req, res) => {
  try {
    const { employeeId, firstName, lastName, email, phoneNumber, password, assignedWorkplace, workSchedule } = req.body;
    
    if (!employeeId || !firstName || !lastName || !email || !password || !assignedWorkplace) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if employee ID already exists
    const existing = await Supervisor.findOne({ employeeId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Employee ID already exists'
      });
    }
    
    const supervisor = new Supervisor({
      employeeId,
      firstName,
      lastName,
      email,
      phoneNumber,
      password,
      assignedWorkplace,
      workSchedule
    });
    
    await supervisor.save();
    
    await createAuditLog(
      req.admin._id,
      'Admin',
      'CREATE_SUPERVISOR',
      supervisor._id,
      'Supervisor',
      { supervisor: supervisor.toJSON() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      success: true,
      message: 'Supervisor created successfully',
      supervisor: supervisor.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create supervisor',
      error: error.message
    });
  }
});

/**
 * PUT Update Supervisor
 */
router.put('/supervisors/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, assignedWorkplace, workSchedule, isActive } = req.body;
    
    const supervisor = await Supervisor.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, phoneNumber, assignedWorkplace, workSchedule, isActive, updatedAt: new Date() },
      { new: true }
    );
    
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found'
      });
    }
    
    await createAuditLog(
      req.admin._id,
      'Admin',
      'UPDATE_SUPERVISOR',
      supervisor._id,
      'Supervisor',
      { changes: { firstName, lastName, email, phoneNumber, assignedWorkplace, isActive } },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Supervisor updated successfully',
      supervisor: supervisor.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update supervisor',
      error: error.message
    });
  }
});

/**
 * DELETE Supervisor (Deactivate)
 */
router.delete('/supervisors/:id', async (req, res) => {
  try {
    const supervisor = await Supervisor.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );
    
    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Supervisor not found'
      });
    }
    
    await createAuditLog(
      req.admin._id,
      'Admin',
      'DELETE_SUPERVISOR',
      supervisor._id,
      'Supervisor',
      { deactivated: true },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Supervisor deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate supervisor',
      error: error.message
    });
  }
});

/**
 * GET All Workplaces
 */
router.get('/workplaces', async (req, res) => {
  try {
    const workplaces = await Workplace.find()
      .populate('assignedSupervisors', 'firstName lastName employeeId')
      .sort({ name: 1 });
    
    res.json({
      success: true,
      count: workplaces.length,
      workplaces
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workplaces',
      error: error.message
    });
  }
});

/**
 * POST Create Workplace
 */
router.post('/workplaces', async (req, res) => {
  try {
    const { name, address, latitude, longitude, geofenceRadius, allowOutsideClockIn, defaultWorkingHours } = req.body;
    
    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    const workplace = new Workplace({
      name,
      address,
      latitude,
      longitude,
      geofenceRadius: geofenceRadius || 100,
      allowOutsideClockIn: allowOutsideClockIn || false,
      defaultWorkingHours,
      createdBy: req.admin._id
    });
    
    await workplace.save();
    
    await createAuditLog(
      req.admin._id,
      'Admin',
      'CREATE_WORKPLACE',
      workplace._id,
      'Workplace',
      { workplace: workplace.toJSON() },
      req.ip,
      req.headers['user-agent']
    );
    
    res.status(201).json({
      success: true,
      message: 'Workplace created successfully',
      workplace
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create workplace',
      error: error.message
    });
  }
});

/**
 * PUT Update Workplace
 */
router.put('/workplaces/:id', async (req, res) => {
  try {
    const { name, address, latitude, longitude, geofenceRadius, allowOutsideClockIn, defaultWorkingHours } = req.body;
    
    const workplace = await Workplace.findByIdAndUpdate(
      req.params.id,
      { name, address, latitude, longitude, geofenceRadius, allowOutsideClockIn, defaultWorkingHours, updatedAt: new Date() },
      { new: true }
    );
    
    if (!workplace) {
      return res.status(404).json({
        success: false,
        message: 'Workplace not found'
      });
    }
    
    await createAuditLog(
      req.admin._id,
      'Admin',
      'UPDATE_WORKPLACE',
      workplace._id,
      'Workplace',
      { changes: { name, address, latitude, longitude, geofenceRadius } },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Workplace updated successfully',
      workplace
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update workplace',
      error: error.message
    });
  }
});

/**
 * DELETE Workplace
 */
router.delete('/workplaces/:id', async (req, res) => {
  try {
    const workplace = await Workplace.findByIdAndDelete(req.params.id);
    
    if (!workplace) {
      return res.status(404).json({
        success: false,
        message: 'Workplace not found'
      });
    }
    
    await createAuditLog(
      req.admin._id,
      'Admin',
      'DELETE_WORKPLACE',
      workplace._id,
      'Workplace',
      { deleted: true },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Workplace deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete workplace',
      error: error.message
    });
  }
});

/**
 * Export Attendance as CSV
 */
router.get('/attendance/export/csv', async (req, res) => {
  try {
    const { startDate, endDate, supervisor, workplace } = req.query;
    
    let query = {};
    if (supervisor) query.supervisor = supervisor;
    if (workplace) query.workplace = workplace;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    const records = await Attendance.find(query)
      .populate('supervisor', 'firstName lastName employeeId')
      .populate('workplace', 'name')
      .sort({ date: -1 });
    
    // Build CSV
    let csv = 'Supervisor,Employee ID,Workplace,Date,Clock In,Clock In Location,Clock In Distance,Clock Out,Clock Out Location,Clock Out Distance,Working Hours,Status\n';
    
    records.forEach(record => {
      const clockInLocation = record.clockInLocationVerified ? 'Verified' : 'Outside';
      const clockOutLocation = record.clockOutLocationVerified ? 'Verified' : 'Outside';
      
      csv += `"${record.supervisor.firstName} ${record.supervisor.lastName}",${record.employeeId},"${record.workplaceName}",${record.date.toDateString()},${record.clockInTime ? record.clockInTime.toLocaleTimeString() : 'N/A'},${clockInLocation},${record.clockInDistanceFromWorkplace}m,${record.clockOutTime ? record.clockOutTime.toLocaleTimeString() : 'N/A'},${clockOutLocation},${record.clockOutDistanceFromWorkplace ? record.clockOutDistanceFromWorkplace + 'm' : 'N/A'},${record.totalWorkingHours || 'N/A'}h,${record.status}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export CSV',
      error: error.message
    });
  }
});

module.exports = router;

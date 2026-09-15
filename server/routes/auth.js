const express = require('express');
const router = express.Router();
const Supervisor = require('../models/Supervisor');
const Admin = require('../models/Admin');
const { generateToken } = require('../utils/tokenHelper');
const { createAuditLog } = require('../utils/locationHelper');

/**
 * Supervisor Login
 */
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    
    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and password are required'
      });
    }
    
    // Try to find supervisor
    let user = await Supervisor.findOne({ employeeId }).populate('assignedWorkplace');
    let userType = 'Supervisor';
    let isAdmin = false;
    
    // If not found, try admin login
    if (!user) {
      user = await Admin.findOne({ username: employeeId });
      userType = 'Admin';
      isAdmin = true;
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid employee ID or username'
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }
    
    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Create token
    const token = generateToken(user._id, userType, isAdmin);
    
    // Log the action
    await createAuditLog(
      user._id,
      userType,
      'LOGIN',
      null,
      null,
      { action: 'User login' },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: `Welcome back, ${isAdmin ? user.username : user.getFullName()}!`,
      token,
      user: user.toJSON(),
      userType
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * Get Current User
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user;
    if (decoded.userType === 'Supervisor') {
      user = await Supervisor.findById(decoded.userId).populate('assignedWorkplace');
    } else {
      user = await Admin.findById(decoded.userId);
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: user.toJSON(),
      userType: decoded.userType
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

/**
 * Logout
 */
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    await createAuditLog(
      decoded.userId,
      decoded.userType,
      'LOGOUT',
      null,
      null,
      { action: 'User logout' },
      req.ip,
      req.headers['user-agent']
    );
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router;

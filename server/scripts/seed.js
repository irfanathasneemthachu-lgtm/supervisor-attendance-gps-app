const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../models/Admin');
const Supervisor = require('../models/Supervisor');
const Workplace = require('../models/Workplace');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance');
    
    // Clear existing data
    await Admin.deleteMany({});
    await Supervisor.deleteMany({});
    await Workplace.deleteMany({});
    
    console.log('🗑️  Cleared existing data');
    
    // Create Admin
    const admin = new Admin({
      username: 'admin',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@company.com',
      phoneNumber: '+1234567890',
      role: 'super_admin',
      isActive: true
    });
    await admin.save();
    console.log('✅ Admin created - Username: admin, Password: admin123');
    
    // Create Workplaces
    const workplaces = [
      new Workplace({
        name: 'ABC Branch',
        address: '123 Main Street, Downtown',
        latitude: 40.7128,
        longitude: -74.0060,
        geofenceRadius: 100,
        allowOutsideClockIn: false,
        defaultWorkingHours: { start: '09:00', end: '17:00' },
        createdBy: admin._id
      }),
      new Workplace({
        name: 'XYZ Headquarters',
        address: '456 Oak Avenue, Midtown',
        latitude: 40.7580,
        longitude: -73.9855,
        geofenceRadius: 150,
        allowOutsideClockIn: true,
        defaultWorkingHours: { start: '08:00', end: '18:00' },
        createdBy: admin._id
      })
    ];
    
    await Workplace.insertMany(workplaces);
    console.log('✅ Workplaces created');
    
    // Create Supervisors
    const supervisors = [
      new Supervisor({
        employeeId: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phoneNumber: '+1111111111',
        password: 'password123',
        assignedWorkplace: workplaces[0]._id,
        workSchedule: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: { start: '00:00', end: '00:00' },
          sunday: { start: '00:00', end: '00:00' }
        },
        isActive: true
      }),
      new Supervisor({
        employeeId: 'EMP002',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@company.com',
        phoneNumber: '+2222222222',
        password: 'password123',
        assignedWorkplace: workplaces[1]._id,
        workSchedule: {
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '09:00', end: '14:00' },
          sunday: { start: '00:00', end: '00:00' }
        },
        isActive: true
      })
    ];
    
    await Supervisor.insertMany(supervisors);
    console.log('✅ Supervisors created');
    console.log('   EMP001 - John Doe (ABC Branch)');
    console.log('   EMP002 - Jane Smith (XYZ Headquarters)');
    
    // Update workplaces with assigned supervisors
    await Workplace.findByIdAndUpdate(workplaces[0]._id, { assignedSupervisors: [supervisors[0]._id] });
    await Workplace.findByIdAndUpdate(workplaces[1]._id, { assignedSupervisors: [supervisors[1]._id] });
    
    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin / admin123');
    console.log('   Supervisor 1: EMP001 / password123');
    console.log('   Supervisor 2: EMP002 / password123');
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();

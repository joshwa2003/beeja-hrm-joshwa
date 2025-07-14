require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Leave = require('../models/Leave');

const createTestLeaveRequest = async () => {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for creating test leave request');
    } else {
      console.log('Using existing MongoDB connection');
    }

    // Find the employee user
    const employee = await User.findOne({ role: 'Employee' });
    if (!employee) {
      console.log('Employee user not found');
      return;
    }

    console.log(`Found employee: ${employee.firstName} ${employee.lastName} (${employee.email})`);

    // Create a test leave request
    const testLeaveRequest = new Leave({
      employee: employee._id,
      leaveType: 'Casual',
      startDate: new Date('2025-01-20'),
      endDate: new Date('2025-01-22'),
      totalDays: 3,
      reason: 'Family vacation - need to attend a family wedding',
      isHalfDay: false,
      handoverNotes: 'All pending tasks will be completed before leave. John will handle urgent matters.',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1-555-1234',
        relationship: 'Spouse'
      },
      status: 'Pending',
      createdBy: employee._id
    });

    await testLeaveRequest.save();
    console.log('✅ Test leave request created successfully!');

    // Populate and display the request
    await testLeaveRequest.populate('employee', 'firstName lastName email employeeId reportingManager');
    
    console.log('\nLeave Request Details:');
    console.log(`- Employee: ${testLeaveRequest.employee.firstName} ${testLeaveRequest.employee.lastName}`);
    console.log(`- Email: ${testLeaveRequest.employee.email}`);
    console.log(`- Employee ID: ${testLeaveRequest.employee.employeeId}`);
    console.log(`- Leave Type: ${testLeaveRequest.leaveType}`);
    console.log(`- Start Date: ${testLeaveRequest.startDate.toDateString()}`);
    console.log(`- End Date: ${testLeaveRequest.endDate.toDateString()}`);
    console.log(`- Total Days: ${testLeaveRequest.totalDays}`);
    console.log(`- Status: ${testLeaveRequest.status}`);
    console.log(`- Reason: ${testLeaveRequest.reason}`);

    // Verify Team Leader can see this request
    const teamLeader = await User.findOne({ role: 'Team Leader' });
    if (teamLeader) {
      console.log(`\nTeam Leader: ${teamLeader.firstName} ${teamLeader.lastName} (${teamLeader.email})`);
      
      // Check if employee reports to this team leader
      if (testLeaveRequest.employee.reportingManager && 
          testLeaveRequest.employee.reportingManager.toString() === teamLeader._id.toString()) {
        console.log('✅ Employee correctly reports to Team Leader');
      } else {
        console.log('❌ Reporting relationship issue detected');
      }
    }

  } catch (error) {
    console.error('Error creating test leave request:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  createTestLeaveRequest();
}

module.exports = createTestLeaveRequest;

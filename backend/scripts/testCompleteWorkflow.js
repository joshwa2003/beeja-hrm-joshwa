require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Leave = require('../models/Leave');

const testCompleteWorkflow = async () => {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for testing complete workflow');
    } else {
      console.log('Using existing MongoDB connection');
    }

    // Find users
    const employee = await User.findOne({ role: 'Employee' });
    const teamLeader = await User.findOne({ role: 'Team Leader' });
    const hrManager = await User.findOne({ role: 'HR Manager' });

    if (!employee || !teamLeader || !hrManager) {
      console.log('Required users not found');
      return;
    }

    console.log('Found users:');
    console.log(`- Employee: ${employee.firstName} ${employee.lastName}`);
    console.log(`- Team Leader: ${teamLeader.firstName} ${teamLeader.lastName}`);
    console.log(`- HR Manager: ${hrManager.firstName} ${hrManager.lastName}`);

    // Find the pending leave request
    let leaveRequest = await Leave.findOne({
      employee: employee._id,
      status: 'Pending'
    }).populate('employee', 'firstName lastName email');

    if (!leaveRequest) {
      console.log('No pending leave request found. Creating one...');
      
      // Create a new test leave request
      leaveRequest = new Leave({
        employee: employee._id,
        leaveType: 'Casual',
        startDate: new Date('2025-01-25'),
        endDate: new Date('2025-01-27'),
        totalDays: 3,
        reason: 'Personal work - need to handle some urgent family matters',
        isHalfDay: false,
        handoverNotes: 'All current projects are on track. Sarah will cover any urgent issues.',
        emergencyContact: {
          name: 'Emergency Contact',
          phone: '+1-555-9999',
          relationship: 'Spouse'
        },
        status: 'Pending',
        createdBy: employee._id
      });

      await leaveRequest.save();
      await leaveRequest.populate('employee', 'firstName lastName email');
      console.log('✅ New leave request created');
    }

    console.log(`\nProcessing leave request: ${leaveRequest._id}`);
    console.log(`Current status: ${leaveRequest.status}`);

    // Step 1: Team Leader approves
    if (leaveRequest.status === 'Pending') {
      leaveRequest.status = 'Approved by TL';
      leaveRequest.tlApprovedBy = teamLeader._id;
      leaveRequest.tlApprovedDate = new Date();
      leaveRequest.tlComments = 'Approved by Team Leader. Employee has good performance record.';
      leaveRequest.updatedBy = teamLeader._id;
      
      await leaveRequest.save();
      console.log('✅ Step 1: Team Leader approved the leave request');
    }

    // Step 2: HR gives final approval
    if (leaveRequest.status === 'Approved by TL') {
      leaveRequest.status = 'Approved';
      leaveRequest.approvedBy = hrManager._id;
      leaveRequest.approvedDate = new Date();
      leaveRequest.hrComments = 'Final approval by HR. Leave balance sufficient.';
      leaveRequest.updatedBy = hrManager._id;
      
      await leaveRequest.save();
      console.log('✅ Step 2: HR gave final approval');
    }

    // Populate all related fields for final display
    await leaveRequest.populate([
      { path: 'employee', select: 'firstName lastName email employeeId' },
      { path: 'tlApprovedBy', select: 'firstName lastName email' },
      { path: 'approvedBy', select: 'firstName lastName email' }
    ]);

    console.log('\n🎉 Complete Workflow Test Results:');
    console.log('=====================================');
    console.log(`Leave Request ID: ${leaveRequest._id}`);
    console.log(`Employee: ${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName}`);
    console.log(`Leave Type: ${leaveRequest.leaveType}`);
    console.log(`Dates: ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()}`);
    console.log(`Total Days: ${leaveRequest.totalDays}`);
    console.log(`Final Status: ${leaveRequest.status}`);
    console.log(`Team Leader: ${leaveRequest.tlApprovedBy?.firstName} ${leaveRequest.tlApprovedBy?.lastName}`);
    console.log(`HR Manager: ${leaveRequest.approvedBy?.firstName} ${leaveRequest.approvedBy?.lastName}`);
    console.log(`TL Comments: ${leaveRequest.tlComments}`);
    console.log(`HR Comments: ${leaveRequest.hrComments}`);

    console.log('\n✅ Workflow completed successfully!');
    console.log('Now Team Leader should be able to see this request with "Approved" status in their dashboard.');

  } catch (error) {
    console.error('Error testing complete workflow:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  testCompleteWorkflow();
}

module.exports = testCompleteWorkflow;

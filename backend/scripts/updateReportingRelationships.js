require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const updateReportingRelationships = async () => {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for updating reporting relationships');
    } else {
      console.log('Using existing MongoDB connection');
    }

    // Get all users by role
    const users = {};
    const roles = [
      'Admin',
      'Vice President', 
      'HR BP',
      'HR Manager',
      'HR Executive',
      'Team Manager',
      'Team Leader',
      'Employee'
    ];

    for (const role of roles) {
      const user = await User.findOne({ role });
      if (user) {
        users[role] = user;
        console.log(`Found ${role}: ${user.email}`);
      }
    }

    // Establish reporting relationships
    console.log('\nEstablishing reporting relationships...');
    
    // Employee reports to Team Leader
    if (users['Employee'] && users['Team Leader']) {
      await User.findByIdAndUpdate(users['Employee']._id, {
        reportingManager: users['Team Leader']._id
      });
      console.log('✅ Set Employee to report to Team Leader');
    }

    // Team Leader reports to Team Manager
    if (users['Team Leader'] && users['Team Manager']) {
      await User.findByIdAndUpdate(users['Team Leader']._id, {
        reportingManager: users['Team Manager']._id
      });
      console.log('✅ Set Team Leader to report to Team Manager');
    }

    // Team Manager reports to Vice President
    if (users['Team Manager'] && users['Vice President']) {
      await User.findByIdAndUpdate(users['Team Manager']._id, {
        reportingManager: users['Vice President']._id
      });
      console.log('✅ Set Team Manager to report to Vice President');
    }

    // HR Executive reports to HR Manager
    if (users['HR Executive'] && users['HR Manager']) {
      await User.findByIdAndUpdate(users['HR Executive']._id, {
        reportingManager: users['HR Manager']._id
      });
      console.log('✅ Set HR Executive to report to HR Manager');
    }

    // HR Manager reports to HR BP
    if (users['HR Manager'] && users['HR BP']) {
      await User.findByIdAndUpdate(users['HR Manager']._id, {
        reportingManager: users['HR BP']._id
      });
      console.log('✅ Set HR Manager to report to HR BP');
    }

    // HR BP reports to Vice President
    if (users['HR BP'] && users['Vice President']) {
      await User.findByIdAndUpdate(users['HR BP']._id, {
        reportingManager: users['Vice President']._id
      });
      console.log('✅ Set HR BP to report to Vice President');
    }

    // Vice President reports to Admin
    if (users['Vice President'] && users['Admin']) {
      await User.findByIdAndUpdate(users['Vice President']._id, {
        reportingManager: users['Admin']._id
      });
      console.log('✅ Set Vice President to report to Admin');
    }

    console.log('\n🎉 Reporting relationships updated successfully!');
    
    // Verify the relationships
    console.log('\nVerifying relationships:');
    const employee = await User.findOne({ role: 'Employee' }).populate('reportingManager', 'firstName lastName role');
    const teamLeader = await User.findOne({ role: 'Team Leader' }).populate('reportingManager', 'firstName lastName role');
    
    if (employee && employee.reportingManager) {
      console.log(`Employee reports to: ${employee.reportingManager.firstName} ${employee.reportingManager.lastName} (${employee.reportingManager.role})`);
    }
    
    if (teamLeader && teamLeader.reportingManager) {
      console.log(`Team Leader reports to: ${teamLeader.reportingManager.firstName} ${teamLeader.reportingManager.lastName} (${teamLeader.reportingManager.role})`);
    }

  } catch (error) {
    console.error('Error updating reporting relationships:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  updateReportingRelationships();
}

module.exports = updateReportingRelationships;

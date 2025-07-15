require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');

const fixReportingRelationships = async () => {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for fixing reporting relationships');
    } else {
      console.log('Using existing MongoDB connection');
    }

    console.log('🔧 Starting to fix reporting relationships...\n');

    // Get all teams with their members and team leaders
    const teams = await Team.find({ isActive: true })
      .populate('teamLeader', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email reportingManager');

    let totalFixed = 0;
    let totalProcessed = 0;

    for (const team of teams) {
      console.log(`\n📋 Processing team: ${team.name} (${team.code})`);
      
      if (!team.teamLeader) {
        console.log(`  ⚠️  No team leader assigned to team ${team.name}`);
        continue;
      }

      console.log(`  👤 Team Leader: ${team.teamLeader.firstName} ${team.teamLeader.lastName}`);

      if (!team.members || team.members.length === 0) {
        console.log(`  ℹ️  No members in team ${team.name}`);
        continue;
      }

      // Process each team member
      for (const member of team.members) {
        if (!member.user) {
          console.log(`  ⚠️  Broken member reference found, skipping...`);
          continue;
        }

        totalProcessed++;
        const user = member.user;
        const currentReportingManager = user.reportingManager?.toString();
        const expectedReportingManager = team.teamLeader._id.toString();

        console.log(`  👥 Member: ${user.firstName} ${user.lastName}`);
        console.log(`     Current reporting manager: ${currentReportingManager || 'None'}`);
        console.log(`     Expected reporting manager: ${expectedReportingManager}`);

        // Update if reporting manager is different or missing
        if (currentReportingManager !== expectedReportingManager) {
          await User.findByIdAndUpdate(
            user._id,
            { reportingManager: team.teamLeader._id }
          );
          
          totalFixed++;
          console.log(`     ✅ Fixed reporting relationship`);
        } else {
          console.log(`     ✓ Already correct`);
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Teams processed: ${teams.length}`);
    console.log(`   Members processed: ${totalProcessed}`);
    console.log(`   Relationships fixed: ${totalFixed}`);

    // Verify the fixes
    console.log('\n🔍 Verification:');
    const employeesWithoutReporting = await User.find({
      role: 'Employee',
      team: { $ne: null },
      reportingManager: null,
      isActive: true
    });

    if (employeesWithoutReporting.length > 0) {
      console.log(`⚠️  Found ${employeesWithoutReporting.length} employees still without reporting managers:`);
      employeesWithoutReporting.forEach(emp => {
        console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.email})`);
      });
    } else {
      console.log('✅ All team members now have proper reporting relationships');
    }

    // Show some statistics
    const teamLeaderStats = await User.aggregate([
      {
        $match: { role: 'Team Leader', isActive: true }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'reportingManager',
          as: 'directReports'
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          reportCount: { $size: '$directReports' }
        }
      }
    ]);

    console.log('\n👥 Team Leader Report Counts:');
    teamLeaderStats.forEach(leader => {
      console.log(`   ${leader.firstName} ${leader.lastName}: ${leader.reportCount} direct reports`);
    });

    console.log('\n🎉 Reporting relationships fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing reporting relationships:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
    }
  }
};

// Run the script if called directly
if (require.main === module) {
  fixReportingRelationships();
}

module.exports = fixReportingRelationships;

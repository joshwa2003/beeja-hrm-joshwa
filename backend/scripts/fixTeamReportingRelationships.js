const mongoose = require('mongoose');
const User = require('../models/User');
const Team = require('../models/Team');
require('dotenv').config();

const fixTeamReportingRelationships = async () => {
  try {
    console.log('🔧 Starting to fix team reporting relationships...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all teams with their members and leaders
    const teams = await Team.find({ isActive: true })
      .populate('members.user', 'firstName lastName email employeeId reportingManager')
      .populate('teamLeader', 'firstName lastName email employeeId');

    let totalFixed = 0;
    let totalProcessed = 0;

    for (const team of teams) {
      console.log(`\n📋 Processing team: ${team.name} (${team.code})`);
      
      if (!team.teamLeader) {
        console.log(`⚠️  Team ${team.name} has no team leader assigned. Skipping...`);
        continue;
      }

      console.log(`👨‍💼 Team Leader: ${team.teamLeader.firstName} ${team.teamLeader.lastName}`);

      if (team.members && team.members.length > 0) {
        const memberIds = [];
        
        for (const member of team.members) {
          if (member.user) {
            totalProcessed++;
            const currentReportingManager = member.user.reportingManager?.toString();
            const expectedReportingManager = team.teamLeader._id.toString();
            
            if (currentReportingManager !== expectedReportingManager) {
              console.log(`🔄 Fixing reporting manager for ${member.user.firstName} ${member.user.lastName}`);
              console.log(`   Current: ${currentReportingManager || 'None'}`);
              console.log(`   Expected: ${expectedReportingManager}`);
              
              memberIds.push(member.user._id);
              totalFixed++;
            } else {
              console.log(`✅ ${member.user.firstName} ${member.user.lastName} already has correct reporting manager`);
            }
          }
        }

        // Update all members at once for this team
        if (memberIds.length > 0) {
          await User.updateMany(
            { _id: { $in: memberIds } },
            { reportingManager: team.teamLeader._id }
          );
          console.log(`✅ Updated ${memberIds.length} team members' reporting manager`);
        }
      } else {
        console.log(`ℹ️  Team ${team.name} has no members`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total team members processed: ${totalProcessed}`);
    console.log(`   Total reporting relationships fixed: ${totalFixed}`);
    console.log(`   Teams processed: ${teams.length}`);

    if (totalFixed > 0) {
      console.log('\n🎉 Reporting relationships have been fixed!');
    } else {
      console.log('\n✅ All reporting relationships were already correct!');
    }

  } catch (error) {
    console.error('❌ Error fixing team reporting relationships:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  fixTeamReportingRelationships();
}

module.exports = fixTeamReportingRelationships;

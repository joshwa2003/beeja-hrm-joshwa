const mongoose = require('mongoose');
const User = require('./models/User');
const Team = require('./models/Team');
require('dotenv').config();

// Connect to MongoDB using the same connection as the app
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugTeamAssignment() {
  try {
    console.log('=== Debug Team Assignment ===');
    
    // First, let's see what users exist
    const allUsers = await User.find({}, 'firstName lastName email role');
    console.log('All users in database:');
    allUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
    });
    
    // Check if there are any teams
    let team = await Team.findOne().populate('members.user');
    if (!team) {
      console.log('\nNo teams found, creating a test team...');
      
      // Find any user to use as creator (prefer Admin, but use any if needed)
      let creator = await User.findOne({ role: 'Admin' });
      if (!creator) {
        creator = await User.findOne();
        if (!creator) {
          console.log('No users found at all, cannot create team');
          return;
        }
        console.log(`Using ${creator.firstName} ${creator.lastName} as team creator`);
      }
      
      team = new Team({
        name: 'Test Team',
        code: 'TEST001',
        description: 'Test team for debugging',
        maxSize: 10,
        createdBy: creator._id
      });
      
      await team.save();
      console.log('Test team created:', team.name, 'ID:', team._id);
    }
    
    console.log('Team found:', team.name, 'ID:', team._id);
    console.log('Current members:', team.members.length);
    
    // Find an employee not in any team
    const employee = await User.findOne({ 
      role: 'Employee',
      team: { $exists: false }
    });
    
    if (!employee) {
      console.log('No unassigned employees found');
      return;
    }
    
    console.log('Employee found:', employee.firstName, employee.lastName, 'ID:', employee._id);
    console.log('Employee team field:', employee.team);
    console.log('Employee team type:', typeof employee.team);
    
    // Check if employee is already in team members
    const existingMember = team.members.find(member => 
      member.user.toString() === employee._id.toString()
    );
    
    console.log('Employee already in team?', !!existingMember);
    
    // Try to add the employee to the team
    console.log('\n=== Attempting to add employee to team ===');
    
    // Check team capacity
    console.log('Team capacity:', team.members.length, '/', team.maxSize);
    
    if (team.members.length >= team.maxSize) {
      console.log('Team is at maximum capacity');
      return;
    }
    
    // Add member to team
    team.members.push({
      user: employee._id,
      role: 'Member',
      joinedDate: new Date()
    });
    
    // Update user's team field
    employee.team = team._id;
    
    // Save both
    await Promise.all([team.save(), employee.save()]);
    
    console.log('Successfully added employee to team!');
    
    // Verify the assignment
    const updatedEmployee = await User.findById(employee._id);
    const updatedTeam = await Team.findById(team._id);
    
    console.log('Updated employee team field:', updatedEmployee.team);
    console.log('Updated team members count:', updatedTeam.members.length);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugTeamAssignment();

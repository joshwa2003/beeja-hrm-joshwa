const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Team = require('./backend/models/Team');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/hrm-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function debugTeamAssignment() {
  try {
    console.log('=== Debug Team Assignment ===');
    
    // Find a team
    const team = await Team.findOne().populate('members.user');
    if (!team) {
      console.log('No teams found');
      return;
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

const axios = require('axios');

// Test the team assignment functionality
async function testTeamAssignment() {
  try {
    // First, let's check what teams are available
    console.log('1. Fetching available teams...');
    const teamsResponse = await axios.get('http://localhost:5001/api/teams', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Available teams:', teamsResponse.data.teams.map(t => ({
      id: t._id,
      name: t.name,
      code: t.code
    })));

    // Let's check unassigned employees
    console.log('\n2. Fetching unassigned employees...');
    const employeesResponse = await axios.get('http://localhost:5001/api/teams/unassigned-employees', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with actual token
      }
    });
    
    console.log('Unassigned employees:', employeesResponse.data.employees.map(e => ({
      id: e._id,
      name: `${e.firstName} ${e.lastName}`,
      role: e.role
    })));

    // Test adding a member to a team
    if (teamsResponse.data.teams.length > 0 && employeesResponse.data.employees.length > 0) {
      const teamId = teamsResponse.data.teams[0]._id;
      const userId = employeesResponse.data.employees[0]._id;
      
      console.log(`\n3. Attempting to add user ${userId} to team ${teamId}...`);
      
      const addMemberResponse = await axios.post(`http://localhost:5001/api/teams/${teamId}/members`, {
        userId: userId,
        role: 'Member'
      }, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with actual token
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Success:', addMemberResponse.data);
    }

  } catch (error) {
    console.error('Error details:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.message);
    console.error('Full error:', error.response?.data);
  }
}

// Run the test
testTeamAssignment();

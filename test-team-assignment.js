const axios = require('axios');

const API_BASE_URL = 'http://localhost:5001/api';

// Test credentials
const adminCredentials = {
  email: 'admin@company.com',
  password: 'password123'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in as admin...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, adminCredentials);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function fetchTeams() {
  try {
    console.log('\n📋 Fetching teams...');
    const response = await axios.get(`${API_BASE_URL}/teams`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 1000 }
    });
    console.log('✅ Teams fetched successfully');
    console.log('Teams:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch teams:', error.response?.data || error.message);
    throw error;
  }
}

async function testTeamAssignment() {
  try {
    // Step 1: Login
    await login();

    // Step 2: Fetch teams
    const teamsResponse = await fetchTeams();
    const teams = teamsResponse.teams || [];
    
    if (teams.length === 0) {
      console.log('❌ No teams available for assignment');
      return;
    }

    console.log(`\n📊 Found ${teams.length} teams available for assignment`);
    teams.forEach((team, index) => {
      console.log(`  ${index + 1}. ${team.name} (${team.code}) - Members: ${team.currentSize || 0}/${team.maxSize}`);
    });

    // Step 3: Test adding a member to the first team
    const firstTeam = teams[0];
    const testUserId = '68753def930fdce062e5b9ae'; // This should be a valid user ID
    
    console.log(`\n🔗 Testing team assignment to team: ${firstTeam.name} (${firstTeam._id})`);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/teams/${firstTeam._id}/members`, {
        userId: testUserId,
        role: 'Member'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log('✅ Team assignment successful');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (teamError) {
      console.error('❌ Team assignment failed:', teamError.response?.data || teamError.message);
      console.error('Error details:', {
        status: teamError.response?.status,
        statusText: teamError.response?.statusText,
        data: teamError.response?.data
      });
    }

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
  }
}

// Run the test
testTeamAssignment();

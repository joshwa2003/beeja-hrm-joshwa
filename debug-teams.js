const axios = require('axios');

// Test the teams API directly
async function testTeamsAPI() {
  try {
    // First login to get token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@company.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Now test teams API
    console.log('Fetching teams...');
    const teamsResponse = await axios.get('http://localhost:5001/api/teams', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Teams API Response:');
    console.log('Status:', teamsResponse.status);
    console.log('Data:', JSON.stringify(teamsResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTeamsAPI();

const axios = require('axios');
require('dotenv').config();

async function testTeamMemberAPI() {
  try {
    console.log('=== Testing Team Member API Endpoint ===');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@company.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, got token');
    
    // Test adding a team member
    const teamId = '6874de2748a8f0d8e59ce5cd'; // From debug script
    const userId = '686f4d87d778879ea2d7eac5'; // Employee User ID from debug script
    
    console.log(`Attempting to add user ${userId} to team ${teamId}`);
    
    const response = await axios.post(
      `http://localhost:5001/api/teams/${teamId}/members`,
      {
        userId: userId,
        role: 'Member'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('API call successful:', response.data);
    
  } catch (error) {
    console.error('API call failed:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Full error:', error.message);
  }
}

testTeamMemberAPI();

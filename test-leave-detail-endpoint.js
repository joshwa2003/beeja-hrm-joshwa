const axios = require('axios');

async function testLeaveDetailEndpoint() {
  try {
    console.log('Testing leave detail endpoint...');
    
    // First, let's login to get a token
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'hrmanager@company.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get all leave requests to find a valid ID
    const leaveRequestsResponse = await axios.get('http://localhost:5001/api/leaves/hr-requests', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const leaveRequests = leaveRequestsResponse.data.leaveRequests;
    console.log(`✅ Found ${leaveRequests.length} leave requests`);
    
    if (leaveRequests.length > 0) {
      const leaveId = leaveRequests[0]._id;
      console.log(`Testing with leave ID: ${leaveId}`);
      
      // Test the detail endpoint
      const detailResponse = await axios.get(`http://localhost:5001/api/leaves/${leaveId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Leave detail endpoint working!');
      console.log('Response:', {
        message: detailResponse.data.message,
        leaveType: detailResponse.data.leaveRequest.leaveType,
        status: detailResponse.data.leaveRequest.status,
        employee: `${detailResponse.data.leaveRequest.employee.firstName} ${detailResponse.data.leaveRequest.employee.lastName}`
      });
    } else {
      console.log('⚠️  No leave requests found to test with');
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.response?.data || error.message);
  }
}

testLeaveDetailEndpoint();

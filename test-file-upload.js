const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Create a test file
const testFilePath = path.join(__dirname, 'test-file.txt');
fs.writeFileSync(testFilePath, 'This is a test file for chat attachment');

async function testFileUpload() {
  try {
    // First, login to get a token
    console.log('Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@company.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Get or create a chat (we'll use employee@company.com as the other user)
    console.log('Getting employee user...');
    const usersResponse = await axios.get('http://localhost:5001/api/chat/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const employee = usersResponse.data.users.find(u => u.email === 'employee@company.com');
    if (!employee) {
      console.log('Employee user not found');
      return;
    }
    
    console.log('Creating/getting chat with employee...');
    const chatResponse = await axios.get(`http://localhost:5001/api/chat/${employee._id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const chatId = chatResponse.data.chat._id;
    console.log('Chat ID:', chatId);
    
    // Now send a message with file attachment
    console.log('Sending message with file attachment...');
    const formData = new FormData();
    formData.append('content', 'Test message with file');
    formData.append('files', fs.createReadStream(testFilePath));
    
    const messageResponse = await axios.post(
      `http://localhost:5001/api/chat/${chatId}/messages`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders()
        }
      }
    );
    
    console.log('Message sent successfully!');
    console.log('Message data:', JSON.stringify(messageResponse.data.message, null, 2));
    
    // Check if attachments were saved
    if (messageResponse.data.message.attachments && messageResponse.data.message.attachments.length > 0) {
      console.log('✅ SUCCESS: Attachments were saved properly!');
      console.log('Attachment details:', messageResponse.data.message.attachments[0]);
    } else {
      console.log('❌ FAILED: No attachments found in the message');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

testFileUpload();

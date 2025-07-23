const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create a test ZIP file
const createTestZip = () => {
  return new Promise((resolve, reject) => {
    const zipPath = path.join(__dirname, 'test-archive.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log('Test ZIP file created:', zipPath);
      resolve(zipPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Add some test files to the ZIP
    archive.append('This is a test file content', { name: 'test1.txt' });
    archive.append('Another test file', { name: 'test2.txt' });
    archive.append('{"test": "json content"}', { name: 'test.json' });

    archive.finalize();
  });
};

async function testZipUpload() {
  try {
    // Create test ZIP file
    const zipPath = await createTestZip();

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
    
    // Now send a message with ZIP file attachment
    console.log('Sending message with ZIP file attachment...');
    const formData = new FormData();
    formData.append('content', 'Test message with ZIP file');
    formData.append('files', fs.createReadStream(zipPath));
    
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
      const attachment = messageResponse.data.message.attachments[0];
      console.log('✅ SUCCESS: ZIP file attachment was saved properly!');
      console.log('Attachment details:', {
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize
      });
      
      // Test if we can download the ZIP file
      console.log('Testing ZIP file download...');
      const downloadResponse = await axios.get(
        `http://localhost:5001/api/chat/attachment/${messageResponse.data.message._id}/${attachment.fileName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'arraybuffer'
        }
      );
      
      if (downloadResponse.status === 200) {
        console.log('✅ SUCCESS: ZIP file can be downloaded!');
        console.log('Downloaded file size:', downloadResponse.data.byteLength, 'bytes');
      } else {
        console.log('❌ FAILED: Could not download ZIP file');
      }
    } else {
      console.log('❌ FAILED: No attachments found in the message');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  } finally {
    // Clean up test files
    const zipPath = path.join(__dirname, 'test-archive.zip');
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
      console.log('Cleaned up test ZIP file');
    }
  }
}

// Check if archiver is available, if not, create a simple test without it
if (fs.existsSync(path.join(__dirname, 'node_modules/archiver'))) {
  testZipUpload();
} else {
  console.log('Archiver not available, creating simple test...');
  
  // Create a simple test file with .zip extension
  const testZipPath = path.join(__dirname, 'simple-test.zip');
  fs.writeFileSync(testZipPath, 'PK\x03\x04'); // ZIP file signature
  
  async function simpleTest() {
    try {
      const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
        email: 'admin@company.com',
        password: 'password123'
      });
      
      const token = loginResponse.data.token;
      console.log('Login successful');
      
      const usersResponse = await axios.get('http://localhost:5001/api/chat/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const employee = usersResponse.data.users.find(u => u.email === 'employee@company.com');
      const chatResponse = await axios.get(`http://localhost:5001/api/chat/${employee._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const chatId = chatResponse.data.chat._id;
      
      const formData = new FormData();
      formData.append('content', 'Test ZIP file upload');
      formData.append('files', fs.createReadStream(testZipPath));
      
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
      
      console.log('✅ SUCCESS: ZIP file upload test completed!');
      console.log('Attachment:', messageResponse.data.message.attachments[0]);
      
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
    } finally {
      if (fs.existsSync(testZipPath)) {
        fs.unlinkSync(testZipPath);
      }
    }
  }
  
  simpleTest();
}

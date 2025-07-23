const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const updateAdminPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the admin user
    const admin = await User.findOne({ role: 'Admin' });
    if (admin) {
      console.log('Found admin user:', admin.email);
      
      // Update password to password123
      admin.password = 'password123';
      await admin.save();
      
      console.log('Admin password updated successfully!');
      console.log('New login credentials:');
      console.log('Email: admin@company.com');
      console.log('Password: password123');
      
      // Verify the new password works
      const passwordTest = await admin.comparePassword('password123');
      console.log('Password verification:', passwordTest ? 'SUCCESS' : 'FAILED');
      
    } else {
      console.log('No admin user found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error updating admin password:', error);
  }
};

updateAdminPassword();

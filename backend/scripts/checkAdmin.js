const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const checkAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the admin user
    const admin = await User.findOne({ role: 'Admin' });
    if (admin) {
      console.log('Admin user found:');
      console.log('Email:', admin.email);
      console.log('Employee ID:', admin.employeeId);
      console.log('First Name:', admin.firstName);
      console.log('Last Name:', admin.lastName);
      console.log('Is Active:', admin.isActive);
      
      // Test password comparison
      const testPassword1 = await admin.comparePassword('admin123');
      const testPassword2 = await admin.comparePassword('password123');
      
      console.log('\nPassword Tests:');
      console.log('admin123 works:', testPassword1);
      console.log('password123 works:', testPassword2);
      
    } else {
      console.log('No admin user found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkAdminUser();

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const resetAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Delete existing admin user
    await User.deleteOne({ email: 'admin@company.com' });
    console.log('Existing admin user deleted');

    // Create new admin user
    const adminUser = new User({
      email: 'admin@company.com',
      password: 'admin123', // This will be hashed by the pre-save middleware
      firstName: 'System',
      lastName: 'Administrator',
      role: 'Admin',
      department: 'IT',
      employeeId: 'ADMIN001',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ New admin user created successfully!');
    console.log('Email: admin@company.com');
    console.log('Password: admin123');

    // Test the password immediately
    const testUser = await User.findOne({ email: 'admin@company.com' });
    const isPasswordValid = await testUser.comparePassword('admin123');
    console.log('Password test result:', isPasswordValid ? '✅ PASS' : '❌ FAIL');

  } catch (error) {
    console.error('Error resetting admin user:', error);
  } finally {
    mongoose.connection.close();
  }
};

resetAdminUser();

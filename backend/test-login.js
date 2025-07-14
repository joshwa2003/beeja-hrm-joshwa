require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const testLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Find the admin user
    const user = await User.findOne({ email: 'admin@company.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive
    });

    // Test password comparison
    const isPasswordValid = await user.comparePassword('admin123');
    console.log('Password validation result:', isPasswordValid);

    // Check environment variables
    console.log('Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('- JWT_EXPIRE:', process.env.JWT_EXPIRE);
    console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    mongoose.connection.close();
  }
};

testLogin();

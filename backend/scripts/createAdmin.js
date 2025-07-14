require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    // Check if mongoose is already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for admin creation');
    } else {
      console.log('Using existing MongoDB connection for admin creation');
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'Admin' });
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return existingAdmin;
    }

    // Create admin user without department reference initially
    const adminUser = new User({
      email: 'admin@company.com',
      password: 'admin123', // Will be hashed by pre-save middleware
      firstName: 'System',
      lastName: 'Administrator',
      role: 'Admin',
      employeeId: 'ADMIN001',
      phoneNumber: '+1-555-0001',
      dateOfBirth: new Date(1980, 0, 1),
      gender: 'Prefer not to say',
      address: {
        street: '1 System Street',
        city: 'System City',
        state: 'SYS',
        zipCode: '00001',
        country: 'USA'
      },
      joiningDate: new Date(),
      emergencyContact: {
        name: 'System Contact',
        relationship: 'System',
        phone: '+1-555-0002',
        address: '1 System Street, System City, SYS'
      },
      bankDetails: {
        accountNumber: '****0001',
        bankName: 'System Bank',
        ifscCode: 'SYS0001234',
        pfNumber: 'PF000001',
        esiNumber: 'ESI000001',
        panNumber: 'PAN000001'
      },
      leaveBalance: {
        casual: 12,
        sick: 12,
        earned: 21,
        maternity: 0,
        paternity: 0
      },
      isActive: true
    });

    await adminUser.save();
    console.log('System admin user created successfully!');
    console.log('Email: admin@company.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login.');
    
    return adminUser;

  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

// Export for use in other scripts
module.exports = createAdminUser;

// Allow script to be run directly
if (require.main === module) {
  createAdminUser()
    .then(() => {
      console.log('Admin creation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Admin creation failed:', error);
      process.exit(1);
    });
}

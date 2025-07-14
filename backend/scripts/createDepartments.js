require('dotenv').config();
const mongoose = require('mongoose');
const Department = require('../models/Department');

const defaultDepartments = [
  {
    name: 'Management',
    code: 'MGMT',
    description: 'Executive management and leadership team',
    location: 'Head Office',
    budget: 1000000
  },
  {
    name: 'Human Resources',
    code: 'HR',
    description: 'Human resources and people operations',
    location: 'Head Office',
    budget: 500000
  },
  {
    name: 'Engineering',
    code: 'ENG',
    description: 'Software development and engineering team',
    location: 'Tech Center',
    budget: 2000000
  },
  {
    name: 'Operations',
    code: 'OPS',
    description: 'Business operations and support',
    location: 'Operations Center',
    budget: 750000
  }
];

const createDepartments = async () => {
  try {
    // Check if mongoose is already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for department creation');
    } else {
      console.log('Using existing MongoDB connection for department creation');
    }

    // Ensure admin user exists for createdBy field
    const User = require('../models/User');
    let adminUser = await User.findOne({ role: 'Admin' });
    
    if (!adminUser) {
      throw new Error('No admin user found. Please ensure admin user is created before creating departments.');
    }

    console.log(`Using admin user ${adminUser.email} for department creation`);

    const createdDepartments = [];

    for (const deptData of defaultDepartments) {
      // Check if department already exists
      const existingDept = await Department.findOne({ 
        $or: [
          { name: deptData.name },
          { code: deptData.code }
        ]
      });

      if (existingDept) {
        console.log(`Department ${deptData.name} already exists`);
        createdDepartments.push(existingDept);
        continue;
      }

      // Create department with required createdBy reference
      const departmentData = {
        ...deptData,
        isActive: true,
        createdBy: adminUser._id
      };

      const department = new Department(departmentData);
      await department.save();
      
      console.log(`Created department: ${deptData.name} (${deptData.code})`);
      createdDepartments.push(department);
    }

    console.log('Department creation completed');
    return createdDepartments;
  } catch (error) {
    console.error('Error creating departments:', error);
    throw error;
  }
};

module.exports = createDepartments;

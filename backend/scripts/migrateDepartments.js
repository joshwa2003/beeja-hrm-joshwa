const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
require('dotenv').config();

const migrateDepartments = async () => {
  try {
    // Connect to MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrm-system', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log('Connected to MongoDB for department migration');
    } else {
      console.log('Using existing MongoDB connection for department migration');
    }

    // Get all departments
    const departments = await Department.find({});
    console.log(`Found ${departments.length} departments`);

    // Create a mapping of department names to ObjectIds
    const departmentMap = {};
    departments.forEach(dept => {
      departmentMap[dept.name.toLowerCase()] = dept._id;
      // Also map by common variations
      if (dept.name === 'Human Resources') {
        departmentMap['hr'] = dept._id;
        departmentMap['human resources'] = dept._id;
      }
      if (dept.name === 'Engineering') {
        departmentMap['engineering'] = dept._id;
        departmentMap['tech'] = dept._id;
        departmentMap['technology'] = dept._id;
      }
      if (dept.name === 'Operations') {
        departmentMap['operations'] = dept._id;
        departmentMap['ops'] = dept._id;
      }
    });

    console.log('Department mapping:', Object.keys(departmentMap));

    // Get all users with string departments (using raw MongoDB query to avoid Mongoose casting)
    const users = await User.collection.find({
      department: { $type: "string", $ne: null, $ne: "" }
    }).toArray();

    console.log(`Found ${users.length} users with string departments to migrate`);

    let migratedCount = 0;
    let unmatchedCount = 0;
    const unmatchedDepartments = new Set();

    for (const user of users) {
      const deptString = user.department.toLowerCase().trim();
      const departmentId = departmentMap[deptString];

      if (departmentId) {
        // Update user with ObjectId reference using raw MongoDB operation
        await User.collection.updateOne(
          { _id: user._id },
          { $set: { department: departmentId } }
        );
        console.log(`Migrated user ${user.firstName} ${user.lastName} from "${user.department}" to ObjectId`);
        migratedCount++;
      } else {
        console.log(`No matching department found for: "${user.department}" (user: ${user.firstName} ${user.lastName})`);
        unmatchedDepartments.add(user.department);
        unmatchedCount++;
        
        // Set department to null for unmatched departments using raw MongoDB operation
        await User.collection.updateOne(
          { _id: user._id },
          { $set: { department: null } }
        );
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Successfully migrated: ${migratedCount} users`);
    console.log(`Unmatched departments: ${unmatchedCount} users`);
    
    if (unmatchedDepartments.size > 0) {
      console.log('\nUnmatched department names:');
      unmatchedDepartments.forEach(dept => console.log(`- "${dept}"`));
      console.log('\nThese users now have null department and can be assigned manually.');
    }

    console.log('\nDepartment migration completed successfully!');
    
  } catch (error) {
    console.error('Error during department migration:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  migrateDepartments()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrateDepartments;

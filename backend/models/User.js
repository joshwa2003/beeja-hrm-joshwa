const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Authentication
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  profilePhoto: {
    type: String // URL to profile photo
  },

  // Work Information
  employeeId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: [
        'Admin',
        'Vice President',
        'HR BP',
        'HR Manager',
        'HR Executive',
        'Team Manager',
        'Team Leader',
        'Employee'
      ],
      message: 'Invalid role specified'
    },
    default: 'Employee'
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  workLocation: {
    type: String,
    enum: ['Office', 'Remote', 'Hybrid'],
    default: 'Office'
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  probationEndDate: {
    type: Date
  },
  confirmationDate: {
    type: Date
  },
  
  // Emergency Contact
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    address: String
  },

  // Bank & Salary Details
  bankDetails: {
    accountNumber: String, // Will be masked in frontend
    bankName: String,
    ifscCode: String,
    pfNumber: String,
    esiNumber: String,
    panNumber: String
  },
  
  // Leave Information
  leaveBalance: {
    casual: { type: Number, default: 12 },
    sick: { type: Number, default: 12 },
    earned: { type: Number, default: 21 },
    maternity: { type: Number, default: 0 },
    paternity: { type: Number, default: 0 }
  },

  // Performance & Goals
  currentGoals: [{
    title: String,
    description: String,
    targetDate: Date,
    status: { type: String, enum: ['Not Started', 'In Progress', 'Completed'], default: 'Not Started' }
  }],
  lastAppraisal: {
    rating: String,
    feedback: String,
    date: Date
  },

  // System Fields
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ employeeId: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password and generate employee ID
userSchema.pre('save', async function(next) {
  try {
    // Generate employee ID if not provided and this is a new user
    if (this.isNew && !this.employeeId && this.role) {
      this.employeeId = await this.constructor.generateNextEmployeeId(this.role);
    }

    // Only hash the password if it has been modified (or is new)
    if (this.isModified('password')) {
      // Hash password with cost of 12
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get role hierarchy level (lower number = higher authority)
userSchema.methods.getRoleLevel = function() {
  const roleLevels = {
    'Admin': 1,
    'Vice President': 2,
    'HR BP': 3,
    'HR Manager': 4,
    'HR Executive': 5,
    'Team Manager': 6,
    'Team Leader': 7,
    'Employee': 8
  };
  return roleLevels[this.role] || 999;
};

// Method to check if user can access certain role level
userSchema.methods.canAccess = function(targetRole) {
  const userLevel = this.getRoleLevel();
  const targetLevel = typeof targetRole === 'string' ? 
    this.constructor.prototype.getRoleLevel.call({ role: targetRole }) : 
    targetRole;
  return userLevel <= targetLevel;
};

// Static method to get all roles
userSchema.statics.getRoles = function() {
  return [
    'Admin',
    'Vice President', 
    'HR BP',
    'HR Manager',
    'HR Executive',
    'Team Manager',
    'Team Leader',
    'Employee'
  ];
};

// Static method to get role abbreviations
userSchema.statics.getRoleAbbreviation = function(role) {
  const abbreviations = {
    'Admin': 'ADM',
    'Vice President': 'VIC',
    'HR BP': 'HRB',
    'HR Manager': 'HRM',
    'HR Executive': 'HRE',
    'Team Manager': 'TMG',
    'Team Leader': 'TLD',
    'Employee': 'EMP'
  };
  return abbreviations[role] || 'EMP';
};

// Static method to generate next employee ID for a role
userSchema.statics.generateNextEmployeeId = async function(role) {
  try {
    const abbreviation = this.getRoleAbbreviation(role);
    
    // Find all users with this role to get the count
    const usersWithRole = await this.find({ role: role });
    const nextNumber = usersWithRole.length + 1;
    
    // Format: ADM001, VIC002, etc.
    const employeeId = abbreviation + String(nextNumber).padStart(3, '0');
    
    // Check if this employee ID already exists (in case of manual assignments)
    const existingUser = await this.findOne({ employeeId: employeeId });
    if (existingUser) {
      // If exists, find the highest number for this role and increment
      const rolePattern = new RegExp(`^${abbreviation}\\d{3}$`);
      const existingIds = await this.find({ 
        employeeId: { $regex: rolePattern } 
      }).select('employeeId');
      
      let maxNumber = 0;
      existingIds.forEach(user => {
        if (user.employeeId) {
          const number = parseInt(user.employeeId.substring(3));
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      });
      
      return abbreviation + String(maxNumber + 1).padStart(3, '0');
    }
    
    return employeeId;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    throw error;
  }
};

// Transform output (remove password from JSON)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);

const { validationResult } = require('express-validator');
const User = require('../models/User');
const Team = require('../models/Team');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, VP, HR roles, Team Leaders, Team Managers)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, department, search } = req.query;
    
    // Build query
    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (department) {
      query.department = department;
    }
    
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { employeeId: new RegExp(search, 'i') }
      ];
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name code')
      .populate('team', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'firstName lastName email');

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('department', 'name code')
      .populate('team', 'name code')
      .populate('createdBy', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({ 
      success: true,
      user 
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin, VP, HR roles, Team Leaders, Team Managers)
const createUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role = 'Employee',
      department,
      employeeId,
      phoneNumber,
      designation,
      joiningDate,
      isActive = true,
      teamId // New field for team assignment
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if employeeId already exists (if provided)
    if (employeeId) {
      const existingEmployeeId = await User.findOne({ employeeId });
      if (existingEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }
    }

    // Validate team assignment if provided
    let team = null;
    if (teamId) {
      team = await Team.findById(teamId);
      if (!team) {
        return res.status(400).json({
          success: false,
          message: 'Invalid team selected'
        });
      }

      // Check if team has capacity
      if (team.members.length >= team.maxSize) {
        return res.status(400).json({
          success: false,
          message: 'Selected team is at maximum capacity'
        });
      }

      // Only allow Employee role users to be assigned as regular team members
      if (role !== 'Employee') {
        return res.status(400).json({
          success: false,
          message: 'Only Employee role users can be assigned to teams during creation. Team Managers and Team Leaders are assigned through Team Management.'
        });
      }
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      department,
      employeeId,
      phoneNumber,
      designation,
      joiningDate: joiningDate || new Date(),
      isActive,
      team: teamId || null, // Set team reference
      createdBy: req.user._id
    });

    await user.save();

    // If team is assigned, add user to team members
    if (team) {
      team.members.push({
        user: user._id,
        role: 'Member',
        joinedDate: new Date()
      });
      await team.save();
    }

    res.status(201).json({
      success: true,
      message: team ? 'User created and assigned to team successfully' : 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        team: user.team,
        employeeId: user.employeeId,
        phoneNumber: user.phoneNumber,
        designation: user.designation,
        joiningDate: user.joiningDate,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check permissions
    const currentUserLevel = req.user.getRoleLevel();
    const targetUserLevel = user.getRoleLevel();

    // Users can only update their own profile or users with lower authority
    if (req.user._id.toString() !== user._id.toString() && currentUserLevel >= targetUserLevel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot update user with equal or higher authority.'
      });
    }

    const {
      firstName,
      lastName,
      department,
      phoneNumber,
      designation,
      role,
      isActive
    } = req.body;

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (designation) user.designation = designation;

    // Only users except 'Employee' role can change roles and active status
    if (req.user.role !== 'Employee') {
      if (role) user.role = role;
      if (typeof isActive === 'boolean') user.isActive = isActive;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        phoneNumber: user.phoneNumber,
        designation: user.designation,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting admin users
    if (user.role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get all roles
// @route   GET /api/users/roles
// @access  Private
const getRoles = async (req, res) => {
  try {
    const roles = User.getRoles();
    res.json({ 
      success: true,
      roles 
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching roles'
    });
  }
};

// @desc    Get next employee ID for a role
// @route   GET /api/users/next-employee-id/:role
// @access  Private
const getNextEmployeeId = async (req, res) => {
  try {
    const { role } = req.params;
    
    // Validate role
    const validRoles = User.getRoles();
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    const nextEmployeeId = await User.generateNextEmployeeId(role);
    
    res.json({
      success: true,
      employeeId: nextEmployeeId,
      role: role
    });
  } catch (error) {
    console.error('Get next employee ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating employee ID',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get role statistics
// @route   GET /api/users/roles/stats
// @access  Private
const getRoleStats = async (req, res) => {
  try {
    const roles = User.getRoles();
    const roleStats = [];
    
    // Get count for each role
    for (const role of roles) {
      const count = await User.countDocuments({ role, isActive: true });
      const totalCount = await User.countDocuments({ role });
      
      roleStats.push({
        role,
        activeCount: count,
        totalCount,
        inactiveCount: totalCount - count
      });
    }
    
    // Get total user count
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    
    res.json({
      success: true,
      roleStats,
      summary: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers
      }
    });
  } catch (error) {
    console.error('Get role stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching role statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get users by role
// @route   GET /api/users/roles/:role/users
// @access  Private
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 10, status = 'all' } = req.query;
    
    // Validate role
    const validRoles = User.getRoles();
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }
    
    // Build query
    let query = { role };
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .populate('department', 'name code')
      .populate('team', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      role,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users by role',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getNextEmployeeId,
  getRoleStats,
  getUsersByRole
};

const Department = require('../models/Department');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { validationResult } = require('express-validator');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
const getAllDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    
    // Build query
    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Execute query with pagination
    const departments = await Department.find(query)
      .populate('headOfDepartment', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Department.countDocuments(query);
    
    // Get employee count for each department
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await User.countDocuments({ department: dept._id, isActive: true });
        return {
          ...dept.toObject(),
          employeeCount
        };
      })
    );
    
    res.json({
      departments: departmentsWithCount,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
    
  } catch (error) {
    console.error('Get all departments error:', error);
    res.status(500).json({
      message: 'Server error while fetching departments',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get department by ID
// @route   GET /api/departments/:id
// @access  Private
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('headOfDepartment', 'firstName lastName email employeeId')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!department) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }
    
    // Get employee count and list
    const employees = await User.find({ department: department._id, isActive: true })
      .select('firstName lastName email employeeId role')
      .sort({ firstName: 1 });
    
    res.json({
      department: {
        ...department.toObject(),
        employeeCount: employees.length,
        employees
      }
    });
    
  } catch (error) {
    console.error('Get department by ID error:', error);
    res.status(500).json({
      message: 'Server error while fetching department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (Admin, VP, HR BP, HR Manager)
const createDepartment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { name, code, description, headOfDepartment, budget, location } = req.body;
    
    // Check if department already exists
    const existingDepartment = await Department.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${name}$`, 'i') } },
        { code: code.toUpperCase() }
      ]
    });
    
    if (existingDepartment) {
      return res.status(400).json({
        message: 'Department with this name or code already exists'
      });
    }
    
    // Validate head of department if provided
    if (headOfDepartment) {
      const headUser = await User.findById(headOfDepartment);
      if (!headUser) {
        return res.status(400).json({
          message: 'Head of department user not found'
        });
      }
    }
    
    // Create new department
    const department = new Department({
      name,
      code: code.toUpperCase(),
      description,
      headOfDepartment,
      budget,
      location,
      createdBy: req.user._id
    });
    
    await department.save();
    
    // Populate the created department
    await department.populate('headOfDepartment', 'firstName lastName email');
    await department.populate('createdBy', 'firstName lastName');
    
    // Log activity
    await AuditLog.logActivity({
      user: req.user._id,
      action: 'CREATE',
      resource: 'Department',
      resourceId: department._id,
      details: `Created department: ${department.name}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      message: 'Department created successfully',
      department
    });
    
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      message: 'Server error while creating department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin, VP, HR BP, HR Manager, HR Executive, Team Manager, Team Leader)
const updateDepartment = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }
    
    const { name, code, description, headOfDepartment, budget, location, isActive } = req.body;
    
    // Store old values for audit log
    const oldValues = {
      name: department.name,
      code: department.code,
      description: department.description,
      headOfDepartment: department.headOfDepartment,
      budget: department.budget,
      location: department.location,
      isActive: department.isActive
    };
    
    // Check if name or code conflicts with other departments
    if (name || code) {
      const conflictQuery = {
        _id: { $ne: department._id }
      };
      
      if (name && code) {
        conflictQuery.$or = [
          { name: { $regex: new RegExp(`^${name}$`, 'i') } },
          { code: code.toUpperCase() }
        ];
      } else if (name) {
        conflictQuery.name = { $regex: new RegExp(`^${name}$`, 'i') };
      } else if (code) {
        conflictQuery.code = code.toUpperCase();
      }
      
      const existingDepartment = await Department.findOne(conflictQuery);
      if (existingDepartment) {
        return res.status(400).json({
          message: 'Department with this name or code already exists'
        });
      }
    }
    
    // Validate head of department if provided
    if (headOfDepartment) {
      const headUser = await User.findById(headOfDepartment);
      if (!headUser) {
        return res.status(400).json({
          message: 'Head of department user not found'
        });
      }
    }
    
    // Update fields
    if (name) department.name = name;
    if (code) department.code = code.toUpperCase();
    if (description !== undefined) department.description = description;
    if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment;
    if (budget !== undefined) department.budget = budget;
    if (location !== undefined) department.location = location;
    if (typeof isActive === 'boolean') department.isActive = isActive;
    
    department.updatedBy = req.user._id;
    
    await department.save();
    
    // Populate the updated department
    await department.populate('headOfDepartment', 'firstName lastName email');
    await department.populate('updatedBy', 'firstName lastName');
    
    // Log activity
    await AuditLog.logActivity({
      user: req.user._id,
      action: 'UPDATE',
      resource: 'Department',
      resourceId: department._id,
      details: `Updated department: ${department.name}`,
      oldValues,
      newValues: {
        name: department.name,
        code: department.code,
        description: department.description,
        headOfDepartment: department.headOfDepartment,
        budget: department.budget,
        location: department.location,
        isActive: department.isActive
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: 'Department updated successfully',
      department
    });
    
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      message: 'Server error while updating department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin, VP, HR BP, HR Manager, HR Executive, Team Manager, Team Leader)
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        message: 'Department not found'
      });
    }
    
    // Check if department has employees
    const employeeCount = await User.countDocuments({ department: department._id });
    if (employeeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete department. It has ${employeeCount} employee(s) assigned.`
      });
    }
    
    await Department.findByIdAndDelete(req.params.id);
    
    // Log activity
    await AuditLog.logActivity({
      user: req.user._id,
      action: 'DELETE',
      resource: 'Department',
      resourceId: department._id,
      details: `Deleted department: ${department.name}`,
      severity: 'HIGH',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: 'Department deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      message: 'Server error while deleting department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get department statistics
// @route   GET /api/departments/stats
// @access  Private (Admin, VP, HR BP, HR Manager)
const getDepartmentStats = async (req, res) => {
  try {
    const totalDepartments = await Department.countDocuments();
    const activeDepartments = await Department.countDocuments({ isActive: true });
    
    // Get department with employee counts
    const departmentStats = await Department.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'department',
          as: 'employees'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          isActive: 1,
          employeeCount: { $size: '$employees' },
          activeEmployeeCount: {
            $size: {
              $filter: {
                input: '$employees',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          }
        }
      },
      {
        $sort: { employeeCount: -1 }
      }
    ]);
    
    res.json({
      totalDepartments,
      activeDepartments,
      inactiveDepartments: totalDepartments - activeDepartments,
      departmentStats
    });
    
  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      message: 'Server error while fetching department statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
};

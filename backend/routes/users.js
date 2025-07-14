const express = require('express');
const { body } = require('express-validator');
const { auth, roleAccess } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  getNextEmployeeId
} = require('../controllers/userController');

const router = express.Router();

// @route   GET /api/users/roles
// @desc    Get all available roles
// @access  Private
router.get('/roles', auth, getRoles);

// @route   GET /api/users/next-employee-id/:role
// @desc    Get next employee ID for a role
// @access  Private (Admin, VP, HR roles)
router.get('/next-employee-id/:role', auth, roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']), getNextEmployeeId);

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin, VP, HR roles, Team Leaders, Team Managers)
router.get('/', auth, roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']), getAllUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, getUserById);

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin, VP, HR roles, Team Leaders, Team Managers)
router.post('/', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('role')
    .optional()
    .isIn(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name must be less than 100 characters'),
  body('employeeId')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Employee ID cannot be empty if provided'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must be less than 100 characters')
], createUser);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private
router.put('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('role')
    .optional()
    .isIn(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee'])
    .withMessage('Invalid role specified'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department name must be less than 100 characters'),
  body('phoneNumber')
    .optional()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  body('designation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Designation must be less than 100 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
], updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin and HR roles)
router.delete('/:id', auth, roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']), deleteUser);

module.exports = router;

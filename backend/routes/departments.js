const express = require('express');
const { body } = require('express-validator');
const { auth, roleAccess } = require('../middleware/auth');
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStats
} = require('../controllers/departmentController');

const router = express.Router();

// @route   GET /api/departments/stats
// @desc    Get department statistics
// @access  Private (Admin, VP, HR BP, HR Manager)
router.get('/stats', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager'])
], getDepartmentStats);

// @route   GET /api/departments
// @desc    Get all departments
// @access  Private
router.get('/', auth, getAllDepartments);

// @route   GET /api/departments/:id
// @desc    Get department by ID
// @access  Private
router.get('/:id', auth, getDepartmentById);

// @route   POST /api/departments
// @desc    Create new department
// @access  Private (Admin, VP, HR BP, HR Manager)
router.post('/', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager']),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department name is required and must be less than 100 characters'),
  body('code')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Department code is required and must be less than 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Department code must contain only uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('headOfDepartment')
    .optional()
    .isMongoId()
    .withMessage('Invalid head of department ID'),
  body('budget')
    .optional()
    .isNumeric()
    .withMessage('Budget must be a number')
    .custom(value => value >= 0)
    .withMessage('Budget cannot be negative'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters')
], createDepartment);

// @route   PUT /api/departments/:id
// @desc    Update department
// @access  Private (Admin, VP, HR BP, HR Manager, HR Executive, Team Manager, Team Leader)
router.put('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Department name must be less than 100 characters'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Department code must be less than 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Department code must contain only uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('headOfDepartment')
    .optional()
    .isMongoId()
    .withMessage('Invalid head of department ID'),
  body('budget')
    .optional()
    .isNumeric()
    .withMessage('Budget must be a number')
    .custom(value => value >= 0)
    .withMessage('Budget cannot be negative'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location cannot exceed 200 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], updateDepartment);

// @route   DELETE /api/departments/:id
// @desc    Delete department
// @access  Private (Admin, VP, HR BP, HR Manager, HR Executive, Team Manager, Team Leader)
router.delete('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader'])
], deleteDepartment);

module.exports = router;

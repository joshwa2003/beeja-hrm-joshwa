const express = require('express');
const { body, param } = require('express-validator');
const { auth, roleAccess } = require('../middleware/auth');
const {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getMyManagedTeams,
  getMyTeam
} = require('../controllers/teamController');

const router = express.Router();

// @desc    Get all teams
// @route   GET /api/teams
// @access  Private (Admin, VP, HR roles, Team Managers, Team Leaders)
router.get('/', 
  auth, 
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']), 
  getAllTeams
);

// @desc    Get teams managed by current user
// @route   GET /api/teams/my-teams
// @access  Private (Team Managers only)
router.get('/my-teams', 
  auth, 
  roleAccess(['Team Manager']), 
  getMyManagedTeams
);

// @desc    Get team led by current user
// @route   GET /api/teams/my-team
// @access  Private (Team Leaders only)
router.get('/my-team', 
  auth, 
  roleAccess(['Team Leader']), 
  getMyTeam
);

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private (Admin, VP, HR roles, assigned Team Manager, Team Leader)
router.get('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader']),
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID')
], getTeamById);

// @desc    Create new team
// @route   POST /api/teams
// @access  Private (Admin, VP, HR roles only)
router.post('/', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ max: 100 })
    .withMessage('Team name cannot exceed 100 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Team code is required')
    .isLength({ max: 10 })
    .withMessage('Team code cannot exceed 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Team code must contain only uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('department')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid department ID'),
  body('teamManager')
    .optional()
    .isMongoId()
    .withMessage('Invalid team manager ID'),
  body('teamLeader')
    .optional()
    .isMongoId()
    .withMessage('Invalid team leader ID'),
  body('maxSize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max size must be between 1 and 50')
], createTeam);

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
router.put('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager']),
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Team name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Team name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('teamManager')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Invalid team manager ID'),
  body('teamLeader')
    .optional()
    .custom((value) => {
      if (value === null || value === '') return true;
      return /^[0-9a-fA-F]{24}$/.test(value);
    })
    .withMessage('Invalid team leader ID'),
  body('maxSize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Max size must be between 1 and 50'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
], updateTeam);

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (Admin, VP, HR roles only)
router.delete('/:id', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']),
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID')
], deleteTeam);

// @desc    Add member to team
// @route   POST /api/teams/:id/members
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
router.post('/:id/members', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager']),
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('role')
    .optional()
    .isIn(['Member', 'Senior Member', 'Lead'])
    .withMessage('Invalid member role')
], addTeamMember);

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
router.delete('/:id/members/:userId', [
  auth,
  roleAccess(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager']),
  param('id')
    .isMongoId()
    .withMessage('Invalid team ID'),
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
], removeTeamMember);

module.exports = router;

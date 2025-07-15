const Team = require('../models/Team');
const User = require('../models/User');
const Department = require('../models/Department');
const { validationResult } = require('express-validator');

// @desc    Get all teams with role-based filtering
// @route   GET /api/teams
// @access  Private (Admin, VP, HR roles, Team Managers, Team Leaders)
const getAllTeams = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, department, isActive } = req.query;
    const user = req.user;

    // Build query based on user role
    let query = {};

    // Role-based filtering
    if (user.role === 'Team Manager') {
      // Team Managers can only see teams assigned to them
      query.teamManager = user._id;
    } else if (user.role === 'Team Leader') {
      // Team Leaders can only see their own team
      query.teamLeader = user._id;
    }
    // Admin, VP, HR roles can see all teams (no additional filtering)

    // Apply additional filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (department) {
      query.department = department;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'department', select: 'name code' },
        { path: 'teamManager', select: 'firstName lastName email employeeId' },
        { path: 'teamLeader', select: 'firstName lastName email employeeId' },
        { path: 'members.user', select: 'firstName lastName email employeeId' },
        { path: 'createdBy', select: 'firstName lastName' }
      ],
      sort: { createdAt: -1 }
    };

    const teams = await Team.paginate(query, options);

    // Clean up broken member references in all teams
    let hasAnyChanges = false;
    for (const team of teams.docs) {
      if (team.members && team.members.length > 0) {
        const originalLength = team.members.length;
        team.members = team.members.filter(member => member.user !== null);
        
        if (team.members.length !== originalLength) {
          hasAnyChanges = true;
          console.log(`Cleaned up ${originalLength - team.members.length} broken member references from team ${team.name}`);
          await team.save();
        }
      }
    }

    res.status(200).json({
      success: true,
      teams: teams.docs,
      totalPages: teams.totalPages,
      currentPage: teams.page,
      total: teams.totalDocs,
      hasNextPage: teams.hasNextPage,
      hasPrevPage: teams.hasPrevPage
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teams',
      error: error.message
    });
  }
};

// @desc    Get team by ID
// @route   GET /api/teams/:id
// @access  Private (Admin, VP, HR roles, assigned Team Manager, Team Leader)
const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const team = await Team.findById(id)
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId role')
      .populate('createdBy', 'firstName lastName');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check access permissions
    const hasAccess = 
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(user.role) ||
      (user.role === 'Team Manager' && team.teamManager && team.teamManager._id.toString() === user._id.toString()) ||
      (user.role === 'Team Leader' && team.teamLeader && team.teamLeader._id.toString() === user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view teams you are assigned to.'
      });
    }

    // Clean up broken member references (members with null user)
    let hasChanges = false;
    if (team.members && team.members.length > 0) {
      const originalLength = team.members.length;
      team.members = team.members.filter(member => member.user !== null);
      
      if (team.members.length !== originalLength) {
        hasChanges = true;
        console.log(`Cleaned up ${originalLength - team.members.length} broken member references from team ${team.name}`);
      }
    }

    // Save the team if we cleaned up broken references
    if (hasChanges) {
      await team.save();
    }

    res.status(200).json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get team by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team',
      error: error.message
    });
  }
};

// @desc    Create new team
// @route   POST /api/teams
// @access  Private (Admin, VP, HR roles only)
const createTeam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, code, description, department, teamManager, teamLeader, maxSize } = req.body;

    // Check if team name already exists (globally or in department if provided)
    const nameQuery = { name: { $regex: new RegExp(`^${name}$`, 'i') } };
    if (department) {
      nameQuery.department = department;
    }
    const existingTeam = await Team.findOne(nameQuery);
    
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        message: department ? 
          'A team with this name already exists in the selected department' :
          'A team with this name already exists'
      });
    }

    // Check if team code already exists (globally or in department if provided)
    const codeQuery = { code: code.toUpperCase() };
    if (department) {
      codeQuery.department = department;
    }
    const existingCode = await Team.findOne(codeQuery);
    
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: department ?
          'A team with this code already exists in the selected department' :
          'A team with this code already exists'
      });
    }

    // Validate department exists (if provided)
    if (department) {
      const departmentDoc = await Department.findById(department);
      if (!departmentDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department selected'
        });
      }
    }

    // Validate team manager if provided
    if (teamManager) {
      const managerUser = await User.findById(teamManager);
      if (!managerUser || managerUser.role !== 'Team Manager') {
        return res.status(400).json({
          success: false,
          message: 'Invalid team manager selected. User must have Team Manager role.'
        });
      }
    }

    // Validate team leader if provided
    if (teamLeader) {
      const leaderUser = await User.findById(teamLeader);
      if (!leaderUser || leaderUser.role !== 'Team Leader') {
        return res.status(400).json({
          success: false,
          message: 'Invalid team leader selected. User must have Team Leader role.'
        });
      }
    }

    const team = new Team({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim(),
      department: department || null,
      teamManager: teamManager || null,
      teamLeader: teamLeader || null,
      maxSize: maxSize || 10,
      createdBy: req.user._id
    });

    await team.save();

    // Populate the created team
    const populatedTeam = await Team.findById(team._id)
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team: populatedTeam
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create team',
      error: error.message
    });
  }
};

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
const updateTeam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const user = req.user;
    const { name, description, teamManager, teamLeader, maxSize, isActive } = req.body;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions
    const canEdit = 
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(user.role) ||
      (user.role === 'Team Manager' && team.teamManager && team.teamManager.toString() === user._id.toString());

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit teams assigned to you.'
      });
    }

    // Team Managers can only edit certain fields
    if (user.role === 'Team Manager') {
      // Team Managers can update description, maxSize, and teamLeader, but not name, teamManager, or isActive
      if (name || teamManager || isActive !== undefined) {
        return res.status(403).json({
          success: false,
          message: 'Team Managers can only update team description, max team size, and team leader.'
        });
      }
    }

    // Check if new name conflicts (if name is being changed)
    if (name && name !== team.name) {
      const existingTeam = await Team.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') }, 
        department: team.department,
        _id: { $ne: id }
      });
      
      if (existingTeam) {
        return res.status(400).json({
          success: false,
          message: 'A team with this name already exists in the department'
        });
      }
    }

    // Validate team manager if being changed
    if (teamManager && teamManager !== team.teamManager?.toString()) {
      const managerUser = await User.findById(teamManager);
      if (!managerUser || managerUser.role !== 'Team Manager') {
        return res.status(400).json({
          success: false,
          message: 'Invalid team manager selected. User must have Team Manager role.'
        });
      }
    }

    // Validate team leader if being changed
    if (teamLeader && teamLeader !== team.teamLeader?.toString()) {
      const leaderUser = await User.findById(teamLeader);
      if (!leaderUser || leaderUser.role !== 'Team Leader') {
        return res.status(400).json({
          success: false,
          message: 'Invalid team leader selected. User must have Team Leader role.'
        });
      }
    }

    // Update fields based on role permissions
    const updateData = { updatedBy: user._id };
    let teamLeaderChanged = false;
    
    if (user.role !== 'Team Manager') {
      // Admin/HR can update all fields
      if (name) updateData.name = name.trim();
      if (teamManager !== undefined) updateData.teamManager = teamManager || null;
      if (teamLeader !== undefined) {
        updateData.teamLeader = teamLeader || null;
        teamLeaderChanged = teamLeader !== team.teamLeader?.toString();
      }
      if (maxSize !== undefined) updateData.maxSize = maxSize;
      if (isActive !== undefined) updateData.isActive = isActive;
    } else {
      // Team Managers can update description, maxSize, and teamLeader
      if (teamLeader !== undefined) {
        updateData.teamLeader = teamLeader || null;
        teamLeaderChanged = teamLeader !== team.teamLeader?.toString();
      }
      if (maxSize !== undefined) updateData.maxSize = maxSize;
    }
    
    // Both Admin/HR and Team Managers can update description
    if (description !== undefined) updateData.description = description?.trim();

    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId')
      .populate('updatedBy', 'firstName lastName');

    // If team leader changed, update reporting manager for all team members
    if (teamLeaderChanged && updatedTeam.members.length > 0) {
      const memberUserIds = updatedTeam.members.map(member => member.user._id);
      await User.updateMany(
        { _id: { $in: memberUserIds } },
        { reportingManager: updatedTeam.teamLeader || null }
      );
      console.log(`Updated reporting manager for ${memberUserIds.length} team members`);
    }

    res.status(200).json({
      success: true,
      message: 'Team updated successfully',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update team',
      error: error.message
    });
  }
};

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private (Admin, VP, HR roles only)
const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if team has members
    if (team.members && team.members.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete team with existing members. Please remove all members first.'
      });
    }

    await Team.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete team',
      error: error.message
    });
  }
};

// @desc    Add member to team
// @route   POST /api/teams/:id/members
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
const addTeamMember = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { userId, role = 'Member' } = req.body;
    const user = req.user;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions
    const canManageMembers = 
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(user.role) ||
      (user.role === 'Team Manager' && team.teamManager && team.teamManager.toString() === user._id.toString());

    if (!canManageMembers) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage members of teams assigned to you.'
      });
    }

    // Validate user exists
    const memberUser = await User.findById(userId);
    if (!memberUser) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a member of any team
    // Allow assignment if user has no team or if they're being assigned to the same team
    if (memberUser.team && memberUser.team.toString() !== id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to another team'
      });
    }

    // Only allow Employee role users to be assigned as regular team members
    // Team Managers and Team Leaders are assigned differently
    console.log('Debug - User role:', memberUser.role, 'Assignment role:', role);
    if (role === 'Member' && memberUser.role !== 'Employee') {
      console.log('Debug - Role validation failed. User role:', memberUser.role, 'Expected: Employee');
      return res.status(400).json({
        success: false,
        message: `Only Employee role users can be assigned as team members. User has role: ${memberUser.role}`
      });
    }

    // Check if user is already a member of this team
    const existingMember = team.members.find(member => 
      member.user.toString() === userId.toString()
    );
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this team'
      });
    }

    // Check team capacity
    if (team.members.length >= team.maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Team is at maximum capacity'
      });
    }

    // Add member to team
    team.members.push({
      user: userId,
      role: role,
      joinedDate: new Date()
    });

    // Update user's team field and set reporting manager to team leader
    memberUser.team = id;
    if (team.teamLeader) {
      memberUser.reportingManager = team.teamLeader;
    }
    
    // Save both team and user
    await Promise.all([team.save(), memberUser.save()]);

    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId');

    res.status(200).json({
      success: true,
      message: 'Member added to team successfully',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add team member',
      error: error.message
    });
  }
};

// @desc    Remove member from team
// @route   DELETE /api/teams/:id/members/:userId
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
const removeTeamMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const user = req.user;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions
    const canManageMembers = 
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(user.role) ||
      (user.role === 'Team Manager' && team.teamManager && team.teamManager.toString() === user._id.toString());

    if (!canManageMembers) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage members of teams assigned to you.'
      });
    }

    // Get the user to update their team field
    const memberUser = await User.findById(userId);
    if (!memberUser) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is a member
    const memberIndex = team.members.findIndex(member => 
      member.user.toString() === userId.toString()
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'User is not a member of this team'
      });
    }

    // Remove member from team
    team.members.splice(memberIndex, 1);
    
    // Clear user's team field and reporting manager
    memberUser.team = null;
    memberUser.reportingManager = null;
    
    // Save both team and user
    await Promise.all([team.save(), memberUser.save()]);

    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId');

    res.status(200).json({
      success: true,
      message: 'Member removed from team successfully',
      team: updatedTeam
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove team member',
      error: error.message
    });
  }
};

// @desc    Get teams managed by current user (for Team Managers)
// @route   GET /api/teams/my-teams
// @access  Private (Team Managers)
const getMyManagedTeams = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'Team Manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for Team Managers.'
      });
    }

    const teams = await Team.find({ teamManager: user._id })
      .populate('department', 'name code')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      teams
    });
  } catch (error) {
    console.error('Get managed teams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch managed teams',
      error: error.message
    });
  }
};

// @desc    Get team led by current user (for Team Leaders)
// @route   GET /api/teams/my-team
// @access  Private (Team Leaders)
const getMyTeam = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'Team Leader') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for Team Leaders.'
      });
    }

    const team = await Team.findOne({ teamLeader: user._id })
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId role');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'No team assigned to you as Team Leader'
      });
    }

    res.status(200).json({
      success: true,
      team
    });
  } catch (error) {
    console.error('Get my team error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your team',
      error: error.message
    });
  }
};

// @desc    Get employees not assigned to any team
// @route   GET /api/teams/unassigned-employees
// @access  Private (Admin, VP, HR roles, Team Managers)
const getUnassignedEmployees = async (req, res) => {
  try {
    // Get all team member user IDs
    const teams = await Team.find({}, 'members');
    const assignedUserIds = new Set();
    
    teams.forEach(team => {
      if (team.members && team.members.length > 0) {
        team.members.forEach(member => {
          assignedUserIds.add(member.user.toString());
        });
      }
    });

    // Get all employees not in the assigned list
    const unassignedEmployees = await User.find({
      role: 'Employee',
      _id: { $nin: Array.from(assignedUserIds) },
      isActive: true
    }).select('firstName lastName email employeeId');

    res.status(200).json({
      success: true,
      employees: unassignedEmployees
    });
  } catch (error) {
    console.error('Get unassigned employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unassigned employees',
      error: error.message
    });
  }
};

// @desc    Toggle team status (active/inactive)
// @route   PATCH /api/teams/:id/toggle-status
// @access  Private (Admin, VP, HR roles only)
const toggleTeamStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions - only Admin/HR roles can toggle status
    const canToggleStatus = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(user.role);

    if (!canToggleStatus) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin and HR roles can toggle team status.'
      });
    }

    // Toggle the status
    const newStatus = !team.isActive;
    
    const updatedTeam = await Team.findByIdAndUpdate(
      id,
      { 
        isActive: newStatus,
        updatedBy: user._id 
      },
      { new: true, runValidators: true }
    )
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId')
      .populate('updatedBy', 'firstName lastName');

    res.status(200).json({
      success: true,
      message: `Team ${newStatus ? 'activated' : 'deactivated'} successfully`,
      team: updatedTeam
    });
  } catch (error) {
    console.error('Toggle team status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle team status',
      error: error.message
    });
  }
};

// @desc    Clean up broken member references in a team
// @route   POST /api/teams/:id/cleanup
// @access  Private (Admin, VP, HR roles, assigned Team Manager)
const cleanupTeamMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check permissions
    const canManageMembers = 
      ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'].includes(user.role) ||
      (user.role === 'Team Manager' && team.teamManager && team.teamManager.toString() === user._id.toString());

    if (!canManageMembers) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage members of teams assigned to you.'
      });
    }

    // Clean up broken member references
    let cleanedCount = 0;
    if (team.members && team.members.length > 0) {
      const originalLength = team.members.length;
      team.members = team.members.filter(member => member.user !== null);
      cleanedCount = originalLength - team.members.length;
      
      if (cleanedCount > 0) {
        await team.save();
        console.log(`Cleaned up ${cleanedCount} broken member references from team ${team.name}`);
      }
    }

    // Return updated team
    const updatedTeam = await Team.findById(id)
      .populate('department', 'name code')
      .populate('teamManager', 'firstName lastName email employeeId')
      .populate('teamLeader', 'firstName lastName email employeeId')
      .populate('members.user', 'firstName lastName email employeeId');

    res.status(200).json({
      success: true,
      message: cleanedCount > 0 ? 
        `Cleaned up ${cleanedCount} broken member reference(s)` : 
        'No broken references found',
      team: updatedTeam,
      cleanedCount
    });
  } catch (error) {
    console.error('Cleanup team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup team members',
      error: error.message
    });
  }
};

module.exports = {
  getAllTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getMyManagedTeams,
  getMyTeam,
  getUnassignedEmployees,
  toggleTeamStatus,
  cleanupTeamMembers
};

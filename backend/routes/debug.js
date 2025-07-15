const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const Leave = require('../models/Leave');
const { auth } = require('../middleware/auth');

// @desc    Debug user-team relationships
// @route   GET /api/debug/user-team-relationships
// @access  Private (Admin, HR roles only)
router.get('/user-team-relationships', auth, async (req, res) => {
  try {
    // Check if user has admin/HR permissions
    const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for Admin and HR roles.'
      });
    }

    // Get all employees with their team and reporting manager info
    const employees = await User.find({ 
      role: 'Employee', 
      isActive: true 
    })
    .populate('team', 'name code teamLeader')
    .populate('reportingManager', 'firstName lastName email role')
    .select('firstName lastName email team reportingManager')
    .sort({ firstName: 1 });

    // Get all team leaders
    const teamLeaders = await User.find({ 
      role: 'Team Leader', 
      isActive: true 
    })
    .select('firstName lastName email')
    .sort({ firstName: 1 });

    // Get teams with their leaders and members
    const teams = await Team.find({ isActive: true })
    .populate('teamLeader', 'firstName lastName email')
    .populate('members.user', 'firstName lastName email')
    .select('name code teamLeader members')
    .sort({ name: 1 });

    // Analyze issues
    const issues = [];
    const employeesWithoutTeam = [];
    const employeesWithoutReportingManager = [];
    const mismatchedRelationships = [];

    employees.forEach(emp => {
      if (!emp.team) {
        employeesWithoutTeam.push({
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email
        });
      }

      if (!emp.reportingManager) {
        employeesWithoutReportingManager.push({
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          team: emp.team ? emp.team.name : 'No team'
        });
      }

      // Check if team's team leader matches employee's reporting manager
      if (emp.team && emp.team.teamLeader && emp.reportingManager) {
        if (emp.team.teamLeader.toString() !== emp.reportingManager._id.toString()) {
          mismatchedRelationships.push({
            employee: `${emp.firstName} ${emp.lastName}`,
            email: emp.email,
            team: emp.team.name,
            teamLeader: emp.team.teamLeader,
            reportingManager: `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}`
          });
        }
      }
    });

    // Count direct reports for each team leader
    const teamLeaderStats = await User.aggregate([
      {
        $match: { role: 'Team Leader', isActive: true }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'reportingManager',
          as: 'directReports'
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          reportCount: { $size: '$directReports' },
          directReports: {
            $map: {
              input: '$directReports',
              as: 'report',
              in: {
                name: { $concat: ['$$report.firstName', ' ', '$$report.lastName'] },
                email: '$$report.email'
              }
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      summary: {
        totalEmployees: employees.length,
        totalTeamLeaders: teamLeaders.length,
        totalTeams: teams.length,
        employeesWithoutTeam: employeesWithoutTeam.length,
        employeesWithoutReportingManager: employeesWithoutReportingManager.length,
        mismatchedRelationships: mismatchedRelationships.length
      },
      issues: {
        employeesWithoutTeam,
        employeesWithoutReportingManager,
        mismatchedRelationships
      },
      teamLeaderStats,
      teams: teams.map(team => ({
        name: team.name,
        code: team.code,
        teamLeader: team.teamLeader ? 
          `${team.teamLeader.firstName} ${team.teamLeader.lastName}` : 
          'No team leader assigned',
        memberCount: team.members.length,
        members: team.members.map(member => 
          member.user ? `${member.user.firstName} ${member.user.lastName}` : 'Broken reference'
        )
      }))
    });

  } catch (error) {
    console.error('Debug user-team relationships error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch debug information',
      error: error.message
    });
  }
});

// @desc    Debug leave request routing
// @route   GET /api/debug/leave-routing/:userId
// @access  Private (Admin, HR roles only)
router.get('/leave-routing/:userId', auth, async (req, res) => {
  try {
    // Check if user has admin/HR permissions
    const allowedRoles = ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This endpoint is only for Admin and HR roles.'
      });
    }

    const { userId } = req.params;

    // Get user with all related information
    const user = await User.findById(userId)
      .populate('team', 'name code teamLeader teamManager')
      .populate('reportingManager', 'firstName lastName email role')
      .populate({
        path: 'team',
        populate: {
          path: 'teamLeader',
          select: 'firstName lastName email role'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's leave requests
    const leaveRequests = await Leave.find({ employee: userId })
      .populate('tlApprovedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .sort({ appliedDate: -1 })
      .limit(5);

    // Check if team leader can see this user's requests
    let teamLeaderCanSeeRequests = false;
    if (user.reportingManager) {
      const teamLeaderRequests = await User.find({
        reportingManager: user.reportingManager._id,
        isActive: true
      }).select('_id');
      
      teamLeaderCanSeeRequests = teamLeaderRequests.some(
        emp => emp._id.toString() === userId.toString()
      );
    }

    res.json({
      success: true,
      user: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      },
      teamInfo: {
        hasTeam: !!user.team,
        teamName: user.team?.name || 'No team assigned',
        teamCode: user.team?.code || 'N/A',
        teamLeader: user.team?.teamLeader ? 
          `${user.team.teamLeader.firstName} ${user.team.teamLeader.lastName}` : 
          'No team leader assigned'
      },
      reportingInfo: {
        hasReportingManager: !!user.reportingManager,
        reportingManager: user.reportingManager ? 
          `${user.reportingManager.firstName} ${user.reportingManager.lastName}` : 
          'No reporting manager assigned',
        reportingManagerRole: user.reportingManager?.role || 'N/A'
      },
      leaveRequestRouting: {
        canSubmitLeaveRequests: !!user.reportingManager,
        teamLeaderCanSeeRequests,
        routingIssues: []
      },
      recentLeaveRequests: leaveRequests.map(leave => ({
        id: leave._id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        status: leave.status,
        appliedDate: leave.appliedDate,
        tlApprovedBy: leave.tlApprovedBy ? 
          `${leave.tlApprovedBy.firstName} ${leave.tlApprovedBy.lastName}` : 
          null,
        approvedBy: leave.approvedBy ? 
          `${leave.approvedBy.firstName} ${leave.approvedBy.lastName}` : 
          null
      }))
    });

  } catch (error) {
    console.error('Debug leave routing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave routing debug information',
      error: error.message
    });
  }
});

module.exports = router;

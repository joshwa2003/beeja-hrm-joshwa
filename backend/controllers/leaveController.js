const Leave = require('../models/Leave');
const User = require('../models/User');
const mongoose = require('mongoose');

// Employee endpoints
const submitLeaveRequest = async (req, res) => {
  try {
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      isHalfDay,
      halfDayPeriod,
      handoverNotes,
      emergencyContact
    } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({
        message: 'Start date cannot be in the past'
      });
    }

    if (end < start) {
      return res.status(400).json({
        message: 'End date must be after start date'
      });
    }

    // Check for overlapping leave requests
    const overlappingLeave = await Leave.findOne({
      employee: req.user.id,
      status: { $in: ['Pending', 'Approved by TL', 'Approved'] },
      $or: [
        {
          startDate: { $lte: end },
          endDate: { $gte: start }
        }
      ]
    });

    if (overlappingLeave) {
      return res.status(400).json({
        message: 'You already have a leave request for overlapping dates'
      });
    }

    // Get user details for leave balance check
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate leave days
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    const totalDays = isHalfDay && daysDiff === 1 ? 0.5 : daysDiff;

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const usedLeaves = await Leave.getLeaveBalance(req.user.id, currentYear);
    
    const leaveTypeMap = {
      'Casual': 'casual',
      'Sick': 'sick',
      'Earned': 'earned',
      'Maternity': 'maternity',
      'Paternity': 'paternity'
    };

    const balanceField = leaveTypeMap[leaveType];
    if (balanceField && user.leaveBalance[balanceField] !== undefined) {
      const availableBalance = user.leaveBalance[balanceField] - (usedLeaves[leaveType] || 0);
      if (totalDays > availableBalance) {
        return res.status(400).json({
          message: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${totalDays} days`
        });
      }
    }

    // Create leave request
    const leaveRequest = new Leave({
      employee: req.user.id,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      isHalfDay: isHalfDay || false,
      halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
      handoverNotes,
      emergencyContact,
      status: 'Pending',
      createdBy: req.user.id
    });

    await leaveRequest.save();

    // Populate employee details for response
    await leaveRequest.populate('employee', 'firstName lastName email employeeId department designation');

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest
    });

  } catch (error) {
    console.error('Submit leave request error:', error);
    res.status(500).json({
      message: 'Failed to submit leave request',
      error: error.message
    });
  }
};

const getMyLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, leaveType, year } = req.query;
    
    const query = { employee: req.user.id };
    
    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }
    
    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);
      query.startDate = { $gte: startOfYear, $lte: endOfYear };
    }

    const skip = (page - 1) * limit;
    
    const [leaveRequests, totalCount] = await Promise.all([
      Leave.find(query)
        .populate('employee', 'firstName lastName email employeeId')
        .populate('approvedBy', 'firstName lastName email')
        .sort({ appliedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      leaveRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

const getMyLeaveBalance = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const usedLeaves = await Leave.getLeaveBalance(req.user.id, year);
    
    const leaveBalance = {
      casual: {
        total: user.leaveBalance.casual,
        used: usedLeaves.Casual || 0,
        available: user.leaveBalance.casual - (usedLeaves.Casual || 0)
      },
      sick: {
        total: user.leaveBalance.sick,
        used: usedLeaves.Sick || 0,
        available: user.leaveBalance.sick - (usedLeaves.Sick || 0)
      },
      earned: {
        total: user.leaveBalance.earned,
        used: usedLeaves.Earned || 0,
        available: user.leaveBalance.earned - (usedLeaves.Earned || 0)
      },
      maternity: {
        total: user.leaveBalance.maternity,
        used: usedLeaves.Maternity || 0,
        available: user.leaveBalance.maternity - (usedLeaves.Maternity || 0)
      },
      paternity: {
        total: user.leaveBalance.paternity,
        used: usedLeaves.Paternity || 0,
        available: user.leaveBalance.paternity - (usedLeaves.Paternity || 0)
      }
    };

    res.json({ leaveBalance, year: parseInt(year) });

  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({
      message: 'Failed to fetch leave balance',
      error: error.message
    });
  }
};

const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const leaveRequest = await Leave.findOne({
      _id: id,
      employee: req.user.id
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        message: 'Only pending leave requests can be cancelled'
      });
    }

    // Check if leave start date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (leaveRequest.startDate <= today) {
      return res.status(400).json({
        message: 'Cannot cancel leave request that has already started'
      });
    }

    leaveRequest.status = 'Cancelled';
    leaveRequest.updatedBy = req.user.id;
    await leaveRequest.save();

    res.json({
      message: 'Leave request cancelled successfully',
      leaveRequest
    });

  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({
      message: 'Failed to cancel leave request',
      error: error.message
    });
  }
};

// Team Leader endpoints
const getTeamLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, leaveType } = req.query;
    
    // Get team members
    const teamMembers = await User.find({
      reportingManager: req.user.id,
      isActive: true
    }).select('_id');

    const memberIds = teamMembers.map(member => member._id);
    
    const query = { 
      employee: { $in: memberIds },
      // Include all statuses so Team Leader can see complete workflow
      status: { $in: ['Pending', 'Approved by TL', 'Rejected by TL', 'Approved', 'Rejected'] }
    };
    
    // Add filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    const skip = (page - 1) * limit;
    
    const [leaveRequests, totalCount] = await Promise.all([
      Leave.find(query)
        .populate('employee', 'firstName lastName email employeeId department designation')
        .populate('approvedBy', 'firstName lastName email')
        .populate('tlApprovedBy', 'firstName lastName email')
        .sort({ appliedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      leaveRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get team leave requests error:', error);
    res.status(500).json({
      message: 'Failed to fetch team leave requests',
      error: error.message
    });
  }
};

const approveRejectLeaveByTL = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const leaveRequest = await Leave.findById(id)
      .populate('employee', 'firstName lastName email reportingManager');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Check if user is the reporting manager
    if (leaveRequest.employee.reportingManager.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'You are not authorized to approve this leave request' 
      });
    }

    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        message: 'Leave request has already been processed'
      });
    }

    if (action === 'approve') {
      leaveRequest.status = 'Approved by TL';
      leaveRequest.tlApprovedBy = req.user.id;
      leaveRequest.tlApprovedDate = new Date();
      leaveRequest.tlComments = comments;
    } else {
      leaveRequest.status = 'Rejected by TL';
      leaveRequest.rejectionReason = comments;
      leaveRequest.approvedBy = req.user.id;
      leaveRequest.approvedDate = new Date();
    }

    leaveRequest.updatedBy = req.user.id;
    await leaveRequest.save();

    await leaveRequest.populate('tlApprovedBy', 'firstName lastName email');

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest
    });

  } catch (error) {
    console.error('Approve/Reject leave by TL error:', error);
    res.status(500).json({
      message: 'Failed to process leave request',
      error: error.message
    });
  }
};

// HR endpoints
const getHRLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, leaveType, department } = req.query;
    
    const query = {};
    
    // HR can see all requests, but filter based on status
    if (status && status !== 'all') {
      if (status === 'pending-hr') {
        query.status = 'Approved by TL';
      } else {
        query.status = status;
      }
    } else {
      // Default: show requests that need HR attention or are processed by HR
      query.status = { $in: ['Approved by TL', 'Approved', 'Rejected'] };
    }
    
    if (leaveType && leaveType !== 'all') {
      query.leaveType = leaveType;
    }

    const skip = (page - 1) * limit;
    
    let aggregationPipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      {
        $lookup: {
          from: 'departments',
          localField: 'employee.department',
          foreignField: '_id',
          as: 'employee.department'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approvedBy'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'tlApprovedBy',
          foreignField: '_id',
          as: 'tlApprovedBy'
        }
      }
    ];

    // Add department filter if specified
    if (department && department !== 'all') {
      aggregationPipeline.push({
        $match: { 'employee.department._id': new mongoose.Types.ObjectId(department) }
      });
    }

    aggregationPipeline.push(
      { $sort: { appliedDate: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const [leaveRequests, totalCount] = await Promise.all([
      Leave.aggregate(aggregationPipeline),
      Leave.aggregate([
        ...aggregationPipeline.slice(0, -3), // Remove sort, skip, limit
        { $count: 'total' }
      ])
    ]);

    const total = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      leaveRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get HR leave requests error:', error);
    res.status(500).json({
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

const finalApproveRejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comments } = req.body; // action: 'approve' or 'reject'
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const leaveRequest = await Leave.findById(id)
      .populate('employee', 'firstName lastName email leaveBalance');

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'Approved by TL') {
      return res.status(400).json({
        message: 'Leave request must be approved by Team Leader first'
      });
    }

    if (action === 'approve') {
      leaveRequest.status = 'Approved';
      
      // Update employee leave balance
      const leaveTypeMap = {
        'Casual': 'casual',
        'Sick': 'sick',
        'Earned': 'earned',
        'Maternity': 'maternity',
        'Paternity': 'paternity'
      };

      const balanceField = leaveTypeMap[leaveRequest.leaveType];
      if (balanceField && leaveRequest.employee.leaveBalance[balanceField] !== undefined) {
        await User.findByIdAndUpdate(
          leaveRequest.employee._id,
          {
            $inc: { [`leaveBalance.${balanceField}`]: -leaveRequest.totalDays }
          }
        );
      }
    } else {
      leaveRequest.status = 'Rejected';
      leaveRequest.rejectionReason = comments;
    }

    leaveRequest.approvedBy = req.user.id;
    leaveRequest.approvedDate = new Date();
    leaveRequest.hrComments = comments;
    leaveRequest.updatedBy = req.user.id;
    
    await leaveRequest.save();

    await leaveRequest.populate('approvedBy', 'firstName lastName email');

    res.json({
      message: `Leave request ${action}d successfully`,
      leaveRequest
    });

  } catch (error) {
    console.error('Final approve/reject leave error:', error);
    res.status(500).json({
      message: 'Failed to process leave request',
      error: error.message
    });
  }
};

// Common endpoints
const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = [
      { value: 'Casual', label: 'Casual Leave', description: 'For personal reasons' },
      { value: 'Sick', label: 'Sick Leave', description: 'For medical reasons' },
      { value: 'Earned', label: 'Earned Leave', description: 'Annual vacation leave' },
      { value: 'Maternity', label: 'Maternity Leave', description: 'For new mothers' },
      { value: 'Paternity', label: 'Paternity Leave', description: 'For new fathers' },
      { value: 'Emergency', label: 'Emergency Leave', description: 'For urgent situations' },
      { value: 'Unpaid', label: 'Unpaid Leave', description: 'Leave without pay' }
    ];

    res.json({ leaveTypes });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch leave types',
      error: error.message
    });
  }
};

const getLeaveStats = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    let matchQuery = {
      startDate: { $gte: startOfYear, $lte: endOfYear }
    };

    // Role-based filtering
    if (req.user.role === 'Employee') {
      matchQuery.employee = new mongoose.Types.ObjectId(req.user.id);
    } else if (req.user.role === 'Team Leader') {
      const teamMembers = await User.find({
        reportingManager: req.user.id,
        isActive: true
      }).select('_id');
      const memberIds = teamMembers.map(member => member._id);
      matchQuery.employee = { $in: memberIds };
    }

    const stats = await Leave.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          pendingRequests: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          approvedRequests: {
            $sum: { $cond: [{ $in: ['$status', ['Approved', 'Approved by TL']] }, 1, 0] }
          },
          rejectedRequests: {
            $sum: { $cond: [{ $in: ['$status', ['Rejected', 'Rejected by TL']] }, 1, 0] }
          },
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    const result = stats[0] || {
      totalRequests: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      totalDays: 0
    };

    res.json({ stats: result, year: parseInt(year) });

  } catch (error) {
    console.error('Get leave stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch leave statistics',
      error: error.message
    });
  }
};

module.exports = {
  // Employee endpoints
  submitLeaveRequest,
  getMyLeaveRequests,
  getMyLeaveBalance,
  cancelLeaveRequest,
  
  // Team Leader endpoints
  getTeamLeaveRequests,
  approveRejectLeaveByTL,
  
  // HR endpoints
  getHRLeaveRequests,
  finalApproveRejectLeave,
  
  // Common endpoints
  getLeaveTypes,
  getLeaveStats
};

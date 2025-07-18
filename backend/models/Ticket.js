const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Basic Ticket Information
  ticketNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Leave Issue',
      'Attendance Issue', 
      'Regularization Problem',
      'Holiday Calendar Query',
      'WFH / Remote Work Requests',
      'Payroll / Salary Issue',
      'Payslip Not Available',
      'Reimbursement Issue',
      'Tax / TDS / Form-16',
      'Leave Policy Clarification',
      'Performance Review Concern',
      'KPI / Goals Setup Issue',
      'Probation / Confirmation',
      'Training / LMS Access Issue',
      'Certification Issue',
      'Offer Letter / Joining Issue',
      'Referral / Interview Feedback',
      'Resignation Process Query',
      'Final Settlement Delay',
      'Experience Letter Request',
      'HRMS Login Issue',
      'System Bug / App Crash',
      'Document Upload Failed',
      'Office Access / ID Card Lost',
      'General HR Query',
      'Harassment / Grievance',
      'Asset Request / Laptop',
      'Feedback / Suggestion to HR'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Priority and Status
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed', 'Escalated', 'Reopened'],
    default: 'Open'
  },
  
  // User Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Routing Information
  routingRules: {
    autoAssigned: { type: Boolean, default: false },
    assignmentReason: String,
    routedAt: Date
  },
  
  // Manual assignment flag to prevent auto-assignment
  isManuallyAssigned: {
    type: Boolean,
    default: false
  },
  
  // Escalation Information
  escalationLevel: {
    type: Number,
    default: 0 // 0: Initial, 1: HR Manager, 2: HR BP, 3: VP
  },
  escalationHistory: [{
    fromRole: String,
    toRole: String,
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalatedAt: {
      type: Date,
      default: Date.now
    },
    reason: String,
    isAutoEscalation: {
      type: Boolean,
      default: false
    }
  }],
  
  // SLA and Timing
  sla: {
    responseTime: Number, // in hours
    resolutionTime: Number, // in hours
    responseDeadline: Date,
    resolutionDeadline: Date
  },
  
  // Timestamps for tracking
  firstResponseAt: Date,
  lastResponseAt: Date,
  resolvedAt: Date,
  closedAt: Date,
  
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tags and Labels
  tags: [String],
  
  // Feedback and Rating
  feedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    submittedAt: Date
  },
  
  // Internal Notes (visible only to HR)
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Confidential flag for sensitive tickets
  isConfidential: {
    type: Boolean,
    default: false
  },
  
  // Related tickets
  relatedTickets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket'
  }],
  
  // Watchers (users who want to be notified of updates)
  watchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Resolution tracking for new workflow
  resolutionStatus: {
    resolvedByHR: {
      type: Boolean,
      default: false
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionComment: String,
    employeeConfirmed: {
      type: Boolean,
      default: false
    },
    employeeConfirmedAt: Date,
    reopenCount: {
      type: Number,
      default: 0
    },
    maxReopenAllowed: {
      type: Number,
      default: 3
    },
    reopenDeadline: Date, // 3 days from resolution
    lastReopenedAt: Date,
    // New field to track permanent closure by HR
    permanentlyClosedByHR: {
      type: Boolean,
      default: false
    },
    permanentlyClosedAt: Date,
    permanentlyClosedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ 'sla.responseDeadline': 1 });
ticketSchema.index({ 'sla.resolutionDeadline': 1 });

// Virtual for ticket age in hours
ticketSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for response time in hours
ticketSchema.virtual('responseTimeInHours').get(function() {
  if (!this.firstResponseAt) return null;
  return Math.floor((this.firstResponseAt - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for resolution time in hours
ticketSchema.virtual('resolutionTimeInHours').get(function() {
  if (!this.resolvedAt) return null;
  return Math.floor((this.resolvedAt - this.createdAt) / (1000 * 60 * 60));
});

// Pre-save middleware to generate ticket number
ticketSchema.pre('save', async function(next) {
  try {
    if (this.isNew && !this.ticketNumber) {
      this.ticketNumber = await this.constructor.generateTicketNumber();
    }
    
    // Set SLA deadlines based on priority and category
    if (this.isNew || this.isModified('priority') || this.isModified('category')) {
      this.setSLADeadlines();
    }
    
    // Auto-assign based on category ONLY if not manually assigned
    // Check if assignedTo is explicitly set (manual assignment) or not set at all
    if (this.isNew && !this.assignedTo && !this.isManuallyAssigned) {
      await this.autoAssign();
    }
    
    next();
  } catch (error) {
    console.error('Error in ticket pre-save middleware:', error);
    next(error);
  }
});

// Method to generate unique ticket number
ticketSchema.statics.generateTicketNumber = async function() {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    const prefix = `TKT${year}${month}${day}`;
    
    // Find the last ticket number for today
    const lastTicket = await this.findOne({
      ticketNumber: { $regex: `^${prefix}` }
    }).sort({ ticketNumber: -1 });
    
    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.slice(-4));
      sequence = lastSequence + 1;
    }
    
    return `${prefix}${String(sequence).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating ticket number:', error);
    // Fallback to timestamp-based number
    return `TKT${Date.now()}`;
  }
};

// Method to set SLA deadlines
ticketSchema.methods.setSLADeadlines = function() {
  const now = new Date();
  
  // Default SLA times based on priority (in hours)
  const slaMatrix = {
    'Critical': { response: 1, resolution: 4 },
    'High': { response: 4, resolution: 24 },
    'Medium': { response: 8, resolution: 48 },
    'Low': { response: 24, resolution: 72 }
  };
  
  // Special SLA for certain categories
  const categorySLA = {
    'Harassment / Grievance': { response: 1, resolution: 24 },
    'HRMS Login Issue': { response: 2, resolution: 8 },
    'System Bug / App Crash': { response: 2, resolution: 12 },
    'Payroll / Salary Issue': { response: 4, resolution: 24 }
  };
  
  let sla = slaMatrix[this.priority];
  if (categorySLA[this.category]) {
    sla = categorySLA[this.category];
  }
  
  this.sla = {
    responseTime: sla.response,
    resolutionTime: sla.resolution,
    responseDeadline: new Date(now.getTime() + (sla.response * 60 * 60 * 1000)),
    resolutionDeadline: new Date(now.getTime() + (sla.resolution * 60 * 60 * 1000))
  };
};

// Method to auto-assign ticket based on category
ticketSchema.methods.autoAssign = async function() {
  const User = mongoose.model('User');
  
  // Routing rules based on category - Updated to match exact routing table
  const routingRules = {
    'Leave Issue': ['HR Executive'],
    'Attendance Issue': ['HR Executive'],
    'Regularization Problem': ['HR Executive'],
    'Holiday Calendar Query': ['HR Executive'],
    'WFH / Remote Work Requests': ['HR Executive'],
    'Leave Policy Clarification': ['HR Executive', 'HR Manager'],
    'Payroll / Salary Issue': ['HR Manager'],
    'Payslip Not Available': ['HR Manager'],
    'Reimbursement Issue': ['HR Manager'],
    'Tax / TDS / Form-16': ['HR Manager'],
    'Performance Review Concern': ['HR BP'],
    'KPI / Goals Setup Issue': ['HR Manager'],
    'Probation / Confirmation': ['HR Executive'],
    'Training / LMS Access Issue': ['HR Executive'],
    'Certification Issue': ['HR Manager'],
    'Offer Letter / Joining Issue': ['HR BP'],
    'Referral / Interview Feedback': ['HR Executive'],
    'Resignation Process Query': ['HR Manager'],
    'Final Settlement Delay': ['HR BP'],
    'Experience Letter Request': ['HR Executive'],
    'Document Upload Failed': ['HR Executive'],
    'General HR Query': ['HR Executive'],
    'Harassment / Grievance': ['HR BP'],
    'Feedback / Suggestion to HR': ['HR Manager', 'HR BP']
  };
  
  const eligibleRoles = routingRules[this.category] || ['HR Executive'];
  
  try {
    // Find available HR personnel with the required roles
    // Prioritize by workload (least number of open tickets)
    const availableHR = await User.aggregate([
      {
        $match: {
          role: { $in: eligibleRoles },
          isActive: true
        }
      },
      {
        $lookup: {
          from: 'tickets',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$assignedTo', '$$userId'] },
                    { $in: ['$status', ['Open', 'In Progress', 'Pending']] }
                  ]
                }
              }
            }
          ],
          as: 'openTickets'
        }
      },
      {
        $addFields: {
          workload: { $size: '$openTickets' }
        }
      },
      {
        $sort: { workload: 1, createdAt: 1 }
      },
      {
        $limit: 1
      }
    ]);
    
    if (availableHR.length > 0) {
      this.assignedTo = availableHR[0]._id;
      this.routingRules = {
        autoAssigned: true,
        assignmentReason: `Auto-assigned based on category: ${this.category}`,
        routedAt: new Date()
      };
    }
  } catch (error) {
    console.error('Error in auto-assignment:', error);
  }
};

// Method to escalate ticket
ticketSchema.methods.escalate = async function(escalatedBy, reason, isAutoEscalation = false) {
  const User = mongoose.model('User');
  
  const escalationPath = {
    'HR Executive': 'HR Manager',
    'HR Manager': 'HR BP', 
    'HR BP': 'Vice President'
  };
  
  try {
    // Get current assignee's role
    const currentAssignee = await User.findById(this.assignedTo);
    if (!currentAssignee) return false;
    
    const nextRole = escalationPath[currentAssignee.role];
    if (!nextRole) return false; // No further escalation possible
    
    // Find available person with next role
    const nextAssignee = await User.findOne({
      role: nextRole,
      isActive: true
    }).sort({ createdAt: 1 }); // FIFO assignment
    
    if (!nextAssignee) return false;
    
    // Update ticket
    this.assignedTo = nextAssignee._id;
    this.status = 'Escalated';
    this.escalationLevel += 1;
    
    // Add to escalation history
    this.escalationHistory.push({
      fromRole: currentAssignee.role,
      toRole: nextRole,
      escalatedBy: escalatedBy,
      escalatedAt: new Date(),
      reason: reason || 'Automatic escalation due to SLA breach',
      isAutoEscalation: isAutoEscalation
    });
    
    await this.save();
    return true;
  } catch (error) {
    console.error('Error in escalation:', error);
    return false;
  }
};

// Method to check if ticket needs escalation
ticketSchema.methods.needsEscalation = function() {
  if (this.status === 'Closed' || this.status === 'Resolved') return false;
  
  const now = new Date();
  
  // Check if response deadline is breached and no response given
  if (!this.firstResponseAt && this.sla.responseDeadline < now) {
    return { type: 'response', deadline: this.sla.responseDeadline };
  }
  
  // Check if resolution deadline is breached
  if (!this.resolvedAt && this.sla.resolutionDeadline < now) {
    return { type: 'resolution', deadline: this.sla.resolutionDeadline };
  }
  
  return false;
};

// Static method to find tickets needing escalation
ticketSchema.statics.findTicketsNeedingEscalation = async function() {
  const now = new Date();
  
  return await this.find({
    $and: [
      { status: { $nin: ['Closed', 'Resolved'] } },
      {
        $or: [
          // Response deadline breached and no response
          {
            $and: [
              { firstResponseAt: { $exists: false } },
              { 'sla.responseDeadline': { $lt: now } }
            ]
          },
          // Resolution deadline breached and not resolved
          {
            $and: [
              { resolvedAt: { $exists: false } },
              { 'sla.resolutionDeadline': { $lt: now } }
            ]
          }
        ]
      }
    ]
  }).populate('assignedTo createdBy');
};

// Method to handle HR resolution
ticketSchema.methods.resolveByHR = function(hrUserId, resolutionComment) {
  this.status = 'Resolved';
  this.resolvedAt = new Date();
  this.resolutionStatus.resolvedByHR = true;
  this.resolutionStatus.resolvedAt = new Date();
  this.resolutionStatus.resolvedBy = hrUserId;
  this.resolutionStatus.resolutionComment = resolutionComment || '';
  
  // Reset employee confirmation when HR resolves again
  this.resolutionStatus.employeeConfirmed = false;
  this.resolutionStatus.employeeConfirmedAt = null;
  
  // Set reopen deadline (3 days from resolution) - always reset this
  this.resolutionStatus.reopenDeadline = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
  
  // Increase max reopen allowed to 3 if not already set
  if (!this.resolutionStatus.maxReopenAllowed || this.resolutionStatus.maxReopenAllowed < 3) {
    this.resolutionStatus.maxReopenAllowed = 3;
  }
  
  return this.save();
};

// Method to handle Employee confirmation (closes ticket)
ticketSchema.methods.confirmByEmployee = function(employeeUserId) {
  if (!this.resolutionStatus.resolvedByHR) {
    throw new Error('Ticket must be resolved by HR first');
  }
  
  this.resolutionStatus.employeeConfirmed = true;
  this.resolutionStatus.employeeConfirmedAt = new Date();
  
  // Mark ticket as fully closed
  this.status = 'Closed';
  this.closedAt = new Date();
  
  return this.save();
};

// Method to handle Employee reopen
ticketSchema.methods.reopenByEmployee = function(employeeUserId, reason) {
  // Check if ticket is permanently closed by HR
  if (this.resolutionStatus.permanentlyClosedByHR) {
    throw new Error('HR has permanently closed this ticket');
  }
  
  if (!this.resolutionStatus.resolvedByHR) {
    throw new Error('HR has permanently closed this ticket');
  }
  
  if (this.resolutionStatus.reopenCount >= this.resolutionStatus.maxReopenAllowed) {
    throw new Error('Maximum reopen limit reached');
  }
  
  if (new Date() > this.resolutionStatus.reopenDeadline) {
    throw new Error('Reopen deadline has passed');
  }
  
  // Reopen the ticket (can be reopened from both Resolved and Closed status)
  this.status = 'Reopened';
  this.resolutionStatus.reopenCount += 1;
  this.resolutionStatus.lastReopenedAt = new Date();
  this.resolutionStatus.employeeConfirmed = false;
  this.resolutionStatus.employeeConfirmedAt = null;
  
  // Reset closed status if ticket was closed
  if (this.closedAt) {
    this.closedAt = null;
  }
  
  return this.save();
};

// Virtual to check if ticket can be confirmed by employee
ticketSchema.virtual('canEmployeeConfirm').get(function() {
  return this.resolutionStatus.resolvedByHR && 
         !this.resolutionStatus.employeeConfirmed && 
         this.status === 'Resolved';
});

// Virtual to check if ticket can be reopened by employee
ticketSchema.virtual('canEmployeeReopen').get(function() {
  // Cannot reopen if permanently closed by HR
  if (this.resolutionStatus.permanentlyClosedByHR) {
    return false;
  }
  
  return this.resolutionStatus.resolvedByHR && 
         this.resolutionStatus.reopenCount < this.resolutionStatus.maxReopenAllowed &&
         new Date() <= this.resolutionStatus.reopenDeadline &&
         (this.status === 'Resolved' || this.status === 'Closed');
});

// Virtual to check if ticket can be resolved by HR
ticketSchema.virtual('canHRResolve').get(function() {
  return this.status !== 'Closed' && this.status !== 'Resolved';
});

module.exports = mongoose.model('Ticket', ticketSchema);

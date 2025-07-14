const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  leaveType: {
    type: String,
    required: [true, 'Leave type is required'],
    enum: {
      values: ['Casual', 'Sick', 'Earned', 'Maternity', 'Paternity', 'Emergency', 'Unpaid'],
      message: 'Invalid leave type'
    }
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  totalDays: {
    type: Number,
    required: true,
    min: [0.5, 'Leave must be at least 0.5 days']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved by TL', 'Rejected by TL', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  // Team Leader Approval
  tlApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  tlApprovedDate: {
    type: Date
  },
  tlComments: {
    type: String,
    trim: true,
    maxlength: [500, 'Team Leader comments cannot exceed 500 characters']
  },
  
  // HR/Final Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: {
    type: Date
  },
  hrComments: {
    type: String,
    trim: true,
    maxlength: [500, 'HR comments cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [300, 'Rejection reason cannot exceed 300 characters']
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayPeriod: {
    type: String,
    enum: ['Morning', 'Afternoon'],
    required: function() {
      return this.isHalfDay;
    }
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  handoverNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Handover notes cannot exceed 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
leaveSchema.index({ employee: 1, startDate: -1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ appliedDate: -1 });

// Validation: End date should be after start date
leaveSchema.pre('validate', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

// Calculate total days automatically
leaveSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isModified('endDate') || this.isModified('isHalfDay')) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    if (this.isHalfDay && daysDiff === 1) {
      this.totalDays = 0.5;
    } else {
      this.totalDays = daysDiff;
    }
  }
  next();
});

// Method to approve leave
leaveSchema.methods.approve = function(approvedBy, notes) {
  this.status = 'Approved';
  this.approvedBy = approvedBy;
  this.approvedDate = new Date();
  this.updatedBy = approvedBy;
  if (notes) {
    this.approvalNotes = notes;
  }
  return this.save();
};

// Method to reject leave
leaveSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'Rejected';
  this.approvedBy = rejectedBy;
  this.approvedDate = new Date();
  this.rejectionReason = reason;
  this.updatedBy = rejectedBy;
  return this.save();
};

// Static method to get leave balance for user
leaveSchema.statics.getLeaveBalance = async function(userId, year = new Date().getFullYear()) {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31);
  
  const approvedLeaves = await this.find({
    employee: userId,
    status: 'Approved',
    startDate: { $gte: startOfYear, $lte: endOfYear }
  });
  
  const usedLeaves = {
    Casual: 0,
    Sick: 0,
    Earned: 0,
    Maternity: 0,
    Paternity: 0
  };
  
  approvedLeaves.forEach(leave => {
    if (usedLeaves.hasOwnProperty(leave.leaveType)) {
      usedLeaves[leave.leaveType] += leave.totalDays;
    }
  });
  
  return usedLeaves;
};

// Transform output
leaveSchema.methods.toJSON = function() {
  const leaveObject = this.toObject();
  return leaveObject;
};

module.exports = mongoose.model('Leave', leaveSchema);

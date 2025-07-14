const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Job code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Job code cannot exceed 20 characters']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  },
  description: {
    type: String,
    required: [true, 'Job description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  requirements: {
    education: {
      type: String,
      trim: true
    },
    experience: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10 }
    },
    skills: [{
      type: String,
      trim: true
    }],
    certifications: [{
      type: String,
      trim: true
    }]
  },
  salary: {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
    default: 'Full-time'
  },
  workMode: {
    type: String,
    enum: ['On-site', 'Remote', 'Hybrid'],
    default: 'On-site'
  },
  location: {
    type: String,
    trim: true
  },
  openings: {
    type: Number,
    required: [true, 'Number of openings is required'],
    min: [1, 'At least 1 opening is required']
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Paused', 'Closed', 'Cancelled'],
    default: 'Draft'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  postedDate: {
    type: Date
  },
  closingDate: {
    type: Date
  },
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Hiring manager is required']
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  interviewProcess: [{
    stage: {
      type: String,
      enum: ['Screening', 'Technical', 'HR', 'Manager', 'Final'],
      required: true
    },
    description: String,
    duration: Number, // in minutes
    interviewers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isUrgent: {
    type: Boolean,
    default: false
  },
  isRemote: {
    type: Boolean,
    default: false
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
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ department: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ priority: 1 });
jobSchema.index({ postedDate: -1 });
jobSchema.index({ closingDate: 1 });

// Virtual for applications count
jobSchema.virtual('applicationsCount', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'job',
  count: true
});

// Method to publish job
jobSchema.methods.publish = function(publishedBy) {
  this.status = 'Active';
  this.postedDate = new Date();
  this.updatedBy = publishedBy;
  return this.save();
};

// Method to close job
jobSchema.methods.close = function(closedBy, reason) {
  this.status = 'Closed';
  this.closingDate = new Date();
  this.updatedBy = closedBy;
  if (reason) {
    this.closingReason = reason;
  }
  return this.save();
};

// Method to pause job
jobSchema.methods.pause = function(pausedBy, reason) {
  this.status = 'Paused';
  this.updatedBy = pausedBy;
  if (reason) {
    this.pauseReason = reason;
  }
  return this.save();
};

// Static method to get active jobs
jobSchema.statics.getActiveJobs = function() {
  return this.find({ 
    status: 'Active',
    $or: [
      { closingDate: { $gte: new Date() } },
      { closingDate: null }
    ]
  }).populate('department hiringManager recruiter');
};

// Transform output
jobSchema.methods.toJSON = function() {
  const jobObject = this.toObject();
  return jobObject;
};

module.exports = mongoose.model('Job', jobSchema);

const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  reviewPeriod: {
    startDate: {
      type: Date,
      required: [true, 'Review start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'Review end date is required']
    },
    type: {
      type: String,
      enum: ['Quarterly', 'Half-yearly', 'Annual', 'Probation', 'Project-based'],
      default: 'Annual'
    }
  },
  goals: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    targetDate: {
      type: Date,
      required: true
    },
    weight: {
      type: Number,
      min: 0,
      max: 100,
      default: 20
    },
    status: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed', 'Overdue', 'Cancelled'],
      default: 'Not Started'
    },
    achievement: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    selfRating: {
      type: Number,
      min: 1,
      max: 5
    },
    managerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      trim: true
    }
  }],
  competencies: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['Technical', 'Behavioral', 'Leadership', 'Communication'],
      required: true
    },
    selfRating: {
      type: Number,
      min: 1,
      max: 5
    },
    managerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    peerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      trim: true
    }
  }],
  overallRating: {
    self: {
      type: Number,
      min: 1,
      max: 5
    },
    manager: {
      type: Number,
      min: 1,
      max: 5
    },
    final: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  feedback: {
    strengths: [{
      type: String,
      trim: true
    }],
    areasOfImprovement: [{
      type: String,
      trim: true
    }],
    managerComments: {
      type: String,
      trim: true,
      maxlength: [2000, 'Manager comments cannot exceed 2000 characters']
    },
    employeeComments: {
      type: String,
      trim: true,
      maxlength: [2000, 'Employee comments cannot exceed 2000 characters']
    }
  },
  developmentPlan: [{
    area: {
      type: String,
      required: true,
      trim: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    timeline: {
      type: String,
      trim: true
    },
    support: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['Planned', 'In Progress', 'Completed', 'Deferred'],
      default: 'Planned'
    }
  }],
  status: {
    type: String,
    enum: ['Draft', 'Self Assessment', 'Manager Review', 'HR Review', 'Completed', 'Cancelled'],
    default: 'Draft'
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reviewer is required']
  },
  hrReviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedDate: {
    type: Date
  },
  reviewedDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  nextReviewDate: {
    type: Date
  },
  promotion: {
    recommended: {
      type: Boolean,
      default: false
    },
    newRole: {
      type: String,
      trim: true
    },
    newSalary: {
      type: Number,
      min: 0
    },
    effectiveDate: {
      type: Date
    }
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
performanceSchema.index({ employee: 1, 'reviewPeriod.startDate': -1 });
performanceSchema.index({ reviewer: 1 });
performanceSchema.index({ status: 1 });
performanceSchema.index({ 'reviewPeriod.type': 1 });

// Pre-save middleware to calculate overall ratings
performanceSchema.pre('save', function(next) {
  // Calculate final overall rating as average of self and manager ratings
  if (this.overallRating.self && this.overallRating.manager) {
    this.overallRating.final = Math.round(
      (this.overallRating.self + this.overallRating.manager) / 2 * 10
    ) / 10;
  }
  
  // Set next review date (1 year from end date for annual reviews)
  if (this.reviewPeriod.type === 'Annual' && this.reviewPeriod.endDate) {
    this.nextReviewDate = new Date(this.reviewPeriod.endDate);
    this.nextReviewDate.setFullYear(this.nextReviewDate.getFullYear() + 1);
  }
  
  next();
});

// Method to submit self assessment
performanceSchema.methods.submitSelfAssessment = function(submittedBy) {
  this.status = 'Manager Review';
  this.submittedDate = new Date();
  this.updatedBy = submittedBy;
  return this.save();
};

// Method to complete manager review
performanceSchema.methods.completeManagerReview = function(reviewedBy) {
  this.status = 'HR Review';
  this.reviewedDate = new Date();
  this.updatedBy = reviewedBy;
  return this.save();
};

// Method to finalize review
performanceSchema.methods.finalizeReview = function(finalizedBy) {
  this.status = 'Completed';
  this.completedDate = new Date();
  this.updatedBy = finalizedBy;
  return this.save();
};

// Static method to get performance summary
performanceSchema.statics.getPerformanceSummary = async function(year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const reviews = await this.find({
    'reviewPeriod.endDate': { $gte: startDate, $lte: endDate },
    status: 'Completed'
  });
  
  const summary = {
    totalReviews: reviews.length,
    averageRating: reviews.length > 0 ? 
      reviews.reduce((sum, r) => sum + (r.overallRating.final || 0), 0) / reviews.length : 0,
    promotionRecommendations: reviews.filter(r => r.promotion.recommended).length,
    ratingDistribution: {
      excellent: reviews.filter(r => r.overallRating.final >= 4.5).length,
      good: reviews.filter(r => r.overallRating.final >= 3.5 && r.overallRating.final < 4.5).length,
      satisfactory: reviews.filter(r => r.overallRating.final >= 2.5 && r.overallRating.final < 3.5).length,
      needsImprovement: reviews.filter(r => r.overallRating.final < 2.5).length
    }
  };
  
  return summary;
};

// Transform output
performanceSchema.methods.toJSON = function() {
  const performanceObject = this.toObject();
  return performanceObject;
};

module.exports = mongoose.model('Performance', performanceSchema);

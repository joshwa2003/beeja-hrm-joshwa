const mongoose = require('mongoose');

const trainingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Training title is required'],
    trim: true,
    maxlength: [200, 'Training title cannot exceed 200 characters']
  },
  code: {
    type: String,
    required: [true, 'Training code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Training code cannot exceed 20 characters']
  },
  description: {
    type: String,
    required: [true, 'Training description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: ['Technical', 'Soft Skills', 'Leadership', 'Compliance', 'Safety', 'Product', 'Process'],
    required: [true, 'Training category is required']
  },
  type: {
    type: String,
    enum: ['Classroom', 'Online', 'Workshop', 'Seminar', 'Conference', 'Certification'],
    required: [true, 'Training type is required']
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
    default: 'Beginner'
  },
  duration: {
    hours: {
      type: Number,
      required: [true, 'Training duration in hours is required'],
      min: [0.5, 'Duration must be at least 0.5 hours']
    },
    days: {
      type: Number,
      default: 1
    }
  },
  schedule: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    sessions: [{
      date: {
        type: Date,
        required: true
      },
      startTime: {
        type: String,
        required: true
      },
      endTime: {
        type: String,
        required: true
      },
      topic: {
        type: String,
        trim: true
      }
    }]
  },
  instructor: {
    internal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    external: {
      name: {
        type: String,
        trim: true
      },
      email: {
        type: String,
        trim: true
      },
      phone: {
        type: String,
        trim: true
      },
      company: {
        type: String,
        trim: true
      }
    }
  },
  venue: {
    type: {
      type: String,
      enum: ['Physical', 'Virtual', 'Hybrid'],
      default: 'Physical'
    },
    location: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    meetingLink: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1']
    }
  },
  eligibility: {
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    roles: [{
      type: String,
      enum: ['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive', 'Team Manager', 'Team Leader', 'Employee']
    }],
    minExperience: {
      type: Number,
      default: 0
    },
    prerequisites: [{
      type: String,
      trim: true
    }]
  },
  enrollment: {
    maxParticipants: {
      type: Number,
      required: [true, 'Maximum participants is required'],
      min: [1, 'At least 1 participant is required']
    },
    registrationDeadline: {
      type: Date,
      required: [true, 'Registration deadline is required']
    },
    isAutoApproval: {
      type: Boolean,
      default: false
    }
  },
  participants: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    enrolledDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['Enrolled', 'Confirmed', 'Attended', 'Completed', 'Cancelled', 'No Show'],
      default: 'Enrolled'
    },
    attendance: [{
      session: {
        type: Number,
        required: true
      },
      present: {
        type: Boolean,
        default: false
      },
      checkInTime: Date,
      checkOutTime: Date
    }],
    assessment: {
      score: {
        type: Number,
        min: 0,
        max: 100
      },
      passed: {
        type: Boolean,
        default: false
      },
      certificateIssued: {
        type: Boolean,
        default: false
      },
      certificateUrl: String
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: {
        type: String,
        trim: true
      },
      wouldRecommend: {
        type: Boolean
      }
    }
  }],
  materials: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['Document', 'Video', 'Audio', 'Presentation', 'Link'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  assessment: {
    hasAssessment: {
      type: Boolean,
      default: false
    },
    passingScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    questions: [{
      question: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['Multiple Choice', 'True/False', 'Short Answer'],
        required: true
      },
      options: [String],
      correctAnswer: String,
      points: {
        type: Number,
        default: 1
      }
    }]
  },
  cost: {
    perParticipant: {
      type: Number,
      min: 0,
      default: 0
    },
    totalBudget: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Registration Open', 'Registration Closed', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Draft'
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
trainingSchema.index({ title: 'text', description: 'text' });
trainingSchema.index({ category: 1 });
trainingSchema.index({ type: 1 });
trainingSchema.index({ status: 1 });
trainingSchema.index({ 'schedule.startDate': 1 });
trainingSchema.index({ 'enrollment.registrationDeadline': 1 });

// Virtual for current enrollment count
trainingSchema.virtual('currentEnrollment').get(function() {
  return this.participants ? this.participants.filter(p => 
    ['Enrolled', 'Confirmed', 'Attended', 'Completed'].includes(p.status)
  ).length : 0;
});

// Virtual for available spots
trainingSchema.virtual('availableSpots').get(function() {
  return this.enrollment.maxParticipants - this.currentEnrollment;
});

// Method to enroll participant
trainingSchema.methods.enrollParticipant = function(employeeId) {
  if (this.currentEnrollment >= this.enrollment.maxParticipants) {
    throw new Error('Training is full');
  }
  
  if (new Date() > this.enrollment.registrationDeadline) {
    throw new Error('Registration deadline has passed');
  }
  
  const existingParticipant = this.participants.find(p => 
    p.employee.toString() === employeeId.toString()
  );
  
  if (existingParticipant) {
    throw new Error('Employee is already enrolled');
  }
  
  this.participants.push({
    employee: employeeId,
    status: this.enrollment.isAutoApproval ? 'Confirmed' : 'Enrolled'
  });
  
  return this.save();
};

// Method to mark attendance
trainingSchema.methods.markAttendance = function(employeeId, sessionIndex, present = true) {
  const participant = this.participants.find(p => 
    p.employee.toString() === employeeId.toString()
  );
  
  if (!participant) {
    throw new Error('Employee is not enrolled in this training');
  }
  
  const existingAttendance = participant.attendance.find(a => a.session === sessionIndex);
  
  if (existingAttendance) {
    existingAttendance.present = present;
    if (present) {
      existingAttendance.checkInTime = new Date();
    }
  } else {
    participant.attendance.push({
      session: sessionIndex,
      present: present,
      checkInTime: present ? new Date() : null
    });
  }
  
  return this.save();
};

// Method to complete training
trainingSchema.methods.completeTraining = function() {
  this.status = 'Completed';
  
  // Update participant status based on attendance
  this.participants.forEach(participant => {
    const attendedSessions = participant.attendance.filter(a => a.present).length;
    const totalSessions = this.schedule.sessions.length;
    
    if (attendedSessions >= totalSessions * 0.8) { // 80% attendance required
      participant.status = 'Completed';
    } else {
      participant.status = 'Attended';
    }
  });
  
  return this.save();
};

// Static method to get training statistics
trainingSchema.statics.getTrainingStats = async function(year) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const trainings = await this.find({
    'schedule.startDate': { $gte: startDate, $lte: endDate }
  });
  
  const stats = {
    totalTrainings: trainings.length,
    completedTrainings: trainings.filter(t => t.status === 'Completed').length,
    totalParticipants: trainings.reduce((sum, t) => sum + t.currentEnrollment, 0),
    averageRating: 0,
    categoryBreakdown: {}
  };
  
  // Calculate average rating
  let totalRatings = 0;
  let ratingCount = 0;
  
  trainings.forEach(training => {
    training.participants.forEach(participant => {
      if (participant.feedback && participant.feedback.rating) {
        totalRatings += participant.feedback.rating;
        ratingCount++;
      }
    });
  });
  
  stats.averageRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
  
  // Category breakdown
  trainings.forEach(training => {
    stats.categoryBreakdown[training.category] = 
      (stats.categoryBreakdown[training.category] || 0) + 1;
  });
  
  return stats;
};

// Transform output
trainingSchema.methods.toJSON = function() {
  const trainingObject = this.toObject();
  trainingObject.currentEnrollment = this.currentEnrollment;
  trainingObject.availableSpots = this.availableSpots;
  return trainingObject;
};

module.exports = mongoose.model('Training', trainingSchema);

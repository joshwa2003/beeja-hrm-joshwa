const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  // FAQ Content
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
    maxlength: [500, 'Question cannot exceed 500 characters']
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
    maxlength: [2000, 'Answer cannot exceed 2000 characters']
  },
  
  // Categorization
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Leave & Attendance',
      'Payroll & Salary',
      'HR Policies',
      'Recruitment',
      'Training & Development',
      'Performance Management',
      'IT & System Issues',
      'General HR',
      'Benefits & Compensation',
      'Compliance & Legal'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  
  // Tags for better searchability
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Status and visibility
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  isPublic: {
    type: Boolean,
    default: true // Public FAQs are visible to all employees
  },
  
  // Access control
  visibleToRoles: [{
    type: String,
    enum: [
      'Admin',
      'Vice President',
      'HR BP',
      'HR Manager', 
      'HR Executive',
      'Team Manager',
      'Team Leader',
      'Employee'
    ]
  }],
  
  // Content management
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Usage statistics
  viewCount: {
    type: Number,
    default: 0
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  
  // User feedback
  feedback: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isHelpful: Boolean,
    comment: String,
    submittedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Related information
  relatedFAQs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FAQ'
  }],
  relatedTicketCategories: [String],
  
  // SEO and search optimization
  keywords: [String],
  searchTerms: [String], // Common search terms that should lead to this FAQ
  
  // Priority and ordering
  priority: {
    type: Number,
    default: 0 // Higher numbers appear first
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // Rich content support
  hasRichContent: {
    type: Boolean,
    default: false
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    version: Number,
    question: String,
    answer: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changeReason: String
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
faqSchema.index({ category: 1, status: 1 });
faqSchema.index({ tags: 1 });
faqSchema.index({ keywords: 1 });
faqSchema.index({ searchTerms: 1 });
faqSchema.index({ priority: -1, displayOrder: 1 });
faqSchema.index({ viewCount: -1 });
faqSchema.index({ createdAt: -1 });

// Text index for full-text search
faqSchema.index({
  question: 'text',
  answer: 'text',
  tags: 'text',
  keywords: 'text',
  searchTerms: 'text'
});

// Virtual for helpfulness ratio
faqSchema.virtual('helpfulnessRatio').get(function() {
  const total = this.helpfulCount + this.notHelpfulCount;
  if (total === 0) return 0;
  return (this.helpfulCount / total) * 100;
});

// Pre-save middleware
faqSchema.pre('save', async function(next) {
  try {
    // Update version history if content changed
    if (this.isModified('question') || this.isModified('answer')) {
      if (!this.isNew) {
        this.versionHistory.push({
          version: this.version,
          question: this.question,
          answer: this.answer,
          modifiedBy: this.lastModifiedBy,
          modifiedAt: new Date()
        });
        this.version += 1;
      }
    }
    
    // Auto-generate search terms from question
    if (this.isModified('question')) {
      this.searchTerms = this.extractSearchTerms(this.question);
    }
    
    // Set default visibility if not specified
    if (this.isNew && this.visibleToRoles.length === 0) {
      this.visibleToRoles = [
        'Admin', 'Vice President', 'HR BP', 'HR Manager', 
        'HR Executive', 'Team Manager', 'Team Leader', 'Employee'
      ];
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to extract search terms from question
faqSchema.methods.extractSearchTerms = function(text) {
  // Remove common words and extract meaningful terms
  const commonWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this', 'it', 'from', 'they', 'we', 'say', 'her', 'she', 'he', 'has', 'had', 'his', 'how', 'what', 'where', 'when', 'why', 'who', 'can', 'could', 'should', 'would', 'will', 'do', 'does', 'did'];
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 10); // Limit to 10 terms
};

// Method to record view
faqSchema.methods.recordView = async function() {
  this.viewCount += 1;
  await this.save();
};

// Method to record feedback
faqSchema.methods.recordFeedback = async function(userId, isHelpful, comment = '') {
  // Remove existing feedback from this user
  this.feedback = this.feedback.filter(f => f.user.toString() !== userId.toString());
  
  // Add new feedback
  this.feedback.push({
    user: userId,
    isHelpful: isHelpful,
    comment: comment,
    submittedAt: new Date()
  });
  
  // Update counters
  this.helpfulCount = this.feedback.filter(f => f.isHelpful === true).length;
  this.notHelpfulCount = this.feedback.filter(f => f.isHelpful === false).length;
  
  await this.save();
};

// Static method to search FAQs
faqSchema.statics.searchFAQs = async function(query, userRole, options = {}) {
  const {
    category = null,
    limit = 10,
    skip = 0,
    sortBy = 'relevance' // 'relevance', 'popularity', 'recent'
  } = options;
  
  // Build search query
  const searchQuery = {
    status: 'Published',
    visibleToRoles: userRole
  };
  
  if (category) {
    searchQuery.category = category;
  }
  
  let mongoQuery;
  
  if (query && query.trim()) {
    // Text search
    mongoQuery = this.find({
      ...searchQuery,
      $text: { $search: query }
    }, {
      score: { $meta: 'textScore' }
    });
    
    // Sort by text score for relevance
    if (sortBy === 'relevance') {
      mongoQuery = mongoQuery.sort({ score: { $meta: 'textScore' } });
    }
  } else {
    mongoQuery = this.find(searchQuery);
  }
  
  // Apply sorting
  switch (sortBy) {
    case 'popularity':
      mongoQuery = mongoQuery.sort({ viewCount: -1, helpfulCount: -1 });
      break;
    case 'recent':
      mongoQuery = mongoQuery.sort({ createdAt: -1 });
      break;
    default:
      if (!query) {
        mongoQuery = mongoQuery.sort({ priority: -1, displayOrder: 1 });
      }
  }
  
  return await mongoQuery
    .populate('createdBy', 'firstName lastName')
    .populate('lastModifiedBy', 'firstName lastName')
    .skip(skip)
    .limit(limit);
};

// Static method to get popular FAQs
faqSchema.statics.getPopularFAQs = async function(userRole, limit = 5) {
  return await this.find({
    status: 'Published',
    visibleToRoles: userRole
  })
  .sort({ viewCount: -1, helpfulCount: -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName');
};

// Static method to get FAQs by category
faqSchema.statics.getFAQsByCategory = async function(category, userRole, limit = 10) {
  return await this.find({
    category: category,
    status: 'Published',
    visibleToRoles: userRole
  })
  .sort({ priority: -1, displayOrder: 1, viewCount: -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName');
};

// Static method to get related FAQs
faqSchema.statics.getRelatedFAQs = async function(faqId, userRole, limit = 5) {
  const faq = await this.findById(faqId);
  if (!faq) return [];
  
  // Find FAQs with similar tags or in the same category
  return await this.find({
    _id: { $ne: faqId },
    status: 'Published',
    visibleToRoles: userRole,
    $or: [
      { tags: { $in: faq.tags } },
      { category: faq.category },
      { _id: { $in: faq.relatedFAQs } }
    ]
  })
  .sort({ viewCount: -1 })
  .limit(limit)
  .populate('createdBy', 'firstName lastName');
};

// Method to suggest FAQs based on ticket content
faqSchema.statics.suggestForTicket = async function(ticketCategory, ticketSubject, ticketDescription, userRole, limit = 3) {
  const searchText = `${ticketSubject} ${ticketDescription}`.toLowerCase();
  
  // First try to find FAQs in the same category
  let suggestions = await this.find({
    category: this.mapTicketCategoryToFAQCategory(ticketCategory),
    status: 'Published',
    visibleToRoles: userRole,
    $text: { $search: searchText }
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(limit)
  .populate('createdBy', 'firstName lastName');
  
  // If not enough suggestions, broaden the search
  if (suggestions.length < limit) {
    const additionalSuggestions = await this.find({
      _id: { $nin: suggestions.map(s => s._id) },
      status: 'Published',
      visibleToRoles: userRole,
      $text: { $search: searchText }
    }, {
      score: { $meta: 'textScore' }
    })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit - suggestions.length)
    .populate('createdBy', 'firstName lastName');
    
    suggestions = suggestions.concat(additionalSuggestions);
  }
  
  return suggestions;
};

// Helper method to map ticket categories to FAQ categories
faqSchema.statics.mapTicketCategoryToFAQCategory = function(ticketCategory) {
  const categoryMapping = {
    'Leave Issue': 'Leave & Attendance',
    'Attendance Issue': 'Leave & Attendance',
    'Regularization Problem': 'Leave & Attendance',
    'Holiday Calendar Query': 'Leave & Attendance',
    'WFH / Remote Work Requests': 'Leave & Attendance',
    'Payroll / Salary Issue': 'Payroll & Salary',
    'Payslip Not Available': 'Payroll & Salary',
    'Reimbursement Issue': 'Payroll & Salary',
    'Tax / TDS / Form-16': 'Payroll & Salary',
    'Leave Policy Clarification': 'HR Policies',
    'Performance Review Concern': 'Performance Management',
    'KPI / Goals Setup Issue': 'Performance Management',
    'Probation / Confirmation': 'HR Policies',
    'Training / LMS Access Issue': 'Training & Development',
    'Certification Issue': 'Training & Development',
    'Offer Letter / Joining Issue': 'Recruitment',
    'Referral / Interview Feedback': 'Recruitment',
    'HRMS Login Issue': 'IT & System Issues',
    'System Bug / App Crash': 'IT & System Issues',
    'Document Upload Failed': 'IT & System Issues'
  };
  
  return categoryMapping[ticketCategory] || 'General HR';
};

module.exports = mongoose.model('FAQ', faqSchema);

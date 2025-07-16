const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  holidayName: {
    type: String,
    required: [true, 'Holiday name is required'],
    trim: true,
    maxlength: [100, 'Holiday name cannot exceed 100 characters']
  },
  date: {
    type: Date,
    required: [true, 'Holiday date is required']
  },
  day: {
    type: String
  },
  year: {
    type: Number
  },
  holidayType: {
    type: String,
    required: [true, 'Holiday type is required'],
    enum: {
      values: ['Public', 'Optional/Floating', 'Company-Specific', 'Regional', 'Religious'],
      message: 'Holiday type must be Public, Optional/Floating, Company-Specific, Regional, or Religious'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  // Region/Culture-based fields
  applicabilityType: {
    type: String,
    enum: ['all', 'state', 'religion', 'department', 'custom'],
    default: 'all'
  },
  applicableStates: [{
    type: String,
    trim: true
  }],
  applicableReligions: [{
    type: String,
    trim: true
  }],
  applicableDepartments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  customEmployees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  uploadedFrom: {
    type: String,
    enum: ['manual', 'excel'],
    default: 'manual'
  },
  isActive: {
    type: Boolean,
    default: true
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
holidaySchema.index({ date: 1 });
holidaySchema.index({ year: 1, date: 1 });
holidaySchema.index({ holidayType: 1 });
holidaySchema.index({ isActive: 1 });

// Compound index to prevent duplicate holidays on the same date
holidaySchema.index({ date: 1, holidayName: 1 }, { unique: true });

// Pre-save middleware to auto-calculate day and year
holidaySchema.pre('save', function(next) {
  if (this.isModified('date')) {
    const holidayDate = new Date(this.date);
    
    // Calculate day of the week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    this.day = days[holidayDate.getDay()];
    
    // Extract year
    this.year = holidayDate.getFullYear();
  }
  next();
});

// Static method to get holidays by year
holidaySchema.statics.getHolidaysByYear = async function(year) {
  return await this.find({
    year: year,
    isActive: true
  }).sort({ date: 1 });
};

// Static method to get upcoming holidays
holidaySchema.statics.getUpcomingHolidays = async function(limit = 5) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await this.find({
    date: { $gte: today },
    isActive: true
  })
  .sort({ date: 1 })
  .limit(limit);
};

// Static method to get holidays by month and year
holidaySchema.statics.getHolidaysByMonth = async function(year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return await this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    },
    isActive: true
  }).sort({ date: 1 });
};

// Static method to check if a date is a holiday
holidaySchema.statics.isHoliday = async function(date) {
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const holiday = await this.findOne({
    date: checkDate,
    isActive: true
  });
  
  return holiday ? true : false;
};

// Method to format holiday for display
holidaySchema.methods.toDisplayFormat = function() {
  return {
    id: this._id,
    holidayName: this.holidayName,
    date: this.date.toISOString().split('T')[0],
    day: this.day,
    year: this.year,
    holidayType: this.holidayType,
    description: this.description,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Transform output
holidaySchema.methods.toJSON = function() {
  const holidayObject = this.toObject();
  return holidayObject;
};

module.exports = mongoose.model('Holiday', holidaySchema);

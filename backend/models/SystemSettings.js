const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Settings category is required'],
    enum: ['General', 'Leave', 'Attendance', 'Payroll', 'Performance', 'Training', 'Recruitment', 'Security'],
    index: true
  },
  key: {
    type: String,
    required: [true, 'Settings key is required'],
    trim: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Settings value is required']
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'array', 'object'],
    required: [true, 'Data type is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  validationRules: {
    min: mongoose.Schema.Types.Mixed,
    max: mongoose.Schema.Types.Mixed,
    required: {
      type: Boolean,
      default: false
    },
    pattern: String,
    options: [mongoose.Schema.Types.Mixed]
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for category and key uniqueness
systemSettingsSchema.index({ category: 1, key: 1 }, { unique: true });

// Pre-save middleware to update modification info
systemSettingsSchema.pre('save', function(next) {
  if (this.isModified('value')) {
    this.lastModifiedDate = new Date();
  }
  next();
});

// Static method to get settings by category
systemSettingsSchema.statics.getByCategory = function(category) {
  return this.find({ category, isVisible: true }).sort({ key: 1 });
};

// Static method to get setting value
systemSettingsSchema.statics.getValue = async function(category, key, defaultValue = null) {
  const setting = await this.findOne({ category, key });
  return setting ? setting.value : defaultValue;
};

// Static method to set setting value
systemSettingsSchema.statics.setValue = async function(category, key, value, modifiedBy) {
  const setting = await this.findOneAndUpdate(
    { category, key },
    { 
      value, 
      lastModifiedBy: modifiedBy,
      lastModifiedDate: new Date()
    },
    { new: true, upsert: false }
  );
  
  if (!setting) {
    throw new Error(`Setting ${category}.${key} not found`);
  }
  
  return setting;
};

// Static method to initialize default settings
systemSettingsSchema.statics.initializeDefaults = async function() {
  const defaultSettings = [
    // General Settings
    {
      category: 'General',
      key: 'company_name',
      value: 'Your Company Name',
      dataType: 'string',
      description: 'Company name displayed throughout the system'
    },
    {
      category: 'General',
      key: 'company_logo',
      value: '',
      dataType: 'string',
      description: 'URL to company logo'
    },
    {
      category: 'General',
      key: 'timezone',
      value: 'Asia/Kolkata',
      dataType: 'string',
      description: 'Default timezone for the system'
    },
    {
      category: 'General',
      key: 'date_format',
      value: 'DD/MM/YYYY',
      dataType: 'string',
      description: 'Default date format',
      validationRules: {
        options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
      }
    },
    {
      category: 'General',
      key: 'currency',
      value: 'INR',
      dataType: 'string',
      description: 'Default currency'
    },

    // Leave Settings
    {
      category: 'Leave',
      key: 'annual_leave_days',
      value: 21,
      dataType: 'number',
      description: 'Annual leave days per employee',
      validationRules: { min: 0, max: 365 }
    },
    {
      category: 'Leave',
      key: 'casual_leave_days',
      value: 12,
      dataType: 'number',
      description: 'Casual leave days per employee',
      validationRules: { min: 0, max: 365 }
    },
    {
      category: 'Leave',
      key: 'sick_leave_days',
      value: 12,
      dataType: 'number',
      description: 'Sick leave days per employee',
      validationRules: { min: 0, max: 365 }
    },
    {
      category: 'Leave',
      key: 'maternity_leave_days',
      value: 180,
      dataType: 'number',
      description: 'Maternity leave days',
      validationRules: { min: 0, max: 365 }
    },
    {
      category: 'Leave',
      key: 'paternity_leave_days',
      value: 15,
      dataType: 'number',
      description: 'Paternity leave days',
      validationRules: { min: 0, max: 365 }
    },
    {
      category: 'Leave',
      key: 'leave_carry_forward',
      value: true,
      dataType: 'boolean',
      description: 'Allow leave carry forward to next year'
    },
    {
      category: 'Leave',
      key: 'max_carry_forward_days',
      value: 5,
      dataType: 'number',
      description: 'Maximum days that can be carried forward',
      validationRules: { min: 0, max: 30 }
    },

    // Attendance Settings
    {
      category: 'Attendance',
      key: 'standard_work_hours',
      value: 8,
      dataType: 'number',
      description: 'Standard work hours per day',
      validationRules: { min: 1, max: 24 }
    },
    {
      category: 'Attendance',
      key: 'office_start_time',
      value: '09:00',
      dataType: 'string',
      description: 'Standard office start time'
    },
    {
      category: 'Attendance',
      key: 'office_end_time',
      value: '18:00',
      dataType: 'string',
      description: 'Standard office end time'
    },
    {
      category: 'Attendance',
      key: 'late_arrival_threshold',
      value: 30,
      dataType: 'number',
      description: 'Late arrival threshold in minutes',
      validationRules: { min: 0, max: 120 }
    },
    {
      category: 'Attendance',
      key: 'overtime_rate_multiplier',
      value: 1.5,
      dataType: 'number',
      description: 'Overtime rate multiplier',
      validationRules: { min: 1, max: 3 }
    },

    // Payroll Settings
    {
      category: 'Payroll',
      key: 'pf_rate',
      value: 12,
      dataType: 'number',
      description: 'PF contribution rate (%)',
      validationRules: { min: 0, max: 100 }
    },
    {
      category: 'Payroll',
      key: 'esi_rate',
      value: 0.75,
      dataType: 'number',
      description: 'ESI contribution rate (%)',
      validationRules: { min: 0, max: 100 }
    },
    {
      category: 'Payroll',
      key: 'esi_salary_limit',
      value: 21000,
      dataType: 'number',
      description: 'ESI salary limit',
      validationRules: { min: 0 }
    },
    {
      category: 'Payroll',
      key: 'hra_rate',
      value: 40,
      dataType: 'number',
      description: 'HRA rate (% of basic salary)',
      validationRules: { min: 0, max: 100 }
    },

    // Performance Settings
    {
      category: 'Performance',
      key: 'review_cycle',
      value: 'Annual',
      dataType: 'string',
      description: 'Performance review cycle',
      validationRules: {
        options: ['Quarterly', 'Half-yearly', 'Annual']
      }
    },
    {
      category: 'Performance',
      key: 'rating_scale',
      value: 5,
      dataType: 'number',
      description: 'Performance rating scale (1-5 or 1-10)',
      validationRules: { min: 3, max: 10 }
    },
    {
      category: 'Performance',
      key: 'probation_period_months',
      value: 6,
      dataType: 'number',
      description: 'Probation period in months',
      validationRules: { min: 1, max: 12 }
    },

    // Security Settings
    {
      category: 'Security',
      key: 'password_min_length',
      value: 8,
      dataType: 'number',
      description: 'Minimum password length',
      validationRules: { min: 6, max: 20 }
    },
    {
      category: 'Security',
      key: 'password_expiry_days',
      value: 90,
      dataType: 'number',
      description: 'Password expiry in days (0 = never)',
      validationRules: { min: 0, max: 365 }
    },
    {
      category: 'Security',
      key: 'session_timeout_minutes',
      value: 60,
      dataType: 'number',
      description: 'Session timeout in minutes',
      validationRules: { min: 15, max: 480 }
    },
    {
      category: 'Security',
      key: 'max_login_attempts',
      value: 5,
      dataType: 'number',
      description: 'Maximum login attempts before lockout',
      validationRules: { min: 3, max: 10 }
    }
  ];

  for (const setting of defaultSettings) {
    await this.findOneAndUpdate(
      { category: setting.category, key: setting.key },
      setting,
      { upsert: true, new: true }
    );
  }

  return defaultSettings.length;
};

// Transform output
systemSettingsSchema.methods.toJSON = function() {
  const settingsObject = this.toObject();
  return settingsObject;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);

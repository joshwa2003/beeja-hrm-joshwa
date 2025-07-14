const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  checkIn: {
    type: Date
  },
  checkOut: {
    type: Date
  },
  breakTime: {
    start: Date,
    end: Date,
    duration: {
      type: Number, // in minutes
      default: 0
    }
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half Day', 'On Leave', 'Holiday'],
    default: 'Absent'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  isEarly: {
    type: Boolean,
    default: false
  },
  earlyMinutes: {
    type: Number,
    default: 0
  },
  overtime: {
    type: Number,
    default: 0
  },
  location: {
    type: String,
    enum: ['Office', 'Remote', 'Client Site'],
    default: 'Office'
  },
  ipAddress: {
    type: String
  },
  device: {
    type: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [300, 'Notes cannot exceed 300 characters']
  },
  isRegularized: {
    type: Boolean,
    default: false
  },
  regularizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  regularizedDate: {
    type: Date
  },
  regularizationReason: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for employee and date uniqueness
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isLate: 1 });

// Pre-save middleware to calculate total hours and status
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    // Calculate total hours
    const timeDiff = this.checkOut.getTime() - this.checkIn.getTime();
    let totalMinutes = Math.floor(timeDiff / (1000 * 60));
    
    // Subtract break time
    if (this.breakTime && this.breakTime.duration) {
      totalMinutes -= this.breakTime.duration;
    }
    
    this.totalHours = Math.max(0, totalMinutes / 60);
    
    // Determine status
    if (this.totalHours >= 8) {
      this.status = 'Present';
    } else if (this.totalHours >= 4) {
      this.status = 'Half Day';
    } else {
      this.status = 'Absent';
    }
    
    // Check for late arrival (assuming 9:00 AM is standard time)
    const standardCheckIn = new Date(this.date);
    standardCheckIn.setHours(9, 0, 0, 0);
    
    if (this.checkIn > standardCheckIn) {
      this.isLate = true;
      this.lateMinutes = Math.floor((this.checkIn.getTime() - standardCheckIn.getTime()) / (1000 * 60));
      if (this.lateMinutes > 30) {
        this.status = 'Late';
      }
    }
    
    // Check for early departure (assuming 6:00 PM is standard time)
    const standardCheckOut = new Date(this.date);
    standardCheckOut.setHours(18, 0, 0, 0);
    
    if (this.checkOut < standardCheckOut) {
      this.isEarly = true;
      this.earlyMinutes = Math.floor((standardCheckOut.getTime() - this.checkOut.getTime()) / (1000 * 60));
    }
    
    // Calculate overtime (after 8 hours)
    if (this.totalHours > 8) {
      this.overtime = this.totalHours - 8;
    }
  }
  
  next();
});

// Method to mark check-in
attendanceSchema.methods.checkInEmployee = function(location = 'Office', ipAddress, device) {
  this.checkIn = new Date();
  this.location = location;
  this.ipAddress = ipAddress;
  this.device = device;
  return this.save();
};

// Method to mark check-out
attendanceSchema.methods.checkOutEmployee = function() {
  this.checkOut = new Date();
  return this.save();
};

// Method to regularize attendance
attendanceSchema.methods.regularize = function(regularizedBy, reason, checkIn, checkOut) {
  this.isRegularized = true;
  this.regularizedBy = regularizedBy;
  this.regularizedDate = new Date();
  this.regularizationReason = reason;
  this.updatedBy = regularizedBy;
  
  if (checkIn) this.checkIn = checkIn;
  if (checkOut) this.checkOut = checkOut;
  
  return this.save();
};

// Static method to get monthly attendance summary
attendanceSchema.statics.getMonthlySummary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const attendance = await this.find({
    employee: userId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const summary = {
    totalDays: attendance.length,
    presentDays: attendance.filter(a => a.status === 'Present').length,
    absentDays: attendance.filter(a => a.status === 'Absent').length,
    lateDays: attendance.filter(a => a.isLate).length,
    halfDays: attendance.filter(a => a.status === 'Half Day').length,
    totalHours: attendance.reduce((sum, a) => sum + a.totalHours, 0),
    overtimeHours: attendance.reduce((sum, a) => sum + a.overtime, 0)
  };
  
  return summary;
};

// Transform output
attendanceSchema.methods.toJSON = function() {
  const attendanceObject = this.toObject();
  return attendanceObject;
};

module.exports = mongoose.model('Attendance', attendanceSchema);

const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Employee is required']
  },
  payPeriod: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      min: 2020
    }
  },
  basicSalary: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: [0, 'Basic salary cannot be negative']
  },
  allowances: {
    hra: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  overtime: {
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 }
  },
  bonus: {
    type: Number,
    default: 0
  },
  incentives: {
    type: Number,
    default: 0
  },
  reimbursements: [{
    type: {
      type: String,
      enum: ['Travel', 'Medical', 'Food', 'Communication', 'Other']
    },
    amount: Number,
    description: String,
    receiptUrl: String
  }],
  attendance: {
    workingDays: { type: Number, required: true },
    presentDays: { type: Number, required: true },
    absentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    holidayDays: { type: Number, default: 0 }
  },
  grossSalary: {
    type: Number,
    required: true
  },
  totalDeductions: {
    type: Number,
    required: true
  },
  netSalary: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Processed', 'Paid', 'Hold'],
    default: 'Draft'
  },
  processedDate: {
    type: Date
  },
  paidDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Cash', 'Cheque'],
    default: 'Bank Transfer'
  },
  payslipUrl: {
    type: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Compound index for employee and pay period uniqueness
payrollSchema.index({ employee: 1, 'payPeriod.month': 1, 'payPeriod.year': 1 }, { unique: true });
payrollSchema.index({ status: 1 });
payrollSchema.index({ 'payPeriod.year': -1, 'payPeriod.month': -1 });

// Pre-save middleware to calculate totals
payrollSchema.pre('save', function(next) {
  // Calculate total allowances
  const totalAllowances = Object.values(this.allowances).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate total deductions
  this.totalDeductions = Object.values(this.deductions).reduce((sum, val) => sum + (val || 0), 0);
  
  // Calculate total reimbursements
  const totalReimbursements = this.reimbursements.reduce((sum, reimb) => sum + (reimb.amount || 0), 0);
  
  // Calculate overtime amount
  this.overtime.amount = (this.overtime.hours || 0) * (this.overtime.rate || 0);
  
  // Calculate gross salary
  this.grossSalary = this.basicSalary + totalAllowances + this.overtime.amount + 
                     (this.bonus || 0) + (this.incentives || 0) + totalReimbursements;
  
  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions;
  
  next();
});

// Method to process payroll
payrollSchema.methods.process = function(processedBy) {
  this.status = 'Processed';
  this.processedBy = processedBy;
  this.processedDate = new Date();
  this.updatedBy = processedBy;
  return this.save();
};

// Method to mark as paid
payrollSchema.methods.markAsPaid = function(paidBy, paymentMethod = 'Bank Transfer') {
  this.status = 'Paid';
  this.paidDate = new Date();
  this.paymentMethod = paymentMethod;
  this.updatedBy = paidBy;
  return this.save();
};

// Method to put on hold
payrollSchema.methods.putOnHold = function(heldBy, reason) {
  this.status = 'Hold';
  this.notes = reason;
  this.updatedBy = heldBy;
  return this.save();
};

// Static method to calculate salary structure
payrollSchema.statics.calculateSalaryStructure = function(basicSalary) {
  const structure = {
    basic: basicSalary,
    hra: Math.round(basicSalary * 0.4), // 40% of basic
    transport: 1600, // Fixed amount
    medical: 1250, // Fixed amount
    special: Math.round(basicSalary * 0.1), // 10% of basic
    pf: Math.round(basicSalary * 0.12), // 12% of basic
    esi: basicSalary <= 21000 ? Math.round(basicSalary * 0.0075) : 0, // 0.75% if salary <= 21000
    tax: 0 // To be calculated based on tax slabs
  };
  
  structure.gross = structure.basic + structure.hra + structure.transport + 
                   structure.medical + structure.special;
  structure.totalDeductions = structure.pf + structure.esi + structure.tax;
  structure.net = structure.gross - structure.totalDeductions;
  
  return structure;
};

// Static method to get payroll summary for a period
payrollSchema.statics.getPayrollSummary = async function(month, year) {
  const payrolls = await this.find({
    'payPeriod.month': month,
    'payPeriod.year': year,
    status: { $in: ['Processed', 'Paid'] }
  });
  
  const summary = {
    totalEmployees: payrolls.length,
    totalGrossSalary: payrolls.reduce((sum, p) => sum + p.grossSalary, 0),
    totalDeductions: payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
    totalNetSalary: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
    totalPF: payrolls.reduce((sum, p) => sum + (p.deductions.pf || 0), 0),
    totalESI: payrolls.reduce((sum, p) => sum + (p.deductions.esi || 0), 0),
    totalTax: payrolls.reduce((sum, p) => sum + (p.deductions.tax || 0), 0),
    paidCount: payrolls.filter(p => p.status === 'Paid').length,
    pendingCount: payrolls.filter(p => p.status === 'Processed').length
  };
  
  return summary;
};

// Transform output
payrollSchema.methods.toJSON = function() {
  const payrollObject = this.toObject();
  return payrollObject;
};

module.exports = mongoose.model('Payroll', payrollSchema);

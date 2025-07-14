const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Team code is required'],
    uppercase: true,
    trim: true,
    maxlength: [10, 'Team code cannot exceed 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required']
  },
  teamManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  teamLeader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedDate: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['Member', 'Senior Member', 'Lead'],
      default: 'Member'
    }
  }],
  maxSize: {
    type: Number,
    min: [1, 'Team must have at least 1 member'],
    max: [50, 'Team cannot exceed 50 members'],
    default: 10
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

// Compound index for department and team name uniqueness
teamSchema.index({ department: 1, name: 1 }, { unique: true });
teamSchema.index({ department: 1, code: 1 }, { unique: true });
teamSchema.index({ teamManager: 1 });
teamSchema.index({ teamLeader: 1 });
teamSchema.index({ isActive: 1 });

// Virtual for current team size
teamSchema.virtual('currentSize').get(function() {
  return this.members ? this.members.length : 0;
});

// Method to add member to team
teamSchema.methods.addMember = function(userId, role = 'Member') {
  if (this.members.length >= this.maxSize) {
    throw new Error('Team is at maximum capacity');
  }
  
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member of this team');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedDate: new Date()
  });
  
  return this.save();
};

// Method to remove member from team
teamSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  return this.save();
};

// Transform output
teamSchema.methods.toJSON = function() {
  const teamObject = this.toObject();
  teamObject.currentSize = this.currentSize;
  return teamObject;
};

// Add pagination plugin
teamSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Team', teamSchema);

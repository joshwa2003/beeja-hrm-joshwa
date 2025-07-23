const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    trim: true,
    maxlength: [500, 'Request message cannot exceed 500 characters']
  },
  responseMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Response message cannot exceed 500 characters']
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
connectionRequestSchema.index({ requester: 1, recipient: 1 });
connectionRequestSchema.index({ recipient: 1, status: 1 });
connectionRequestSchema.index({ status: 1, createdAt: -1 });

// Compound index to prevent duplicate requests
connectionRequestSchema.index(
  { requester: 1, recipient: 1, status: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

// Static method to check if request already exists
connectionRequestSchema.statics.requestExists = async function(requesterId, recipientId) {
  const existingRequest = await this.findOne({
    requester: requesterId,
    recipient: recipientId,
    status: 'pending'
  });
  return !!existingRequest;
};

// Static method to check if users are already connected
connectionRequestSchema.statics.areUsersConnected = async function(user1Id, user2Id) {
  const approvedRequest = await this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id, status: 'approved' },
      { requester: user2Id, recipient: user1Id, status: 'approved' }
    ]
  });
  return !!approvedRequest;
};

// Method to approve the request
connectionRequestSchema.methods.approve = async function(responderId, responseMessage = '') {
  this.status = 'approved';
  this.respondedAt = new Date();
  this.respondedBy = responderId;
  this.responseMessage = responseMessage;
  
  await this.save();
  
  // Create or update chat between users
  const Chat = mongoose.model('Chat');
  await Chat.findOrCreateChat(this.requester, this.recipient);
  
  return this;
};

// Method to reject the request
connectionRequestSchema.methods.reject = async function(responderId, responseMessage = '') {
  this.status = 'rejected';
  this.respondedAt = new Date();
  this.respondedBy = responderId;
  this.responseMessage = responseMessage;
  
  await this.save();
  return this;
};

// Pre-save middleware to validate business rules
connectionRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Check if requester and recipient are the same
    if (this.requester.toString() === this.recipient.toString()) {
      const error = new Error('Cannot send connection request to yourself');
      return next(error);
    }
    
    // Check if a pending request already exists
    const existingRequest = await this.constructor.findOne({
      requester: this.requester,
      recipient: this.recipient,
      status: 'pending'
    });
    
    if (existingRequest) {
      const error = new Error('A pending connection request already exists');
      return next(error);
    }
  }
  
  next();
});

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);

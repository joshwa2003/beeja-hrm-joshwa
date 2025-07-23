const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  chatType: {
    type: String,
    enum: ['direct'],
    default: 'direct'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // For connection requests between Employee and Admin/VP
  connectionStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'none'],
    default: 'none'
  },
  connectionRequestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  connectionRequestedAt: {
    type: Date
  },
  connectionApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  connectionApprovedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better query performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ connectionStatus: 1 });

// Static method to find or create chat between two users
chatSchema.statics.findOrCreateChat = async function(user1Id, user2Id) {
  try {
    // Look for existing chat between these two users
    let chat = await this.findOne({
      participants: { $all: [user1Id, user2Id], $size: 2 }
    }).populate('participants', 'firstName lastName role email')
      .populate('lastMessage');

    if (!chat) {
      // Create new chat
      chat = new this({
        participants: [user1Id, user2Id]
      });
      await chat.save();
      
      // Populate the newly created chat
      chat = await this.findById(chat._id)
        .populate('participants', 'firstName lastName role email')
        .populate('lastMessage');
    }

    return chat;
  } catch (error) {
    throw error;
  }
};

// Method to check if user can access this chat
chatSchema.methods.canUserAccess = function(userId) {
  return this.participants.some(participant => 
    participant._id.toString() === userId.toString()
  );
};

// Method to get the other participant in a direct chat
chatSchema.methods.getOtherParticipant = function(userId) {
  return this.participants.find(participant => 
    participant._id.toString() !== userId.toString()
  );
};

module.exports = mongoose.model('Chat', chatSchema);

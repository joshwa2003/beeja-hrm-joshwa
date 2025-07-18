const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  // Reference to the ticket
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  
  // Message content
  message: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  
  // Message type
  messageType: {
    type: String,
    enum: ['user_message', 'hr_response', 'system_message', 'internal_note', 'status_update'],
    default: 'user_message'
  },
  
  // Author information
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Visibility settings
  isInternal: {
    type: Boolean,
    default: false // Internal messages are only visible to HR staff
  },
  
  // Message status
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Attachments for this specific message
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
  
  // Message metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    platform: String
  },
  
  // Edit history
  editHistory: [{
    previousMessage: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    editReason: String
  }],
  
  // Message reactions/acknowledgments
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reaction: {
      type: String,
      enum: ['helpful', 'resolved', 'needs_clarification', 'escalate']
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // System message details (for automated messages)
  systemMessageData: {
    action: String, // 'ticket_created', 'status_changed', 'assigned', 'escalated', etc.
    previousValue: String,
    newValue: String,
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Message priority (for important updates)
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ticketMessageSchema.index({ ticket: 1, createdAt: -1 });
ticketMessageSchema.index({ author: 1 });
ticketMessageSchema.index({ messageType: 1 });
ticketMessageSchema.index({ isInternal: 1 });
ticketMessageSchema.index({ createdAt: -1 });

// Virtual for message age
ticketMessageSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60));
});

// Pre-save middleware
ticketMessageSchema.pre('save', async function(next) {
  try {
    // Update ticket's last response time if this is an HR response
    if (this.isNew && this.messageType === 'hr_response') {
      const Ticket = mongoose.model('Ticket');
      const ticket = await Ticket.findById(this.ticket);
      
      if (ticket) {
        // Set first response time if not already set
        if (!ticket.firstResponseAt) {
          ticket.firstResponseAt = new Date();
        }
        ticket.lastResponseAt = new Date();
        
        // Update ticket status to 'In Progress' if it's still 'Open'
        if (ticket.status === 'Open') {
          ticket.status = 'In Progress';
        }
        
        await ticket.save();
      }
    }
    
    // Create system message for status updates
    if (this.isNew && this.messageType === 'status_update' && this.systemMessageData) {
      // This is handled by the ticket controller when status changes
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to create system message
ticketMessageSchema.statics.createSystemMessage = async function(ticketId, action, data = {}) {
  const systemMessages = {
    'ticket_created': `Ticket created and assigned to ${data.assigneeName || 'HR team'}`,
    'status_changed': `Status changed from "${data.previousValue}" to "${data.newValue}"`,
    'assigned': `Ticket assigned to ${data.assigneeName}`,
    'reassigned': `Ticket reassigned from ${data.previousAssignee} to ${data.newAssignee}`,
    'escalated': `Ticket escalated to ${data.escalatedTo} (${data.reason || 'SLA breach'})`,
    'priority_changed': `Priority changed from "${data.previousValue}" to "${data.newValue}"`,
    'resolved': `Ticket marked as resolved by ${data.resolvedBy}`,
    'closed': `Ticket closed by ${data.closedBy}`,
    'reopened': `Ticket reopened by ${data.reopenedBy}`,
    'feedback_submitted': `Customer feedback submitted (Rating: ${data.rating}/5)`,
    'hr_resolved': `HR has resolved this ticket${data.resolutionComment ? ': ' + data.resolutionComment : ''}. Please confirm if the issue is fixed or reopen if needed.`,
    'employee_confirmed': `Employee has confirmed the resolution. This ticket is now closed.`,
    'employee_reopened': `Employee has reopened this ticket${data.reason ? ': ' + data.reason : ''}. Ticket reassigned to HR.`,
    // Keep old ones for backward compatibility
    'hr_closed': `HR has closed this ticket. Waiting for employee confirmation to fully close.`,
    'employee_closed': `Employee has confirmed closure. This ticket is now fully closed.`
  };
  
  const message = systemMessages[action] || `System action: ${action}`;
  
  return await this.create({
    ticket: ticketId,
    message: message,
    messageType: 'system_message',
    author: data.triggeredBy,
    systemMessageData: {
      action: action,
      previousValue: data.previousValue,
      newValue: data.newValue,
      triggeredBy: data.triggeredBy
    }
  });
};

// Method to mark message as read by user
ticketMessageSchema.methods.markAsRead = async function(userId) {
  // Check if user has already read this message
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    // If all relevant users have read the message, mark as read
    // This logic can be expanded based on business requirements
    this.isRead = true;
    
    await this.save();
  }
};

// Static method to get unread message count for a user
ticketMessageSchema.statics.getUnreadCount = async function(userId, ticketId = null) {
  const query = {
    'readBy.user': { $ne: userId },
    isInternal: false // Don't count internal messages for regular users
  };
  
  if (ticketId) {
    query.ticket = ticketId;
  } else {
    // Get tickets where user is either creator or assignee
    const Ticket = mongoose.model('Ticket');
    const userTickets = await Ticket.find({
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ]
    }).select('_id');
    
    query.ticket = { $in: userTickets.map(t => t._id) };
  }
  
  return await this.countDocuments(query);
};

// Static method to get conversation for a ticket
ticketMessageSchema.statics.getConversation = async function(ticketId, userId, includeInternal = false) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  // HR roles can see internal messages
  const canSeeInternal = ['HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user?.role);
  
  const query = { ticket: ticketId };
  
  // Filter internal messages based on user role
  if (!canSeeInternal || !includeInternal) {
    query.isInternal = false;
  }
  
  return await this.find(query)
    .populate('author', 'firstName lastName role profilePhoto')
    .populate('readBy.user', 'firstName lastName')
    .populate('reactions.user', 'firstName lastName')
    .sort({ createdAt: 1 });
};

// Method to edit message (with history tracking)
ticketMessageSchema.methods.editMessage = async function(newMessage, editReason = '') {
  // Store previous message in edit history
  this.editHistory.push({
    previousMessage: this.message,
    editedAt: new Date(),
    editReason: editReason
  });
  
  // Update message
  this.message = newMessage;
  
  await this.save();
};

// Method to add reaction to message
ticketMessageSchema.methods.addReaction = async function(userId, reaction) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    user: userId,
    reaction: reaction,
    reactedAt: new Date()
  });
  
  await this.save();
};

module.exports = mongoose.model('TicketMessage', ticketMessageSchema);

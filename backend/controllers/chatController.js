const Chat = require('../models/Chat');
const Message = require('../models/Message');
const ConnectionRequest = require('../models/ConnectionRequest');
const User = require('../models/User');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Helper function to check if user can chat with another user
const canUsersChat = async (user1, user2) => {
  const restrictedRoles = ['Admin', 'Vice President'];
  const unrestrictedRoles = ['Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'];
  
  // If both users have unrestricted roles, they can chat freely
  if (unrestrictedRoles.includes(user1.role) && unrestrictedRoles.includes(user2.role)) {
    return { canChat: true, needsApproval: false };
  }
  
  // If user1 is Employee and user2 is Admin/VP, check connection status
  if (user1.role === 'Employee' && restrictedRoles.includes(user2.role)) {
    const connectionRequest = await ConnectionRequest.findOne({
      requester: user1._id,
      recipient: user2._id,
      status: 'approved'
    });
    return { canChat: !!connectionRequest, needsApproval: !connectionRequest };
  }
  
  // If user2 is Employee and user1 is Admin/VP, check connection status
  if (user2.role === 'Employee' && restrictedRoles.includes(user1.role)) {
    const connectionRequest = await ConnectionRequest.findOne({
      requester: user2._id,
      recipient: user1._id,
      status: 'approved'
    });
    return { canChat: !!connectionRequest, needsApproval: !connectionRequest };
  }
  
  // All other combinations can chat freely
  return { canChat: true, needsApproval: false };
};

// Get all chats for a user
const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const chats = await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'firstName lastName role email profilePhoto')
    .populate({
      path: 'lastMessage',
      populate: {
        path: 'sender',
        select: 'firstName lastName'
      }
    })
    .sort({ lastActivity: -1 });

    // Get unread count for each chat
    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.getUnreadCount(chat._id, userId);
        const otherParticipant = chat.getOtherParticipant(userId);
        
        return {
          ...chat.toObject(),
          unreadCount,
          otherParticipant
        };
      })
    );

    res.json({
      success: true,
      chats: chatsWithUnreadCount
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chats',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get or create chat between two users
const getOrCreateChat = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const currentUserId = req.user._id;

    // Validate other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if users can chat
    const { canChat, needsApproval } = await canUsersChat(req.user, otherUser);
    
    if (!canChat && needsApproval) {
      return res.status(403).json({
        success: false,
        message: 'Connection request required to chat with this user',
        needsConnectionRequest: true
      });
    }
    
    if (!canChat) {
      return res.status(403).json({
        success: false,
        message: 'You cannot chat with this user'
      });
    }

    // Find or create chat
    const chat = await Chat.findOrCreateChat(currentUserId, otherUserId);

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Error getting/creating chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating chat',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get messages for a chat
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Get messages with pagination
    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
    .populate('sender', 'firstName lastName role profilePhoto')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Debug logging for attachments
    messages.forEach(msg => {
      if (msg.attachments && msg.attachments.length > 0) {
        console.log(`Message ${msg._id} has ${msg.attachments.length} attachments:`, 
          msg.attachments.map(att => ({
            fileName: att.fileName,
            originalName: att.originalName,
            mimeType: att.mimeType,
            fileSize: att.fileSize
          }))
        );
      }
    });

    // Mark messages as read
    const unreadMessages = messages.filter(msg => 
      msg.sender._id.toString() !== userId.toString() && 
      !msg.isReadBy(userId)
    );

    await Promise.all(
      unreadMessages.map(msg => msg.markAsRead(userId))
    );

    res.json({
      success: true,
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    // Verify user has access to this chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this chat'
      });
    }

    // Create message
    const messageData = {
      chat: chatId,
      sender: userId,
      content: content.trim() || 'File attachment'
    };

    // Handle file attachments if present
    const uploadedFiles = req.files && req.files.files ? req.files.files : [];
    if (uploadedFiles.length > 0) {
      console.log('Processing file attachments:', uploadedFiles.length);
      
      messageData.attachments = uploadedFiles.map(file => {
        console.log('Processing file:', {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        });
        
        return {
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          filePath: file.path
        };
      });
      
      // Set message type based on file type
      const hasImages = uploadedFiles.some(file => file.mimetype.startsWith('image/'));
      messageData.messageType = hasImages ? 'image' : 'file';
      
      console.log('Message data with attachments:', {
        attachmentCount: messageData.attachments.length,
        messageType: messageData.messageType
      });
    }

    const message = new Message(messageData);
    await message.save();

    // Populate sender info
    await message.populate('sender', 'firstName lastName role profilePhoto');

    console.log('Saved message with attachments:', {
      messageId: message._id,
      attachmentCount: message.attachments ? message.attachments.length : 0
    });

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get available users to chat with
const getAvailableUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    const { search = '', role = '' } = req.query;

    // Build query
    const query = {
      _id: { $ne: currentUser._id },
      isActive: true
    };

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('firstName lastName role email profilePhoto')
      .sort({ firstName: 1 });

    // Check chat permissions for each user
    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const { canChat, needsApproval } = await canUsersChat(currentUser, user);
        
        // Check if there's a pending connection request
        let hasPendingRequest = false;
        if (needsApproval) {
          const pendingRequest = await ConnectionRequest.findOne({
            requester: currentUser._id,
            recipient: user._id,
            status: 'pending'
          });
          hasPendingRequest = !!pendingRequest;
        }

        return {
          ...user.toObject(),
          canChat,
          needsApproval,
          hasPendingRequest
        };
      })
    );

    res.json({
      success: true,
      users: usersWithPermissions
    });
  } catch (error) {
    console.error('Error fetching available users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Send connection request
const sendConnectionRequest = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const { message = '' } = req.body;
    const requesterId = req.user._id;

    console.log('=== DEBUG: sendConnectionRequest ===');
    console.log('Requester ID:', requesterId);
    console.log('Requester Role:', req.user.role);
    console.log('Recipient ID:', recipientId);
    console.log('Message:', message);

    // Validate recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('Recipient found:', recipient.firstName, recipient.lastName, recipient.role);

    // Check if request already exists
    const existingRequest = await ConnectionRequest.requestExists(requesterId, recipientId);
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Connection request already sent'
      });
    }

    // Check if users are already connected
    const alreadyConnected = await ConnectionRequest.areUsersConnected(requesterId, recipientId);
    if (alreadyConnected) {
      return res.status(400).json({
        success: false,
        message: 'Users are already connected'
      });
    }

    // Create connection request
    const connectionRequest = new ConnectionRequest({
      requester: requesterId,
      recipient: recipientId,
      message: message.trim()
    });

    await connectionRequest.save();
    console.log('Connection request saved:', connectionRequest._id);

    // Populate requester info
    await connectionRequest.populate('requester', 'firstName lastName role email');

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      connectionRequest
    });
  } catch (error) {
    console.error('Error sending connection request:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending connection request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get connection requests (received)
const getConnectionRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status = 'pending' } = req.query;

    console.log('=== DEBUG: getConnectionRequests ===');
    console.log('User ID:', userId);
    console.log('User Role:', req.user.role);
    console.log('Status filter:', status);

    const requests = await ConnectionRequest.find({
      recipient: userId,
      status
    })
    .populate('requester', 'firstName lastName role email profilePhoto')
    .sort({ createdAt: -1 });

    console.log('Found requests count:', requests.length);
    console.log('Requests:', requests.map(r => ({
      id: r._id,
      requester: r.requester.firstName + ' ' + r.requester.lastName,
      status: r.status,
      createdAt: r.createdAt
    })));

    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Error fetching connection requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching connection requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Respond to connection request
const respondToConnectionRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, responseMessage = '' } = req.body; // action: 'approve' or 'reject'
    const userId = req.user._id;

    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    // Verify user is the recipient
    if (request.recipient.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if request is still pending
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Request has already been responded to'
      });
    }

    let updatedRequest;
    if (action === 'approve') {
      updatedRequest = await request.approve(userId, responseMessage);
    } else if (action === 'reject') {
      updatedRequest = await request.reject(userId, responseMessage);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }

    await updatedRequest.populate('requester', 'firstName lastName role email');

    res.json({
      success: true,
      message: `Connection request ${action}d successfully`,
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error responding to connection request:', error);
    res.status(500).json({
      success: false,
      message: 'Error responding to connection request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Download chat attachment
const downloadAttachment = async (req, res) => {
  try {
    const { messageId, fileName } = req.params;
    const userId = req.user._id;

    // Find message and verify access
    const message = await Message.findById(messageId).populate({
      path: 'chat',
      select: 'participants'
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user has access to this chat
    if (!message.chat.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find the attachment
    const attachment = message.attachments.find(att => att.fileName === fileName);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if file exists
    const filePath = path.resolve(attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// View chat attachment (for inline viewing)
const viewAttachment = async (req, res) => {
  try {
    const { messageId, fileName } = req.params;
    const userId = req.user._id;

    // Find message and verify access
    const message = await Message.findById(messageId).populate({
      path: 'chat',
      select: 'participants'
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user has access to this chat
    if (!message.chat.canUserAccess(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Find the attachment
    const attachment = message.attachments.find(att => att.fileName === fileName);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check if file exists
    const filePath = path.resolve(attachment.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', attachment.mimeType);
    
    // For images, allow inline display
    if (attachment.mimeType.startsWith('image/')) {
      res.setHeader('Content-Disposition', 'inline');
    } else {
      // For other files, still allow inline viewing but with filename
      res.setHeader('Content-Disposition', `inline; filename="${attachment.originalName}"`);
    }

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error viewing attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Error viewing attachment',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getUserChats,
  getOrCreateChat,
  getChatMessages,
  sendMessage,
  getAvailableUsers,
  sendConnectionRequest,
  getConnectionRequests,
  respondToConnectionRequest,
  downloadAttachment,
  viewAttachment
};

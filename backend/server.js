const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { scheduleCleanup } = require('./utils/fileCleanup');
const socketAuth = require('./middleware/socketAuth');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const departmentRoutes = require('./routes/departments');
const leaveRoutes = require('./routes/leaves');
const teamRoutes = require('./routes/teams');
const holidayRoutes = require('./routes/holidays');
const ticketRoutes = require('./routes/tickets');
const faqRoutes = require('./routes/faq');
const debugRoutes = require('./routes/debug');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || 'http://localhost:3000',
      'http://localhost:3001'
    ],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('MongoDB connected successfully');
  
  // Initialize system data in correct order after database connection is established
  try {
    console.log('Starting system initialization...');
    
    // Step 1: Ensure system admin user exists
    const createAdminUser = require('./scripts/createAdmin');
    await createAdminUser();
    
    // Step 2: Create departments (requires admin user for createdBy field)
    const createDepartments = require('./scripts/createDepartments');
    await createDepartments();
    
    // Step 3: Create dummy users (requires departments to exist)
    const createDummyUsers = require('./scripts/createDummyUsers');
    await createDummyUsers();
    
    console.log('System initialization completed successfully');
    
    // Initialize document cleanup scheduler
    scheduleCleanup();
    
  } catch (error) {
    console.error('Error during initialization:', error);
  }
})
.catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/chat', chatRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'HRM Backend Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Socket.IO Authentication and Event Handlers
io.use(socketAuth);

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`User ${socket.user.firstName} ${socket.user.lastName} connected`);
  
  // Store user connection
  connectedUsers.set(socket.userId, {
    socketId: socket.id,
    user: socket.user,
    lastSeen: new Date()
  });

  // Join user to their personal room
  socket.join(`user_${socket.userId}`);

  // Emit online status to all connected users
  socket.broadcast.emit('user_online', {
    userId: socket.userId,
    user: {
      _id: socket.user._id,
      firstName: socket.user.firstName,
      lastName: socket.user.lastName,
      role: socket.user.role
    }
  });

  // Handle joining chat rooms
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.userId} joined chat ${chatId}`);
  });

  // Handle leaving chat rooms
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User ${socket.userId} left chat ${chatId}`);
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, messageId, attachments = [] } = data;
      
      console.log('Socket send_message received:', {
        chatId,
        messageId,
        hasAttachments: attachments.length > 0,
        attachmentCount: attachments.length
      });
      
      // Broadcast message to all users in the chat room
      socket.to(`chat_${chatId}`).emit('new_message', {
        messageId,
        chatId,
        content,
        attachments,
        sender: {
          _id: socket.user._id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          role: socket.user.role
        },
        createdAt: new Date()
      });

      // Mark message as delivered to online users
      const Chat = require('./models/Chat');
      const Message = require('./models/Message');
      
      const chat = await Chat.findById(chatId).populate('participants', '_id');
      if (chat) {
        const otherParticipants = chat.participants.filter(p => 
          p._id.toString() !== socket.userId
        );

        for (const participant of otherParticipants) {
          const userConnection = connectedUsers.get(participant._id.toString());
          if (userConnection) {
            // Mark as delivered
            const message = await Message.findById(messageId);
            if (message) {
              await message.markAsDelivered(participant._id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling send_message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing_start', (data) => {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', {
      userId: socket.userId,
      user: {
        firstName: socket.user.firstName,
        lastName: socket.user.lastName
      },
      chatId
    });
  });

  socket.on('typing_stop', (data) => {
    const { chatId } = data;
    socket.to(`chat_${chatId}`).emit('user_stop_typing', {
      userId: socket.userId,
      chatId
    });
  });

  // Handle message read receipts
  socket.on('mark_messages_read', async (data) => {
    try {
      const { chatId, messageIds } = data;
      
      const Message = require('./models/Message');
      
      // Mark messages as read
      await Promise.all(
        messageIds.map(async (messageId) => {
          const message = await Message.findById(messageId);
          if (message && !message.isReadBy(socket.userId)) {
            await message.markAsRead(socket.userId);
          }
        })
      );

      // Notify other participants that messages were read
      socket.to(`chat_${chatId}`).emit('messages_read', {
        userId: socket.userId,
        messageIds,
        chatId
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  // Handle connection requests
  socket.on('connection_request_sent', (data) => {
    console.log('=== DEBUG: connection_request_sent ===');
    console.log('Data received:', data);
    
    const { recipientId, request } = data;
    const recipientConnection = connectedUsers.get(recipientId);
    
    console.log('Recipient ID:', recipientId);
    console.log('Recipient connection found:', !!recipientConnection);
    console.log('Request:', request);
    
    if (recipientConnection) {
      console.log('Sending new_connection_request to recipient socket:', recipientConnection.socketId);
      io.to(recipientConnection.socketId).emit('new_connection_request', {
        request,
        requester: {
          _id: socket.user._id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          role: socket.user.role
        }
      });
    } else {
      console.log('Recipient not connected, cannot send real-time notification');
    }
  });

  socket.on('connection_request_response', (data) => {
    const { requesterId, action, request } = data;
    const requesterConnection = connectedUsers.get(requesterId);
    
    if (requesterConnection) {
      io.to(requesterConnection.socketId).emit('connection_request_responded', {
        action,
        request,
        responder: {
          _id: socket.user._id,
          firstName: socket.user.firstName,
          lastName: socket.user.lastName,
          role: socket.user.role
        }
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.firstName} ${socket.user.lastName} disconnected`);
    
    // Remove user from connected users
    connectedUsers.delete(socket.userId);

    // Emit offline status to all connected users
    socket.broadcast.emit('user_offline', {
      userId: socket.userId,
      lastSeen: new Date()
    });
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
  console.log(`Socket.IO server initialized`);
});

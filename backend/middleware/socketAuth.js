const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Socket.IO authentication middleware
const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('Account is deactivated'));
    }

    // Add user to socket object
    socket.user = user;
    socket.userId = user._id.toString();
    
    next();
  } catch (error) {
    console.error('Socket auth error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    
    next(new Error('Authentication failed'));
  }
};

module.exports = socketAuth;

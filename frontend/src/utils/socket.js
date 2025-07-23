import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
    
    this.socket = io(serverUrl, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Join a chat room
  joinChat(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_chat', chatId);
    }
  }

  // Leave a chat room
  leaveChat(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_chat', chatId);
    }
  }

  // Send a message
  sendMessage(chatId, content, messageId, attachments = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', {
        chatId,
        content,
        messageId,
        attachments
      });
    }
  }

  // Typing indicators
  startTyping(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_start', { chatId });
    }
  }

  stopTyping(chatId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing_stop', { chatId });
    }
  }

  // Mark messages as read
  markMessagesRead(chatId, messageIds) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_messages_read', {
        chatId,
        messageIds
      });
    }
  }

  // Connection request events
  sendConnectionRequestNotification(recipientId, request) {
    console.log('=== DEBUG: sendConnectionRequestNotification ===');
    console.log('Socket connected:', this.isConnected);
    console.log('Recipient ID:', recipientId);
    console.log('Request:', request);
    
    if (this.socket && this.isConnected) {
      console.log('Emitting connection_request_sent event');
      this.socket.emit('connection_request_sent', {
        recipientId,
        request
      });
    } else {
      console.log('Socket not connected, cannot send notification');
    }
  }

  sendConnectionRequestResponse(requesterId, action, request) {
    if (this.socket && this.isConnected) {
      this.socket.emit('connection_request_response', {
        requesterId,
        action,
        request
      });
    }
  }

  // Event listeners
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.listeners.has(event)) {
        this.listeners.set(event, []);
      }
      this.listeners.get(event).push(callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.listeners.has(event)) {
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;

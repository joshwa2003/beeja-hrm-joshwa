import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatShortcut } from '../../context/ChatShortcutContext';
import { useAuth } from '../../context/AuthContext';
import { chatAPI } from '../../utils/api';
import socketService from '../../utils/socket';

const MiniChatWindow = () => {
  const { user } = useAuth();
  const { activeMiniChat, closeMiniChat, updateChatAfterMessage, onlineUsers } = useChatShortcut();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const otherUser = activeMiniChat?.otherParticipant;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages for the active chat
  const loadMessages = useCallback(async () => {
    if (!activeMiniChat?._id) return;

    try {
      setLoading(true);
      const response = await chatAPI.getChatMessages(activeMiniChat._id, {
        page: 1,
        limit: 50
      });

      if (response.data.success) {
        setMessages(response.data.messages.reverse());
        
        // Mark messages as read
        const unreadMessages = response.data.messages.filter(
          msg => !msg.readBy.some(read => read.user === user._id)
        );
        
        if (unreadMessages.length > 0) {
          const unreadMessageIds = unreadMessages.map(msg => msg._id);
          socketService.markMessagesRead(activeMiniChat._id, unreadMessageIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [activeMiniChat?._id, user._id]);

  // Initialize chat when activeMiniChat changes
  useEffect(() => {
    if (activeMiniChat) {
      setMessages([]);
      loadMessages();
      
      // Focus input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [activeMiniChat, loadMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event listeners
  useEffect(() => {
    if (!activeMiniChat) return;

    const handleNewMessage = (messageData) => {
      if (messageData.chatId === activeMiniChat._id) {
        const newMsg = {
          _id: messageData.messageId,
          content: messageData.content,
          sender: messageData.sender,
          createdAt: messageData.createdAt,
          attachments: messageData.attachments || [],
          readBy: [{ user: user._id, readAt: new Date() }]
        };
        
        setMessages(prev => [...prev, newMsg]);
        
        // Mark as read immediately
        socketService.markMessagesRead(activeMiniChat._id, [messageData.messageId]);
      }
    };

    socketService.on('new_message', handleNewMessage);

    return () => {
      socketService.off('new_message', handleNewMessage);
    };
  }, [activeMiniChat, user._id]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending || !activeMiniChat) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('content', messageContent);

      const response = await chatAPI.sendMessage(activeMiniChat._id, formData);
      
      if (response.data.success) {
        const sentMessage = response.data.message;
        
        // Add message to local state
        setMessages(prev => [...prev, sentMessage]);
        
        // Emit via socket for real-time delivery
        socketService.sendMessage(
          activeMiniChat._id, 
          sentMessage.content, 
          sentMessage._id, 
          sentMessage.attachments
        );
        
        // Update chat in context
        updateChatAfterMessage(activeMiniChat._id, sentMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Re-add message to input on error
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  // Handle input key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Format message time
  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get user initials
  const getInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  // Check if user is online
  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  if (!activeMiniChat) return null;

  return (
    <div className="mini-chat-window">
      {/* Header */}
      <div className="mini-chat-header">
        <div className="mini-chat-user-info">
          <div className="mini-chat-avatar">
            {getInitials(otherUser)}
            {isUserOnline(otherUser?._id) && (
              <div className="mini-chat-online-indicator"></div>
            )}
          </div>
          <div className="mini-chat-name">
            {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
          </div>
        </div>
        <button
          className="mini-chat-close"
          onClick={closeMiniChat}
          title="Close chat"
        >
          <i className="bi bi-x"></i>
        </button>
      </div>

      {/* Messages */}
      <div className="mini-chat-messages">
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 mb-0 text-muted small">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="bi bi-chat-text fs-3 mb-2 d-block opacity-50"></i>
            <p className="mb-0 small">No messages yet</p>
            <p className="mb-0 small">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            // Enhanced debugging and comparison logic (same as MessageBubble)
            const senderId = message.sender?._id || message.sender?.id;
            const currentUserId = user?._id || user?.id;
            const isOwnMessage = senderId === currentUserId;
            
            // Debug logging for mini chat alignment
            console.log('🔍 MiniChatWindow - Alignment Debug:', {
              messageId: message._id,
              content: message.content?.substring(0, 30) + '...',
              senderId: senderId,
              currentUserId: currentUserId,
              senderName: message.sender ? `${message.sender.firstName} ${message.sender.lastName}` : 'Unknown',
              currentUserName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
              isOwnMessage: isOwnMessage,
              shouldBeOnRight: isOwnMessage ? '✅ YES - RIGHT SIDE' : '❌ NO - LEFT SIDE'
            });
            
            return (
              <div
                key={message._id}
                className={`mini-message-bubble ${isOwnMessage ? 'own' : ''}`}
                style={{
                  // Force alignment with inline styles as backup
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start'
                }}
              >
                <div className="mini-message-content">
                  {message.content}
                  <div className="mini-message-time">
                    {formatMessageTime(message.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="mini-chat-input-container">
        <form onSubmit={handleSendMessage}>
          <input
            ref={inputRef}
            type="text"
            className="mini-chat-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
          />
        </form>
      </div>
    </div>
  );
};

export default MiniChatWindow;

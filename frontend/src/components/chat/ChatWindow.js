import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI } from '../../utils/api';
import socketService from '../../utils/socket';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ chat, currentUser, onChatUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const otherUser = chat.otherParticipant;

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages
  const loadMessages = useCallback(async (pageNum = 1, append = false) => {
    if (!chat._id) return;

    setLoading(true);
    try {
      const response = await chatAPI.getChatMessages(chat._id, {
        page: pageNum,
        limit: 50
      });

      if (response.data.success) {
        const newMessages = response.data.messages;
        
        if (append) {
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
          setTimeout(scrollToBottom, 100);
        }
        
        setHasMore(response.data.pagination.hasMore);
        
        // Mark messages as read
        const unreadMessageIds = newMessages
          .filter(msg => msg.sender._id !== currentUser._id && !msg.readBy?.some(r => r.user === currentUser._id))
          .map(msg => msg._id);
          
        if (unreadMessageIds.length > 0) {
          socketService.markMessagesRead(chat._id, unreadMessageIds);
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chat._id, currentUser._id]);

  // Load more messages (pagination)
  const loadMoreMessages = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMessages(nextPage, true);
    }
  };

  // Initialize chat
  useEffect(() => {
    if (chat._id) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      loadMessages(1, false);
      
      // Join chat room
      socketService.joinChat(chat._id);
    }

    return () => {
      if (chat._id) {
        socketService.leaveChat(chat._id);
      }
    };
  }, [chat._id, loadMessages]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (messageData) => {
      if (messageData.chatId === chat._id) {
        console.log('Received new message via socket:', messageData);
        
        const newMessage = {
          _id: messageData.messageId,
          content: messageData.content,
          sender: messageData.sender,
          createdAt: messageData.createdAt,
          messageType: messageData.attachments && messageData.attachments.length > 0 ? 'file' : 'text',
          attachments: messageData.attachments || [],
          readBy: [],
          deliveredTo: []
        };
        
        setMessages(prev => [...prev, newMessage]);
        setTimeout(scrollToBottom, 100);
        
        // Mark as read immediately since user is viewing the chat
        socketService.markMessagesRead(chat._id, [messageData.messageId]);
      }
    };

    const handleUserTyping = (data) => {
      if (data.chatId === chat._id && data.userId !== currentUser._id) {
        setTypingUsers(prev => new Set([...prev, data.userId]));
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.chatId === chat._id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    const handleMessagesRead = (data) => {
      if (data.chatId === chat._id) {
        setMessages(prev => 
          prev.map(msg => {
            if (data.messageIds.includes(msg._id)) {
              return {
                ...msg,
                readBy: [...(msg.readBy || []), { user: data.userId, readAt: new Date() }]
              };
            }
            return msg;
          })
        );
      }
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('user_typing', handleUserTyping);
    socketService.on('user_stop_typing', handleUserStopTyping);
    socketService.on('messages_read', handleMessagesRead);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('user_typing', handleUserTyping);
      socketService.off('user_stop_typing', handleUserStopTyping);
      socketService.off('messages_read', handleMessagesRead);
    };
  }, [chat._id, currentUser._id]);

  // Handle typing indicators
  const handleTyping = () => {
    socketService.startTyping(chat._id);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(chat._id);
    }, 2000);
  };

  // Handle message input change
  const handleMessageChange = (e) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return false;
      }
      return true;
    });

    if (attachments.length + validFiles.length > 5) {
      setError('Maximum 5 files allowed per message');
      return;
    }

    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if ((!newMessage.trim() && attachments.length === 0) || sending) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', newMessage.trim() || 'File attachment');
      
      // Add attachments
      attachments.forEach(file => {
        formData.append('files', file);
      });

      const response = await chatAPI.sendMessage(chat._id, formData);
      
      if (response.data.success) {
        const sentMessage = response.data.message;
        
        // Add message to local state
        setMessages(prev => [...prev, sentMessage]);
        
        // Emit via socket for real-time delivery
        socketService.sendMessage(chat._id, sentMessage.content, sentMessage._id, sentMessage.attachments);
        
        // Clear form
        setNewMessage('');
        setAttachments([]);
        
        // Stop typing indicator
        socketService.stopTyping(chat._id);
        
        // Scroll to bottom
        setTimeout(scrollToBottom, 100);
        
        // Update chat in parent component
        onChatUpdate({
          ...chat,
          lastMessage: sentMessage,
          lastActivity: sentMessage.createdAt
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle scroll for pagination
  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && hasMore && !loading) {
      loadMoreMessages();
    }
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="d-flex flex-column" style={{ height: '91vh', margin: 0, padding: 0 }}>
      {/* Chat Header */}
      <div className="p-3 border-bottom bg-white shadow-sm flex-shrink-0" style={{ zIndex: 10 }}>
        <div className="d-flex align-items-center">
          <div className="me-3 position-relative">
            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: '40px', height: '40px', fontSize: '14px' }}
            >
              {getUserInitials(otherUser)}
            </div>
            {/* Online Status Indicator */}
            <div 
              className="position-absolute bg-success rounded-circle border border-2 border-white"
              style={{ 
                width: '12px', 
                height: '12px', 
                bottom: '2px', 
                right: '2px' 
              }}
              title="Online"
            ></div>
          </div>
          <div className="flex-grow-1">
            <h6 className="mb-0 fw-semibold">
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
            </h6>
            <small className="text-muted d-flex align-items-center">
              <span className="me-2">{otherUser?.role}</span>
              <span className="badge bg-success-subtle text-success-emphasis px-2 py-1 rounded-pill" style={{ fontSize: '0.7rem' }}>
                <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
                Online
              </span>
            </small>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div 
        className="flex-grow-1 overflow-auto px-3 py-2"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ 
          minHeight: 0,
          maxHeight: 'calc(100vh - 200px)'
        }}
      >
        {loading && page === 1 && (
          <div className="text-center py-3">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {hasMore && (
          <div className="text-center py-2">
            <button 
              className="btn btn-link btn-sm text-muted"
              onClick={loadMoreMessages}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        {messages.length === 0 && !loading ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-chat fs-1 mb-3 d-block"></i>
            <p>No messages yet</p>
            <small>Start the conversation by sending a message</small>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble
              key={message._id}
              message={message}
              currentUser={currentUser}
              isLastMessage={index === messages.length - 1}
              showAvatar={
                index === 0 || 
                messages[index - 1].sender._id !== message.sender._id
              }
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator Section - Fixed between messages and input */}
      {typingUsers.size > 0 && (
        <div 
          className="bg-white border-top px-3 py-2 flex-shrink-0"
          style={{ 
            zIndex: 999,
            borderBottom: '1px solid #dee2e6'
          }}
        >
          <div className="d-flex justify-content-start">
            <div className="me-2" style={{ width: '32px' }}>
              <div
                className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
                style={{ width: '32px', height: '32px', fontSize: '12px' }}
              >
                {getUserInitials(otherUser)}
              </div>
            </div>
            <div className="bg-light border rounded-3 px-3 py-2 d-flex align-items-center">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <small className="text-muted ms-2">typing...</small>
            </div>
          </div>
        </div>
      )}

      {/* Message Input at Bottom */}
      <div 
        className="bg-white border-top shadow-lg p-3 flex-shrink-0"
        style={{ 
          zIndex: 1000
        }}
      >
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="mb-3">
            <div className="d-flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="border rounded p-2 bg-light d-flex align-items-center">
                  <i className="bi bi-paperclip me-2 text-muted"></i>
                  <div className="me-2">
                    <div className="small fw-semibold text-truncate" style={{ maxWidth: '150px' }}>
                      {file.name}
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => removeAttachment(index)}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Form */}
        <form onSubmit={handleSendMessage} className="d-flex align-items-end gap-2">
          <div className="flex-grow-1">
            <div className="input-group">
              <textarea
                className="form-control border-2"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleMessageChange}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                rows="1"
                style={{ 
                  resize: 'none', 
                  minHeight: '42px',
                  borderRadius: '20px',
                  paddingLeft: '15px',
                  paddingRight: '15px'
                }}
                disabled={sending}
              />
              <button
                type="button"
                className="btn btn-outline-secondary border-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                style={{ borderRadius: '20px' }}
              >
                <i className="bi bi-paperclip"></i>
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center"
            disabled={sending || (!newMessage.trim() && attachments.length === 0)}
            style={{ width: '42px', height: '42px' }}
          >
            {sending ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Sending...</span>
              </div>
            ) : (
              <i className="bi bi-send"></i>
            )}
          </button>
        </form>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.zip,.rar,.7z"
          style={{ display: 'none' }}
        />

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger alert-dismissible fade show mt-2" role="alert">
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError('')}
              aria-label="Close"
            ></button>
          </div>
        )}
      </div>

      {/* CSS for typing indicator animation */}
      <style jsx>{`
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        .typing-indicator span {
          height: 6px;
          width: 6px;
          background-color: #999;
          border-radius: 50%;
          display: inline-block;
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-indicator span:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-indicator span:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow;

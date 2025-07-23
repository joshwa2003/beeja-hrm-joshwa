import React from 'react';
import { useChatShortcut } from '../../context/ChatShortcutContext';

const ChatPopup = () => {
  const { recentChats, onlineUsers, openMiniChat, loading } = useChatShortcut();

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const handleChatClick = (chat) => {
    openMiniChat(chat);
  };

  if (loading) {
    return (
      <div className="chat-popup">
        <div className="chat-popup-header">
          <i className="bi bi-chat-dots me-2"></i>
          Recent Chats
        </div>
        <div className="chat-popup-content">
          <div className="chat-popup-empty">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 mb-0">Loading chats...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-popup">
      <div className="chat-popup-header">
        <i className="bi bi-chat-dots me-2"></i>
        Recent Chats
      </div>
      <div className="chat-popup-content">
        {recentChats.length === 0 ? (
          <div className="chat-popup-empty">
            <i className="bi bi-chat-text d-block"></i>
            <p className="mb-1">No recent chats</p>
            <small>Start a conversation from the Messages page</small>
          </div>
        ) : (
          recentChats.map((chat) => {
            const otherUser = chat.otherParticipant;
            const isOnline = isUserOnline(otherUser?._id);
            
            return (
              <div
                key={chat._id}
                className="chat-popup-item"
                onClick={() => handleChatClick(chat)}
              >
                <div className="chat-popup-avatar">
                  {getInitials(otherUser)}
                  {isOnline && <div className="chat-popup-online-indicator"></div>}
                </div>
                
                <div className="chat-popup-info">
                  <div className="chat-popup-name">
                    {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
                  </div>
                  <div className="chat-popup-message">
                    {chat.lastMessage ? (
                      <>
                        {chat.lastMessage.sender?._id === chat.otherParticipant?._id ? '' : 'You: '}
                        {chat.lastMessage.content || 'Attachment'}
                      </>
                    ) : (
                      'No messages yet'
                    )}
                  </div>
                </div>
                
                <div className="chat-popup-meta">
                  {chat.lastMessage && (
                    <div className="chat-popup-time">
                      {formatLastSeen(chat.lastMessage.createdAt)}
                    </div>
                  )}
                  {chat.unreadCount > 0 && (
                    <div className="chat-popup-unread">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatPopup;

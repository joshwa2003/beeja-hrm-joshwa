import React, { useState } from 'react';

const ChatSidebar = ({
  chats,
  availableUsers,
  connectionRequests,
  selectedChat,
  searchQuery,
  onSearchChange,
  onChatSelect,
  onStartNewChat,
  onConnectionRequestResponse,
  onlineUsers,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState('chats');

  const formatLastSeen = (date) => {
    if (!date) return '';
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageDate.toLocaleDateString();
  };

  const getUserInitials = (user) => {
    if (!user) return '?';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const renderChatItem = (chat) => {
    const otherUser = chat.otherParticipant;
    const isSelected = selectedChat?._id === chat._id;
    const isOnline = isUserOnline(otherUser?._id);

    return (
      <div
        key={chat._id}
        className={`d-flex align-items-center p-3 border-bottom cursor-pointer ${
          isSelected ? 'bg-primary bg-opacity-10 border-primary' : 'hover-bg-light'
        }`}
        onClick={() => onChatSelect(chat)}
        style={{ cursor: 'pointer' }}
      >
        {/* Avatar */}
        <div className="position-relative me-3">
          <div
            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
            style={{ width: '48px', height: '48px', fontSize: '16px' }}
          >
            {getUserInitials(otherUser)}
          </div>
          {isOnline && (
            <span
              className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-2 border-white"
              style={{ width: '14px', height: '14px' }}
            ></span>
          )}
        </div>

        {/* Chat Info */}
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex justify-content-between align-items-start mb-1">
            <h6 className="mb-0 text-truncate fw-semibold">
              {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Unknown User'}
            </h6>
            <small className="text-muted ms-2 flex-shrink-0">
              {chat.lastMessage ? formatLastSeen(chat.lastMessage.createdAt) : ''}
            </small>
          </div>
          
          <div className="d-flex justify-content-between align-items-center">
            <p className="mb-0 text-muted small text-truncate">
              {chat.lastMessage ? (
                <>
                  {chat.lastMessage.sender?._id === currentUser._id && (
                    <i className="bi bi-check2 me-1"></i>
                  )}
                  {chat.lastMessage.content}
                </>
              ) : (
                <em>No messages yet</em>
              )}
            </p>
            
            {chat.unreadCount > 0 && (
              <span className="badge bg-primary rounded-pill ms-2 flex-shrink-0">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
          
          <small className="text-muted">
            {otherUser?.role}
          </small>
        </div>
      </div>
    );
  };

  const renderUserItem = (user) => {
    const isOnline = isUserOnline(user._id);

    return (
      <div
        key={user._id}
        className="d-flex align-items-center p-3 border-bottom cursor-pointer hover-bg-light"
        onClick={() => onStartNewChat(user)}
        style={{ cursor: 'pointer' }}
      >
        {/* Avatar */}
        <div className="position-relative me-3">
          <div
            className="rounded-circle bg-secondary d-flex align-items-center justify-content-center text-white fw-bold"
            style={{ width: '40px', height: '40px', fontSize: '14px' }}
          >
            {getUserInitials(user)}
          </div>
          {isOnline && (
            <span
              className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-2 border-white"
              style={{ width: '12px', height: '12px' }}
            ></span>
          )}
        </div>

        {/* User Info */}
        <div className="flex-grow-1 min-w-0">
          <h6 className="mb-0 text-truncate">
            {user.firstName} {user.lastName}
          </h6>
          <small className="text-muted">{user.role}</small>
          
          {/* Connection Status */}
          <div className="mt-1">
            {!user.canChat && user.needsApproval && (
              <span className="badge bg-warning text-dark small">
                {user.hasPendingRequest ? 'Request Sent' : 'Requires Connection'}
              </span>
            )}
            {user.canChat && (
              <span className="badge bg-success small">Can Chat</span>
            )}
          </div>
        </div>

        {/* Action Icon */}
        <div className="ms-2">
          {user.canChat ? (
            <i className="bi bi-chat-dots text-primary"></i>
          ) : user.hasPendingRequest ? (
            <i className="bi bi-clock text-warning"></i>
          ) : (
            <i className="bi bi-person-plus text-secondary"></i>
          )}
        </div>
      </div>
    );
  };

  const renderConnectionRequest = (request) => {
    return (
      <div key={request._id} className="border rounded p-3 mb-3 bg-light">
        <div className="d-flex align-items-start">
          {/* Avatar */}
          <div className="me-3">
            <div
              className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: '40px', height: '40px', fontSize: '14px' }}
            >
              {getUserInitials(request.requester)}
            </div>
          </div>

          {/* Request Info */}
          <div className="flex-grow-1">
            <h6 className="mb-1">
              {request.requester.firstName} {request.requester.lastName}
            </h6>
            <small className="text-muted d-block mb-2">
              {request.requester.role} • {formatLastSeen(request.createdAt)}
            </small>
            
            {request.message && (
              <p className="mb-2 small text-muted">
                "{request.message}"
              </p>
            )}

            {/* Action Buttons */}
            <div className="d-flex gap-2">
              <button
                className="btn btn-success btn-sm"
                onClick={() => onConnectionRequestResponse(request._id, 'approve')}
              >
                <i className="bi bi-check-lg me-1"></i>
                Approve
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => onConnectionRequestResponse(request._id, 'reject')}
              >
                <i className="bi bi-x-lg me-1"></i>
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-100 d-flex flex-column bg-white">
      {/* Custom CSS for better scrollbar */}
      <style jsx>{`
        .chat-sidebar-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-sidebar-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .chat-sidebar-content::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .chat-sidebar-content::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        .chat-sidebar-content {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }
      `}</style>
      {/* Header */}
      <div className="p-3 border-bottom bg-light">
        <h5 className="mb-3 fw-bold">
          <i className="bi bi-chat-dots me-2"></i>
          Messages
        </h5>

        {/* Search */}
        <div className="position-relative mb-3">
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search conversations or users..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
        </div>

        {/* Tabs */}
        <ul className="nav nav-pills nav-fill">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              Chats
              {chats.length > 0 && (
                <span className="badge bg-secondary ms-1">{chats.length}</span>
              )}
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
          </li>
          {['Admin', 'Vice President'].includes(currentUser?.role) && (
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                Requests
                {connectionRequests.length > 0 && (
                  <span className="badge bg-danger ms-1">{connectionRequests.length}</span>
                )}
              </button>
            </li>
          )}
        </ul>
      </div>

      {/* Content */}
      <div className="flex-grow-1 overflow-auto chat-sidebar-content" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {activeTab === 'chats' && (
          <div>
            {chats.length === 0 ? (
              <div className="text-center p-4 text-muted">
                <i className="bi bi-chat fs-1 mb-3 d-block"></i>
                <p>No conversations yet</p>
                <small>Start a new chat from the Users tab</small>
              </div>
            ) : (
              chats.map(renderChatItem)
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            {availableUsers.length === 0 ? (
              <div className="text-center p-4 text-muted">
                <i className="bi bi-people fs-1 mb-3 d-block"></i>
                <p>No users found</p>
                {searchQuery && <small>Try a different search term</small>}
              </div>
            ) : (
              availableUsers.map(renderUserItem)
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="p-3">
            {connectionRequests.length === 0 ? (
              <div className="text-center text-muted">
                <i className="bi bi-person-check fs-1 mb-3 d-block"></i>
                <p>No pending requests</p>
                <small>Connection requests will appear here</small>
              </div>
            ) : (
              connectionRequests.map(renderConnectionRequest)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;

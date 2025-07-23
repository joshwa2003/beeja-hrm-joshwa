import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatShortcut } from '../../context/ChatShortcutContext';
import { useAuth } from '../../context/AuthContext';
import ChatPopup from './ChatPopup';
import MiniChatWindow from './MiniChatWindow';
import './ChatShortcut.css';

const ChatShortcut = () => {
  const { user } = useAuth();
  const location = useLocation();
  const {
    totalUnreadCount,
    isPopupOpen,
    activeMiniChat,
    togglePopup
  } = useChatShortcut();
  
  const shortcutRef = useRef(null);
  const popupRef = useRef(null);

  // Hide chat shortcut when user is on the Messages page
  const isOnMessagesPage = location.pathname === '/chat';

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isPopupOpen &&
        shortcutRef.current &&
        popupRef.current &&
        !shortcutRef.current.contains(event.target) &&
        !popupRef.current.contains(event.target)
      ) {
        togglePopup();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopupOpen, togglePopup]);

  // Don't render if user is not logged in
  if (!user) return null;

  // Check if user has chat permissions
  const haschatPermission = ['Employee', 'Team Leader', 'Team Manager', 'HR Executive', 'HR Manager', 'HR BP', 'Vice President', 'Admin'].includes(user.role);
  
  if (!haschatPermission) return null;

  // Hide the chat shortcut button when user is on the Messages page
  if (isOnMessagesPage) return null;

  return (
    <>
      {/* Floating Chat Button */}
      <button
        ref={shortcutRef}
        className="chat-shortcut-button"
        onClick={togglePopup}
        title="Quick Chat"
        aria-label="Open chat shortcut"
      >
        <i className="bi bi-chat-dots"></i>
        {totalUnreadCount > 0 && (
          <span className="chat-shortcut-badge">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Chat Popup */}
      {isPopupOpen && (
        <div ref={popupRef}>
          <ChatPopup />
        </div>
      )}

      {/* Mini Chat Window */}
      {activeMiniChat && <MiniChatWindow />}
    </>
  );
};

export default ChatShortcut;

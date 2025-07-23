import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { chatAPI } from '../utils/api';
import socketService from '../utils/socket';

const ChatShortcutContext = createContext();

export const useChatShortcut = () => {
  const context = useContext(ChatShortcutContext);
  if (!context) {
    throw new Error('useChatShortcut must be used within a ChatShortcutProvider');
  }
  return context;
};

export const ChatShortcutProvider = ({ children }) => {
  const { user } = useAuth();
  const [recentChats, setRecentChats] = useState([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [activeMiniChat, setActiveMiniChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch recent chats (limit to 6 most recent)
  const fetchRecentChats = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await chatAPI.getUserChats();
      if (response.data.success) {
        const chats = response.data.chats.slice(0, 6); // Limit to 6 recent chats
        setRecentChats(chats);
        
        // Calculate total unread count
        const unreadCount = chats.reduce((total, chat) => total + (chat.unreadCount || 0), 0);
        setTotalUnreadCount(unreadCount);
      }
    } catch (error) {
      console.error('Error fetching recent chats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initialize socket connection and listeners
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
    }

    // Socket event listeners
    const handleNewMessage = (messageData) => {
      setRecentChats(prevChats => {
        return prevChats.map(chat => {
          if (chat._id === messageData.chatId) {
            const isActiveMiniChat = activeMiniChat?._id === chat._id;
            return {
              ...chat,
              lastMessage: {
                _id: messageData.messageId,
                content: messageData.content,
                sender: messageData.sender,
                createdAt: messageData.createdAt
              },
              lastActivity: messageData.createdAt,
              unreadCount: isActiveMiniChat ? 0 : (chat.unreadCount || 0) + 1
            };
          }
          return chat;
        });
      });

      // Update total unread count
      if (activeMiniChat?._id !== messageData.chatId) {
        setTotalUnreadCount(prev => prev + 1);
      }
    };

    const handleUserOnline = (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    };

    const handleUserOffline = (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    };

    socketService.on('new_message', handleNewMessage);
    socketService.on('user_online', handleUserOnline);
    socketService.on('user_offline', handleUserOffline);

    return () => {
      socketService.off('new_message', handleNewMessage);
      socketService.off('user_online', handleUserOnline);
      socketService.off('user_offline', handleUserOffline);
    };
  }, [user, activeMiniChat]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchRecentChats();
    }
  }, [user, fetchRecentChats]);

  // Toggle popup visibility
  const togglePopup = () => {
    setIsPopupOpen(!isPopupOpen);
  };

  // Open mini chat window
  const openMiniChat = (chat) => {
    setActiveMiniChat(chat);
    setIsPopupOpen(false);
    
    // Join chat room
    socketService.joinChat(chat._id);
    
    // Mark messages as read and update unread count
    if (chat.unreadCount > 0) {
      setRecentChats(prevChats =>
        prevChats.map(c =>
          c._id === chat._id ? { ...c, unreadCount: 0 } : c
        )
      );
      setTotalUnreadCount(prev => Math.max(0, prev - chat.unreadCount));
    }
  };

  // Close mini chat window
  const closeMiniChat = () => {
    if (activeMiniChat) {
      socketService.leaveChat(activeMiniChat._id);
    }
    setActiveMiniChat(null);
  };

  // Update chat after sending message
  const updateChatAfterMessage = (chatId, message) => {
    setRecentChats(prevChats =>
      prevChats.map(chat =>
        chat._id === chatId
          ? { ...chat, lastMessage: message, lastActivity: message.createdAt }
          : chat
      )
    );
  };

  const value = {
    recentChats,
    totalUnreadCount,
    isPopupOpen,
    activeMiniChat,
    onlineUsers,
    loading,
    togglePopup,
    openMiniChat,
    closeMiniChat,
    updateChatAfterMessage,
    fetchRecentChats
  };

  return (
    <ChatShortcutContext.Provider value={value}>
      {children}
    </ChatShortcutContext.Provider>
  );
};

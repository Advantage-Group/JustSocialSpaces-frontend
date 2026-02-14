import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { io } from 'socket.io-client';
import './Messages.css';

const Messages = () => {
  const { state, showNotification } = useApp();
  const navigate = useNavigate();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    
    // Initialize WebSocket connection
    const token = localStorage.getItem('token');
    if (token) {
      const socket = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
      });

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for new messages
  useEffect(() => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    const handleNewMessage = (data) => {
      if (data.conversationId === selectedConversation?.id) {
        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, { ...data.message, isOwn: data.message.sender.id === state.user?._id }];
        });
      }
      
      // Update conversation list
      setConversations(prev => prev.map(conv => 
        conv.id === data.conversationId 
          ? { ...conv, lastMessage: data.message, lastMessageAt: new Date(data.message.createdAt) }
          : conv
      ));
    };

    const handleConversationUpdated = (data) => {
      setConversations(prev => prev.map(conv => 
        conv.id === data.conversationId 
          ? { ...conv, lastMessage: data.lastMessage, lastMessageAt: new Date(data.lastMessage.createdAt) }
          : conv
      ));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('conversation:updated', handleConversationUpdated);
    };
  }, [selectedConversation?.id, state.user?._id]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation && selectedConversation.id && socketRef.current) {
      // Join conversation room via WebSocket
      socketRef.current.emit('conversation:join', { conversationId: selectedConversation.id }, (response) => {
        if (response?.ok) {
          // Get messages from WebSocket
          socketRef.current.emit('messages:get', { conversationId: selectedConversation.id }, (response) => {
            if (response?.ok) {
              setMessages(response.messages || []);
              setTimeout(() => scrollToBottom(), 100);
            } else {
              // Fallback to REST API
              fetchMessages(selectedConversation.id);
            }
          });
        } else {
          // Fallback to REST API
      fetchMessages(selectedConversation.id);
        }
      });
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/messages/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    if (!conversationId) {
      console.error('No conversation ID provided');
      return;
    }

    // Ensure conversationId is a string
    const convId = String(conversationId);
    if (!convId || convId === 'undefined' || convId === 'null') {
      console.error('Invalid conversation ID:', conversationId);
      showNotification('Invalid conversation ID', 'error');
      return;
    }

    setMessagesLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification('Please log in to view messages', 'error');
        setMessagesLoading(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/api/messages/conversations/${convId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        // Scroll to bottom after messages load
        setTimeout(() => scrollToBottom(), 100);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load messages' }));
        console.error('Error fetching messages:', errorData);
        showNotification(errorData.error || 'Failed to load messages', 'error');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      showNotification('Failed to load messages. Please try again.', 'error');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  const searchUsersFunc = async (query) => {
    if (!query.trim()) {
      setSearchUsers([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/search-users?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const startConversation = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: userId })
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(prev => [data.conversation, ...prev]);
        setSelectedConversation(data.conversation);
        setMessages([]);
        setShowUserSearch(false);
        setUserSearchQuery('');
        showNotification('Conversation started!', 'success');
        // Fetch messages for the new conversation
        if (data.conversation && data.conversation.id) {
          fetchMessages(data.conversation.id);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to start conversation' }));
        showNotification(errorData.error || 'Failed to start conversation', 'error');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      showNotification('Failed to start conversation', 'error');
    }
  };

  const formatMessageTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  const formatConversationTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatJoinDate = (date) => {
    if (!date) return '';
    const joinDate = new Date(date);
    return `Joined ${joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('token');
    const uploadedAttachments = [];

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('attachment', file);

        const response = await fetch('http://localhost:5000/api/messages/upload-attachment', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedAttachments.push(data.attachment);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Failed to upload file' }));
          showNotification(errorData.error || `Failed to upload ${file.name}`, 'error');
        }
      }

      if (uploadedAttachments.length > 0) {
        setSelectedFiles(prev => [...prev, ...uploadedAttachments]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      showNotification('Failed to upload files', 'error');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      // Attachment URLs are already served via our media proxy, so we can fetch directly.
      const response = await fetch(attachment.url);

      if (!response.ok) {
        throw new Error('Failed to download attachment');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fallbackExt =
        (attachment.mimetype && attachment.mimetype.includes('/') && attachment.mimetype.split('/')[1]) ||
        (attachment.type === 'video' ? 'mp4' : attachment.type === 'image' ? 'jpg' : 'bin');
      link.download = attachment.filename || `${attachment.type || 'file'}-${Date.now()}.${fallbackExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showNotification('Downloaded!', 'success');
    } catch (error) {
      console.error('Error downloading attachment:', error);
      showNotification('Failed to download', 'error');
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && selectedFiles.length === 0) || !selectedConversation || !socketRef.current) return;

    const messageContent = newMessage.trim();
    const attachmentsToSend = [...selectedFiles];
    
    setNewMessage(''); // Clear input immediately for better UX
    setSelectedFiles([]); // Clear attachments

    try {
      socketRef.current.emit('message:send', {
        conversationId: selectedConversation.id,
        content: messageContent,
        attachments: attachmentsToSend,
      }, (response) => {
        if (response?.ok) {
          // Message will be added via WebSocket event
          showNotification('Message sent!', 'success');
          setTimeout(() => scrollToBottom(), 100);
        } else {
          // Restore message on error
          setNewMessage(messageContent);
          setSelectedFiles(attachmentsToSend);
          showNotification(response?.error || 'Failed to send message', 'error');
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message on error
      setSelectedFiles(attachmentsToSend);
      showNotification('Failed to send message', 'error');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const otherParticipant = conv.participants?.find(p => p.id !== state.user?._id);
    return otherParticipant && (
      otherParticipant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherParticipant.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="messages-page">
      <div className="messages-content">
        {/* Conversations List */}
        <div className={`conversations-panel ${isMobile && selectedConversation ? 'hidden-mobile' : ''}`}>
      {/* Messages Header */}
      <div className="messages-header">
        <div className="messages-title">
          <h1>Messages</h1>
          <button className="settings-btn" aria-label="Message settings">
            <svg viewBox="0 0 24 24">
              <path d="M10.54 1.75h2.92l1.57 2.36c.11.17.32.25.53.21l2.53-.59 2.17 2.17-.58 2.54c-.05.2.04.41.21.53l2.36 1.57v2.92l-2.36 1.57c-.17.12-.26.33-.21.53l.58 2.54-2.17 2.17-2.53-.59c-.21-.04-.42.04-.53.21l-1.57 2.36h-2.92l-1.58-2.36c-.11-.17-.32-.25-.52-.21l-2.54.59-2.17-2.17.58-2.54c.05-.2-.03-.41-.21-.53l-2.35-1.57v-2.92L4.1 8.97c.18-.12.26-.33.21-.53L3.73 5.9 5.9 3.73l2.54.59c.2.04.41-.04.52-.21l1.58-2.36zm1.07 2l-.98 1.47C10.05 6.08 9 6.5 7.99 6.27l-1.46-.34-.6.6.33 1.46c.24 1.01-.18 2.07-1.05 2.64l-1.46.98v.78l1.46.98c.87.57 1.29 1.63 1.05 2.64l-.33 1.46.6.6 1.46-.34c1.01-.23 2.06.19 2.64 1.05l.98 1.47h.78l.97-1.47c.58-.86 1.63-1.28 2.65-1.05l1.45.34.61-.6-.34-1.46c-.23-1.01.18-2.07 1.05-2.64l1.47-.98v-.78l-1.47-.98c-.87-.57-1.28-1.63-1.05-2.64l.34-1.46-.61-.6-1.45.34c-1.02.23-2.07-.19-2.65-1.05l-.97-1.47h-.78zM12 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM12 8c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/>
            </svg>
          </button>
          <button className="new-message-btn" aria-label="New message" onClick={() => setShowUserSearch(true)}>
            <svg viewBox="0 0 24 24">
              <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/>
            </svg>
          </button>
        </div>
      </div>
          <div className="search-messages">
            <div className="search-input-container">
              <svg className="search-icon" viewBox="0 0 24 24">
                <path d="M10. 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z"/>
              </svg>
              <input
                type="text"
                placeholder="Search Direct Messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div className="conversations-list">
            {filteredConversations.map((conversation) => {
              const otherParticipant = conversation.participants.find(p => p.id !== state.user?._id);
              if (!otherParticipant) return null;

              return (
                <div
                  key={conversation.id}
                  className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                  onClick={() => {
                    if (conversation && conversation.id) {
                      setSelectedConversation(conversation);
                    } else {
                      console.error('Invalid conversation:', conversation);
                      showNotification('Invalid conversation', 'error');
                    }
                  }}
                >
                  <img
                    src={otherParticipant.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name || 'User')}&size=48`}
                    alt={otherParticipant.name}
                    className="conversation-avatar"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name || 'User')}&size=48`;
                    }}
                  />
                  <div className="conversation-info">
                    <div className="conversation-header">
                      <span className="conversation-name">{otherParticipant.name}</span>
                      <span className="conversation-time">
                        {formatConversationTime(new Date(conversation.lastMessageAt || conversation.createdAt))}
                      </span>
                    </div>
                    <div className="conversation-preview">
                      {conversation.lastMessage ? (
                        conversation.lastMessage.attachments && conversation.lastMessage.attachments.length > 0
                          ? `📎 ${conversation.lastMessage.attachments.length} attachment${conversation.lastMessage.attachments.length > 1 ? 's' : ''}${conversation.lastMessage.body || conversation.lastMessage.content ? ' • ' : ''}${conversation.lastMessage.body || conversation.lastMessage.content || ''}`
                          : (conversation.lastMessage.body || conversation.lastMessage.content)
                      ) : 'No messages yet'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Panel */}
        <div className={`chat-panel ${selectedConversation ? 'active' : ''}`}>
          {/* User Search Modal - Replaces chat panel when active */}
          {showUserSearch ? (
          <div className="user-search-modal">
            <div className="user-search-header">
              <button className="back-btn" onClick={() => setShowUserSearch(false)}>
                <svg viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
              </button>
              <h2>New message</h2>
              <button className="close-btn" onClick={() => setShowUserSearch(false)}>×</button>
            </div>
            <div className="user-search-input">
              <input
                type="text"
                placeholder="Search people"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  searchUsersFunc(e.target.value);
                }}
                  autoFocus
              />
            </div>
            <div className="user-search-results">
                {searchUsers.length === 0 && userSearchQuery.trim() ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#71767b' }}>
                    No users found
                  </div>
                ) : (
                  searchUsers.map((user) => (
                <div
                      key={user._id || user.id}
                  className="user-search-item"
                      onClick={() => startConversation(user._id || user.id)}
                >
                  <img src={user.photo} alt={user.name} className="user-avatar" />
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                  </div>
                </div>
                  ))
                )}
            </div>
          </div>
          ) : selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                {isMobile && (
                  <button className="back-btn-mobile" onClick={handleBackToConversations} aria-label="Back to conversations">
                    <svg viewBox="0 0 24 24">
                      <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
                    </svg>
                  </button>
                )}
                {selectedConversation.participants
                  .filter(p => p.id !== state.user?._id)
                  .map(otherParticipant => (
                    <React.Fragment key={otherParticipant.id}>
                      <img
                        src={otherParticipant.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name || 'User')}&size=32`}
                        alt={otherParticipant.name}
                        className="chat-avatar"
                        onClick={() => navigate(`/profile/${otherParticipant.id}`)}
                        style={{ cursor: 'pointer' }}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name || 'User')}&size=32`;
                        }}
                      />
                      <div className="chat-user-info" onClick={() => navigate(`/profile/${otherParticipant.id}`)} style={{ cursor: 'pointer', flex: 1 }}>
                        <h3 className="chat-user-name">{otherParticipant.name}</h3>
                        {otherParticipant.email && (
                          <p className="chat-user-handle">@{otherParticipant.email.split('@')[0]}</p>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                <button className="chat-info-btn" aria-label="Conversation info">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 8.75c-1.24 0-2.25 1.01-2.25 2.25s1.01 2.25 2.25 2.25 2.25-1.01 2.25-2.25S13.24 8.75 12 8.75zM12 17.25c-1.24 0-2.25 1.01-2.25 2.25S10.76 21.75 12 21.75s2.25-1.01 2.25-2.25-1.01-2.25-2.25-2.25zM12 .75C10.76.75 9.75 1.76 9.75 3S10.76 5.25 12 5.25 14.25 4.24 14.25 3 13.24.75 12 .75z"/>
                  </svg>
                </button>
              </div>

              {/* User Profile Section (Mobile) */}
              {isMobile && selectedConversation.participants
                .filter(p => p.id !== state.user?._id)
                .map(otherParticipant => (
                  <div key={otherParticipant.id} className="chat-user-profile-section">
                    <div className="chat-user-profile-content">
                      <img
                        src={otherParticipant.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name || 'User')}&size=80`}
                        alt={otherParticipant.name}
                        className="chat-user-profile-avatar"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(otherParticipant.name || 'User')}&size=80`;
                        }}
                      />
                      <h3 className="chat-user-profile-name">{otherParticipant.name}</h3>
                      {otherParticipant.email && (
                        <p className="chat-user-profile-handle">@{otherParticipant.email.split('@')[0]}</p>
                      )}
                      {otherParticipant.createdAt && (
                        <p className="chat-user-profile-join-date">{formatJoinDate(otherParticipant.createdAt)}</p>
                      )}
                      <button className="chat-user-profile-view-btn" onClick={() => {
                        if (otherParticipant.id) {
                          navigate(`/profile/${otherParticipant.id}`);
                        } else {
                          showNotification('Unable to view profile', 'error');
                        }
                      }}>
                        View Profile
                      </button>
                    </div>
                  </div>
                ))}

              {/* Date Separator */}
              {isMobile && messages.length > 0 && (
                <div className="chat-date-separator">
                  <span>Today</span>
                </div>
              )}

              {/* Messages */}
              <div className="messages-container">
                {messagesLoading ? (
                  <div className="messages-loading">
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="no-messages">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.isOwn ? 'own-message' : 'other-message'}`}
                  >
                    {!message.isOwn && (
                      <img
                            src={message.sender?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.name || 'User')}&size=32`}
                        alt={message.sender?.name}
                        className="message-avatar"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender?.name || 'User')}&size=32`;
                            }}
                      />
                    )}
                    <div className="message-content">
                      <div className="message-bubble">
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="message-attachments">
                            {message.attachments.map((attachment, idx) => (
                              <div key={idx} className="message-attachment">
                                {attachment.type === 'image' && (
                                  <div className="attachment-image-wrapper">
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.filename || 'Image attachment'}
                                      className="attachment-image"
                                      onClick={() => window.open(attachment.url, '_blank')}
                                      onLoad={() => {
                                        console.log('Message image loaded successfully:', attachment.url);
                                      }}
                                      onError={(e) => {
                                        console.error('Failed to load message image:', {
                                          url: attachment.url,
                                          filename: attachment.filename,
                                          type: attachment.type,
                                          attachment: attachment
                                        });
                                        e.target.style.display = 'none';
                                        // Show error placeholder
                                        const errorDiv = document.createElement('div');
                                        errorDiv.className = 'attachment-error';
                                        errorDiv.textContent = 'Image failed to load';
                                        errorDiv.style.cssText = 'padding: 20px; text-align: center; color: #71767b; background: #202327; border-radius: 12px; border: 1px solid #2f3336;';
                                        e.target.parentNode.appendChild(errorDiv);
                                      }}
                                      loading="lazy"
                                    />
                                    {!message.isOwn && (
                                      <>
                                        <button
                                          className="attachment-download-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadAttachment(attachment);
                                          }}
                                          aria-label="Download image"
                                          title="Download image"
                                        >
                                          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                          </svg>
                                        </button>
                                        <button
                                          className="attachment-image-download-btn"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadAttachment(attachment);
                                          }}
                                          aria-label="Download image"
                                          title="Download image"
                                        >
                                          Download
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                                {attachment.type === 'video' && (
                                  <div className="attachment-video-wrapper">
                                    <video 
                                      src={attachment.url} 
                                      controls
                                      className="attachment-video"
                                      onError={(e) => {
                                        console.error('Failed to load message video:', attachment.url);
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                    {!message.isOwn && (
                                      <button
                                        className="attachment-download-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadAttachment(attachment);
                                        }}
                                        aria-label="Download video"
                                        title="Download video"
                                      >
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                )}
                                {attachment.type === 'file' && (
                                  <div className="attachment-file-wrapper">
                                    <a 
                                      href={attachment.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="attachment-file"
                                    >
                                      <svg viewBox="0 0 24 24" width="24" height="24">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                      </svg>
                                      <span>{attachment.filename || 'File'}</span>
                                    </a>
                                    {!message.isOwn && (
                                      <button
                                        className="attachment-file-download-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownloadAttachment(attachment);
                                        }}
                                        aria-label="Download file"
                                        title="Download file"
                                      >
                                        Download
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(message.body || message.content) && (
                          <div className="message-text">
                            {message.body || message.content}
                          </div>
                        )}
                      </div>
                      <div className="message-time">
                        {message.sentAt || formatMessageTime(new Date(message.createdAt || message.sentAt))}
                      </div>
                    </div>
                  </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="message-input-container">
                {selectedFiles.length > 0 && (
                  <div className="selected-attachments">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="selected-attachment-preview">
                        {file.type === 'image' && (
                          <img src={file.url} alt={file.filename} className="preview-image" />
                        )}
                        {file.type === 'video' && (
                          <video src={file.url} className="preview-video" />
                        )}
                        {file.type === 'file' && (
                          <div className="preview-file">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                            <span>{file.filename}</span>
                          </div>
                        )}
                        <button 
                          className="remove-attachment-btn"
                          onClick={() => removeAttachment(idx)}
                          aria-label="Remove attachment"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="message-input-wrapper">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    style={{ display: 'none' }}
                  />
                  <button 
                    className="message-attach-btn" 
                    aria-label="Attach file"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
                    </svg>
                  </button>
                  <input
                    type="text"
                    placeholder={isMobile ? "Message" : "Start a new message"}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="message-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploading}
                    className="send-button"
                    aria-label="Send message"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M2.504 21.866l.526-2.108C3.04 19.719 4 15.823 4 12s-.96-7.719-.97-7.757l-.526-2.108L22.236 12 2.504 21.866zM5.981 13c-.072 1.962-.34 3.833-.583 5.183L17.764 12 5.398 5.817c.242 1.35.51 3.221.583 5.183H10v2H5.981z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <div className="no-conversation-content">
                <svg className="no-conversation-icon" viewBox="0 0 24 24">
                  <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/>
                </svg>
                <h2>Select a message</h2>
                <p>Choose from your existing conversations, start a new one, or just keep swimming.</p>
                <button className="new-message-cta" onClick={() => setShowUserSearch(true)}>New message</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;


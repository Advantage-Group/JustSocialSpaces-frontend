import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Notifications.css';

const Notifications = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (page === 1) {
        fetchNotifications(true); // Refresh first page
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (refresh = false) => {
    try {
      const currentPage = refresh ? 1 : page;
      const response = await fetch(`http://localhost:5000/api/notifications?page=${currentPage}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      
      if (refresh) {
        setNotifications(data.notifications);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
      
      setUnreadCount(data.unreadCount);
      setHasMore(data.notifications.length === 20);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
        // Update unread count if it was unread
        const notification = notifications.find(n => n._id === notificationId);
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
          </svg>
        );
      case 'comment':
      case 'reply':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.15 6.138 6.391l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
          </svg>
        );
      case 'retweet':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.791-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.791 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
          </svg>
        );
      case 'follow':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.173 13.164l1.491-3.829 3.829 1.491-3.829 1.491-1.491-3.829zm-7.569 2.571l-1.54-.39a3.124 3.124 0 01-1.672-1.5l-.84-1.69a3.12 3.12 0 01-.39-1.68l.39-1.54a3.124 3.124 0 011.5-1.672l1.69-.84a3.12 3.12 0 011.68-.39l1.54.39a3.124 3.124 0 011.672 1.5l.84 1.69a3.12 3.12 0 01.39 1.68l-.39 1.54a3.124 3.124 0 01-1.5 1.672l-1.69.84a3.12 3.12 0 01-1.68.39l-1.54-.39z"/>
          </svg>
        );
      case 'space':
      case 'space_joined':
      case 'space_invitation':
      case 'space_request':
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.234l-1.141-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z"/>
          </svg>
        );
    }
  };

  const getNotificationText = (notification) => {
    const userName = notification.fromUser?.name || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${userName} liked your post`;
      case 'comment':
        return `${userName} commented on your post`;
      case 'reply':
        return `${userName} replied to your comment`;
      case 'retweet':
        return `${userName} retweeted your post`;
      case 'follow':
        return `${userName} followed you`;
      case 'mention':
        // If it's a mention with a post, it's a new post notification
        if (notification.post) {
          return `${userName} posted something new`;
        }
        return `${userName} mentioned you`;
      case 'space':
        const spaceTitle = notification.space?.title || 'a space';
        return `${userName} started ${spaceTitle}`;
      case 'space_joined':
        const joinedSpaceTitle = notification.space?.title || 'your space';
        return `${userName} joined ${joinedSpaceTitle}`;
      case 'space_invitation':
        const invitedSpaceTitle = notification.space?.title || 'a space';
        return `${userName} invited you to join ${invitedSpaceTitle}`;
      case 'space_request':
        const requestedSpaceTitle = notification.space?.title || 'your space';
        return `${userName} requested to join ${requestedSpaceTitle}`;
      default:
        return 'New notification';
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return date.toLocaleDateString();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    if (notification.post && notification.post._id) {
      // Navigate to dashboard with post ID in query parameter
      navigate(`/dashboard?postId=${notification.post._id}`);
    } else if (notification.type === 'follow') {
      // For follow notifications, navigate to user profile
      if (notification.fromUser?._id) {
        navigate(`/profile/${notification.fromUser._id}`);
      } else {
        navigate('/dashboard');
      }
    } else if ((notification.type === 'space' || notification.type === 'space_joined' || notification.type === 'space_invitation' || notification.type === 'space_request') && notification.space) {
      // For space notifications, fetch space details and open it
      try {
        const token = localStorage.getItem('token');
        const spaceId = notification.space._id;
        
        const response = await fetch(`http://localhost:5000/api/spaces/${spaceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Store space data and navigate to home where JitsiMeeting can be opened
          localStorage.setItem('openSpace', JSON.stringify(data.space));
          navigate('/');
          // Trigger a custom event to open the space
          window.dispatchEvent(new CustomEvent('openSpace', { detail: data.space }));
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching space:', error);
        navigate('/dashboard');
      }
    } else {
      navigate('/dashboard');
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchNotifications();
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="notifications-page">
        <div className="notifications-header">
          <h1>Notifications</h1>
        </div>
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-notifications">
          <svg viewBox="0 0 24 24" width="64" height="64">
            <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.234l-1.141-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z"/>
          </svg>
          <p>No notifications yet</p>
          <span>When you get notifications, they'll show up here</span>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon-wrapper">
                <div className={`notification-icon ${notification.type}`}>
                  {getNotificationIcon(notification.type)}
                </div>
              </div>
              <div className="notification-content">
                <div className="notification-avatar">
                  <img
                    src={notification.fromUser?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.fromUser?.name || 'User')}`}
                    alt={notification.fromUser?.name}
                  />
                </div>
                <div className="notification-text">
                  <p>{getNotificationText(notification)}</p>
                  {notification.post && (
                    <div className="notification-post-preview">
                      {notification.post.content && (
                        <span>{notification.post.content.substring(0, 100)}...</span>
                      )}
                      {notification.post.images && notification.post.images.length > 0 && (
                        <span className="media-indicator">📷</span>
                      )}
                    </div>
                  )}
                  {notification.space && (
                    <div className="notification-space-preview">
                      <span className="space-indicator">🔴 LIVE</span>
                      <span>{notification.space.title || 'Untitled Space'}</span>
                    </div>
                  )}
                  <span className="notification-time">{formatTime(notification.createdAt)}</span>
                </div>
              </div>
              <button
                className="delete-notification"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification._id);
                }}
              >
                ×
              </button>
            </div>
          ))}
          
          {hasMore && (
            <button className="load-more-btn" onClick={loadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;


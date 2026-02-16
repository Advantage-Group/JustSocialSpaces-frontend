import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ActionTypes } from '../context/AppContext';
import SpacesModal from '../components/SpacesModal';
import ComposeModal from '../components/ComposeModal';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, logout } = useApp();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showSpacesModal, setShowSpacesModal] = React.useState(false);
  const [showComposeModal, setShowComposeModal] = React.useState(false);
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [suggestedUsers, setSuggestedUsers] = React.useState([]);
  const [followingUsers, setFollowingUsers] = React.useState(new Set());
  const [followLoading, setFollowLoading] = React.useState({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const searchTimeoutRef = React.useRef(null);
  const [avatarUpdateKey, setAvatarUpdateKey] = React.useState(Date.now());

  // Listen for profile photo updates
  React.useEffect(() => {
    const handleProfilePhotoUpdate = (event) => {
      console.log('MainLayout: Profile photo updated event received', event.detail);
      setAvatarUpdateKey(Date.now());
    };

    window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
    return () => {
      window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
    };
  }, []);

  const navigationItems = [
    {
      name: 'Home',
      path: '/dashboard',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M12 1.696L6.5 7.196V19.5h3v-5.5h5v5.5h3V7.196L12 1.696z" />
        </svg>
      )
    },
    {
      name: 'Explore',
      path: '/explore',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z" />
        </svg>
      )
    },
    {
      name: 'Notifications',
      path: '/notifications',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.234l-1.141-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z" />
        </svg>
      )
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" />
        </svg>
      )
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z" />
        </svg>
      )
    },
    {
      name: 'More',
      path: '/more',
      icon: (
        <svg viewBox="0 0 24 24">
          <path d="M3.75 12c0-4.56 3.69-8.25 8.25-8.25s8.25 3.69 8.25 8.25-3.69 8.25-8.25 8.25S3.75 16.56 3.75 12zM12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zm-4.75 11.5c.69 0 1.25-.56 1.25-1.25s-.56-1.25-1.25-1.25S6 11.31 6 12s.56 1.25 1.25 1.25zm9.5 0c.69 0 1.25-.56 1.25-1.25s-.56-1.25-1.25-1.25-1.25.56-1.25 1.25.56 1.25 1.25 1.25zM13.25 12c0 .69-.56 1.25-1.25 1.25s-1.25-.56-1.25-1.25.56-1.25 1.25-1.25 1.25.56 1.25 1.25z" />
        </svg>
      )
    }
  ];

  const handleNavigation = (path, name) => {
    navigate(path);
    dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: name.toLowerCase() });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfilePhoto = () => {
    setShowProfileMenu(false);
    navigate('/pick-profile-photo', { state: { returnTo: location.pathname } });
  };

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/home';
    }
    return location.pathname === path;
  };

  // Fetch notification count
  React.useEffect(() => {
    const fetchNotificationCount = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.count);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);

    // Refresh count when window gains focus (user returns to tab)
    const handleFocus = () => {
      fetchNotificationCount();
    };
    window.addEventListener('focus', handleFocus);

    // Refresh count when notifications page is visited
    if (location.pathname === '/notifications') {
      fetchNotificationCount();
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [location.pathname]);

  // Fetch suggested users
  React.useEffect(() => {
    const fetchSuggestedUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:5000/api/auth/suggested-users?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestedUsers(data.users || []);
          // Initialize following state
          const followingSet = new Set();
          (data.users || []).forEach(u => {
            if (u.isFollowing) {
              followingSet.add(u._id);
            }
          });
          setFollowingUsers(followingSet);
        }
      } catch (error) {
        console.error('Error fetching suggested users:', error);
      }
    };

    fetchSuggestedUsers();
  }, []);

  const handleFollowUser = async (userId) => {
    if (followLoading[userId]) return;

    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/follow/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFollowingUsers(prev => new Set([...prev, userId]));
        dispatch({
          type: ActionTypes.ADD_NOTIFICATION,
          payload: {
            id: Date.now(),
            message: 'Successfully followed user!',
            type: 'success'
          }
        });
        // Remove from suggestions after following
        setSuggestedUsers(prev => prev.filter(u => u._id !== userId));
      } else {
        const error = await response.json();
        dispatch({
          type: ActionTypes.ADD_NOTIFICATION,
          payload: {
            id: Date.now(),
            message: error.error || 'Failed to follow user',
            type: 'error'
          }
        });
      }
    } catch (error) {
      console.error('Error following user:', error);
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: {
          id: Date.now(),
          message: 'Failed to follow user',
          type: 'error'
        }
      });
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollowUser = async (userId) => {
    if (followLoading[userId]) return;

    setFollowLoading(prev => ({ ...prev, [userId]: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/unfollow/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        dispatch({
          type: ActionTypes.ADD_NOTIFICATION,
          payload: {
            id: Date.now(),
            message: 'Successfully unfollowed user',
            type: 'success'
          }
        });
      } else {
        const error = await response.json();
        dispatch({
          type: ActionTypes.ADD_NOTIFICATION,
          payload: {
            id: Date.now(),
            message: error.error || 'Failed to unfollow user',
            type: 'error'
          }
        });
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      dispatch({
        type: ActionTypes.ADD_NOTIFICATION,
        payload: {
          id: Date.now(),
          message: 'Failed to unfollow user',
          type: 'error'
        }
      });
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Format notification badge
  const getNotificationBadge = (count) => {
    if (count === 0) return null;
    if (count > 99) return '99+';
    return count.toString();
  };

  // Search users functionality
  const searchUsers = React.useCallback(async (query) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsSearching(false);
        return;
      }

      const response = await fetch(`http://localhost:5000/api/auth/search-users?q=${encodeURIComponent(query.trim())}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(false);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    if (value.trim().length > 0) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers(value);
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Close search results when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const searchSection = document.querySelector('.search-section');
      if (searchSection && !searchSection.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSearchResults]);

  // Handle space creation - dispatch event for Home.jsx to handle
  const handleSpaceCreated = (spaceData) => {
    // Store space data in localStorage as fallback (Home.jsx checks this)
    if (spaceData) {
      localStorage.setItem('openSpace', JSON.stringify(spaceData));
    }

    // Navigate to home if not already there
    if (location.pathname !== '/home' && location.pathname !== '/dashboard') {
      navigate('/home');
    } else {
      // If already on home/dashboard, dispatch event immediately
      const openSpaceEvent = new CustomEvent('openSpace', {
        detail: spaceData
      });
      window.dispatchEvent(openSpaceEvent);
    }
  };

  const isMessagesPage = location.pathname.startsWith('/messages');

  return (
    <div className="main-layout">
      {/* Notifications */}
      {state.notifications.map((notification) => (
        <div key={notification.id} className={`notification ${notification.type}-notification`}>
          <div className="notification-content">
            <span className={`notification-icon ${notification.type}-icon`}>
              {notification.type === 'success' ? '✓' : notification.type === 'error' ? '⚠' : 'ℹ'}
            </span>
            {notification.message}
            <button
              className="notification-close"
              onClick={() => dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: notification.id })}
            >
              ×
            </button>
          </div>
        </div>
      ))}

      {/* Three Column Container - Original Twitter/X Style */}
      <div className="layout-container">
        {/* Left Sidebar */}
        <div className={`left-sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="logo">𝕏</div>

          <nav className="nav-menu">
            {navigationItems.map((item) => (
              <button
                key={item.name}
                className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path, item.name)}
              >
                <div className="nav-icon">{item.icon}</div>
                {!state.sidebarCollapsed && (
                  <>
                    {item.name}
                    {item.name === 'Notifications' && getNotificationBadge(notificationCount) && (
                      <span className="notification-badge">{getNotificationBadge(notificationCount)}</span>
                    )}
                    {item.badge && item.name !== 'Notifications' && (
                      <span className="notification-badge">{item.badge}</span>
                    )}
                    {isActive(item.path) && <div className="active-dot"></div>}
                  </>
                )}
              </button>
            ))}
          </nav>

          {!state.sidebarCollapsed && (
            <div className="action-buttons">
              <button
                className="post-button"
                onClick={() => setShowComposeModal(true)}
              >
                Post
              </button>
            </div>
          )}

          <div className="user-profile-container">
            <div
              className="user-profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <img
                key={`sidebar-avatar-${state.user?._id || state.user?.id}-${state.user?.photo || 'default'}-${avatarUpdateKey}`}
                src={state.user?.photo ? `${state.user.photo}${state.user.photo.includes('?') ? '&' : '?'}v=${avatarUpdateKey}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user?.name || 'User')}
                alt="Profile"
                className="profile-pic"
                onError={(e) => {
                  console.error('Sidebar avatar failed to load:', state.user?.photo);
                  e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user?.name || 'User');
                }}
                onLoad={() => {
                  console.log('Sidebar avatar loaded:', state.user?.photo);
                }}
              />
              {!state.sidebarCollapsed && (
                <>
                  <div className="user-info">
                    <div className="user-name">{state.user?.name || 'User'}</div>
                    <div className="user-handle">@{state.user?.email?.split('@')[0] || 'user'}</div>
                  </div>
                  <button className="more-button">⋯</button>
                </>
              )}
            </div>

            {showProfileMenu && !state.sidebarCollapsed && (
              <div className="profile-menu">
                <div className="menu-item logout" onClick={handleLogout}>
                  Log out @{state.user?.email?.split('@')[0] || 'user'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className={`main-content ${isMessagesPage ? 'full-width' : ''}`}>
          {children}
        </div>

        {/* Right Sidebar - Hidden on Messages page */}
        {!isMessagesPage && (
          <div className="right-sidebar">
            <div className="search-section">
              <div className="search-box">
                <svg className="search-icon" viewBox="0 0 24 24">
                  <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z" />
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search users"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchResults.length > 0 || isSearching) {
                      setShowSearchResults(true);
                    }
                  }}
                />
                {isSearching && (
                  <div className="search-loading">
                    <div className="search-spinner"></div>
                  </div>
                )}
              </div>
              {showSearchResults && (
                <div className="search-results-dropdown">
                  {isSearching && searchResults.length === 0 ? (
                    <div className="search-result-item">
                      <div className="search-loading-text">Searching...</div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="search-results-header">Users</div>
                      {searchResults.map((user) => {
                        const isFollowing = followingUsers.has(user._id);
                        const isLoading = followLoading[user._id];
                        return (
                          <div
                            key={user._id}
                            className="search-result-item"
                            onClick={() => {
                              navigate(`/profile/${user._id}`);
                              setShowSearchResults(false);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                          >
                            <img
                              src={user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`}
                              alt={user.name || 'User'}
                              className="search-result-avatar"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`;
                              }}
                            />
                            <div className="search-result-info">
                              <div className="search-result-name">{user.name || 'User'}</div>
                              <div className="search-result-handle">@{user.email?.split('@')[0] || 'user'}</div>
                            </div>
                            <button
                              className={`search-result-follow-btn ${isFollowing ? 'following' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isFollowing) {
                                  handleUnfollowUser(user._id);
                                } else {
                                  handleFollowUser(user._id);
                                }
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                            </button>
                          </div>
                        );
                      })}
                    </>
                  ) : searchQuery.trim().length > 0 ? (
                    <div className="search-result-item">
                      <div className="search-no-results">No users found</div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="trending-section">
              <h3>What's happening</h3>
              <div className="trending-item">
                <span className="trending-category">Trending in Technology</span>
                <span className="trending-topic">React</span>
                <span className="trending-count">125K posts</span>
              </div>
              <div className="trending-item">
                <span className="trending-category">Trending</span>
                <span className="trending-topic">JavaScript</span>
                <span className="trending-count">89.2K posts</span>
              </div>
              <div className="trending-item">
                <span className="trending-category">Technology · Trending</span>
                <span className="trending-topic">Node.js</span>
                <span className="trending-count">45.1K posts</span>
              </div>
              <button className="show-more-link">Show more</button>
            </div>

            <div className="who-to-follow">
              <h3>Who to follow</h3>
              {suggestedUsers.length > 0 ? (
                suggestedUsers.map((suggestedUser) => {
                  const isFollowing = followingUsers.has(suggestedUser._id);
                  const isLoading = followLoading[suggestedUser._id];
                  return (
                    <div key={suggestedUser._id} className="follow-suggestion">
                      <img
                        src={suggestedUser.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestedUser.name || 'User')}`}
                        alt={suggestedUser.name || 'User'}
                        className="suggestion-pic"
                        onClick={() => navigate(`/profile/${suggestedUser._id}`)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div
                        className="suggestion-info"
                        onClick={() => navigate(`/profile/${suggestedUser._id}`)}
                        style={{ cursor: 'pointer', flex: 1 }}
                      >
                        <span className="suggestion-name">{suggestedUser.name || 'User'}</span>
                        <span className="suggestion-handle">@{suggestedUser.email?.split('@')[0] || 'user'}</span>
                      </div>
                      <button
                        className={`follow-btn ${isFollowing ? 'following' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFollowing) {
                            handleUnfollowUser(suggestedUser._id);
                          } else {
                            handleFollowUser(suggestedUser._id);
                          }
                        }}
                        disabled={isLoading}
                      >
                        {isLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: '12px 0', color: '#71767b', fontSize: '15px' }}>
                  No suggestions available
                </div>
              )}
              {suggestedUsers.length > 0 && (
                <button
                  className="show-more-link"
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    if (!token) return;
                    try {
                      const response = await fetch('http://localhost:5000/api/auth/suggested-users?limit=5', {
                        headers: {
                          'Authorization': `Bearer ${token}`
                        }
                      });
                      if (response.ok) {
                        const data = await response.json();
                        setSuggestedUsers(data.users || []);
                      }
                    } catch (error) {
                      console.error('Error fetching suggested users:', error);
                    }
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  Show more
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Spaces Modal */}
      <SpacesModal
        isOpen={showSpacesModal}
        onClose={() => setShowSpacesModal(false)}
        onSpaceCreated={handleSpaceCreated}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        onPostCreated={(newPost) => {
          dispatch({ type: ActionTypes.ADD_POST, payload: newPost });
          dispatch({
            type: ActionTypes.ADD_NOTIFICATION,
            payload: { message: 'Post created successfully!', type: 'success' }
          });
        }}
      />

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${(location.pathname === '/dashboard' || location.pathname === '/home') ? 'active' : ''}`}
          onClick={() => {
            const homePath = location.pathname === '/home' ? '/home' : '/dashboard';
            handleNavigation(homePath, 'Home');
          }}
        >
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M12 1.696L6.5 7.196V19.5h3v-5.5h5v5.5h3V7.196L12 1.696z" />
          </svg>
          <span>Home</span>
        </button>
        <button
          className={`mobile-nav-item ${isActive('/explore') ? 'active' : ''}`}
          onClick={() => handleNavigation('/explore', 'Explore')}
        >
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z" />
          </svg>
          <span>Search</span>
        </button>
        <button
          className={`mobile-nav-item ${isActive('/spaces') ? 'active' : ''}`}
          onClick={() => setShowSpacesModal(true)}
        >
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
          <span>Spaces</span>
        </button>
        <button
          className={`mobile-nav-item ${isActive('/notifications') ? 'active' : ''}`}
          onClick={() => handleNavigation('/notifications', 'Notifications')}
        >
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.234l-1.141-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z" />
          </svg>
          <span>Notifications</span>
          {getNotificationBadge(notificationCount) && (
            <span className="mobile-nav-badge">{getNotificationBadge(notificationCount)}</span>
          )}
        </button>
        <button
          className={`mobile-nav-item ${isActive('/messages') ? 'active' : ''}`}
          onClick={() => handleNavigation('/messages', 'Messages')}
        >
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z" />
          </svg>
          <span>Messages</span>
        </button>
      </div>
    </div>
  );
};

export default MainLayout;

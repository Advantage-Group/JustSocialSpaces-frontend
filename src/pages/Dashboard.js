import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import PollCreator from '../components/PollCreator';
import PollDisplay from '../components/PollDisplay';
import CommentModal from '../components/CommentModal';
import ShareModal from '../components/ShareModal';
import ComposeModal from '../components/ComposeModal';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('for-you');
  const [notification, setNotification] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollData, setPollData] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [showReactionPickerPostId, setShowReactionPickerPostId] = useState(null);
  const [reactionLoadingPostId, setReactionLoadingPostId] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [followingList, setFollowingList] = useState([]);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userData || !token) {
      navigate('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetchPosts();
      fetchSuggestedUsers();
      fetchFollowingList();
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  // Listen for profile photo updates and refresh posts
  useEffect(() => {
    const handleProfilePhotoUpdate = (event) => {
      const { userId, photoUrl } = event.detail;
      console.log('Dashboard: Profile photo updated event received', event.detail);
      
      // Update user state with new photo
      setUser(prevUser => {
        if (prevUser && (prevUser._id === userId || prevUser.id === userId)) {
          const updated = { ...prevUser, photo: photoUrl };
          // Also update localStorage
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        }
        return prevUser;
      });
      
      // Update posts in state to reflect new profile photo
      setPosts(prevPosts => {
        if (prevPosts && prevPosts.length > 0) {
          return prevPosts.map(post => {
            if (post.author && (post.author._id === userId || post.author.id === userId)) {
              return {
                ...post,
                author: {
                  ...post.author,
                  photo: photoUrl
                }
              };
            }
            return post;
          });
        }
        return prevPosts;
      });
      // Also refresh posts from server to get latest data
      fetchPosts();
    };

    window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
    return () => {
      window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-cache' // Prevent browser caching
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard - Fetched posts:', data.posts?.length, 'posts');
        // Log first post author photo for debugging
        if (data.posts && data.posts.length > 0) {
          console.log('Dashboard - First post author photo:', data.posts[0].author?.photo);
        }
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if ((!newPost.trim() && !pollData) || isPosting) return;

    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');
      const requestBody = { content: newPost };
      
      if (pollData) {
        // Use the main post content as the poll question
        const pollDataWithQuestion = {
          question: newPost.trim() || 'Poll Question',
          ...pollData
        };
        requestBody.poll = JSON.stringify(pollDataWithQuestion);
        console.log('Dashboard - Original pollData:', pollData);
        console.log('Dashboard - newPost content:', newPost);
        console.log('Dashboard - Final pollDataWithQuestion:', pollDataWithQuestion);
        console.log('Dashboard - Sending poll data to backend:', requestBody.poll);
      }

      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard - Post created response:', data);
        console.log('Dashboard - Post poll data:', data.post.poll);
        setPosts([data.post, ...posts]);
        setNewPost('');
        setPollData(null);
        setShowPollCreator(false);
        showNotification('Post created successfully!', 'success');
      } else {
        const errorData = await response.json();
        console.error('Dashboard - Post creation failed:', errorData);
        showNotification('Failed to create post', 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showNotification('Error creating post', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePollCreate = (poll) => {
    console.log('Dashboard - Poll created:', poll);
    setPollData(poll);
    setShowPollCreator(false);
    console.log('Dashboard - Poll data set, showPollCreator set to false');
  };

  const handlePollCancel = () => {
    setPollData(null);
    setShowPollCreator(false);
  };

  const handleVote = async (pollId, choiceIndex) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ choiceIndex })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the post with new poll data
        setPosts(posts.map(post => 
          post._id === posts.find(p => p.poll?._id === pollId)?._id 
            ? { ...post, poll: data.poll }
            : post
        ));
        showNotification('Vote recorded successfully!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to vote', 'error');
      }
    } catch (error) {
      console.error('Error voting:', error);
      showNotification('Error voting on poll', 'error');
    }
  };

  const handleOpenCommentModal = (post) => {
    setSelectedPostForComment(post);
    setShowCommentModal(true);
  };

  const handleCloseCommentModal = () => {
    setShowCommentModal(false);
    setSelectedPostForComment(null);
  };

  const handleCommentPosted = (comment) => {
    // Refresh posts to show updated reply count
    fetchPosts();
  };

  const handleAddOrChangeReaction = async (postId, emoji) => {
    setReactionLoadingPostId(postId);
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji })
      });
      fetchPosts();
    } catch (e) {
      showNotification('Failed to react. Try again.', 'error');
    } finally {
      setReactionLoadingPostId(null);
      setShowReactionPickerPostId(null);
    }
  };

  const handleRemoveReaction = async (postId) => {
    setReactionLoadingPostId(postId);
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPosts();
    } catch (e) {
      showNotification('Failed to remove reaction.', 'error');
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    return `${Math.floor(diffInSeconds / 86400)}d`;
  };

  const fetchSuggestedUsers = async () => {
    try {
      const token = localStorage.getItem('token');
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

  const fetchFollowingList = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        if (userData.following) {
          setFollowingList(userData.following.map(id => id.toString()));
        }
      }
    } catch (error) {
      console.error('Error fetching following list:', error);
    }
  };

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
        showNotification('Successfully followed user!', 'success');
        // Remove from suggestions after following
        setSuggestedUsers(prev => prev.filter(u => u._id !== userId));
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to follow user', 'error');
      }
    } catch (error) {
      console.error('Error following user:', error);
      showNotification('Failed to follow user', 'error');
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
        showNotification('Successfully unfollowed user', 'success');
      } else {
        const error = await response.json();
        showNotification(error.error || 'Failed to unfollow user', 'error');
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      showNotification('Failed to unfollow user', 'error');
    } finally {
      setFollowLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}-notification`}>
          <div className="notification-content">
            <span className={`notification-icon ${notification.type}-icon`}>
              {notification.type === 'success' ? '✓' : '⚠'}
            </span>
            {notification.message}
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="mobile-menu-overlay"
          onClick={() => setShowMobileMenu(false)}
        ></div>
      )}

      {/* Mobile Menu Button */}
      <button 
        className="mobile-menu-button"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {showMobileMenu ? (
            <path d="M18 6L6 18M6 6l12 12" strokeLinejoin="round"/>
          ) : (
            <>
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </>
          )}
        </svg>
      </button>

      {/* Left Sidebar */}
      <div className={`left-sidebar ${showMobileMenu ? 'mobile-open' : ''}`}>
        <div className="logo">𝕏</div>
        
        <nav className="nav-menu">
          <a 
            href="#" 
            className="nav-item active"
            onClick={(e) => {
              e.preventDefault();
              setShowMobileMenu(false);
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M12 1.696L6.5 7.196V19.5h3v-5.5h5v5.5h3V7.196L12 1.696z"/>
            </svg>
            Home
            <div className="active-dot"></div>
          </a>
          
          <a 
            href="#" 
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/explore');
              setShowMobileMenu(false);
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z"/>
            </svg>
            Explore
          </a>
          
          <a 
            href="#" 
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              setShowMobileMenu(false);
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.234l-1.141-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z"/>
            </svg>
            Notifications
            <span className="notification-badge">20+</span>
          </a>
          
          <a 
            href="#" 
            className="nav-item"
            onClick={(e) => {
              e.preventDefault();
              navigate('/messages');
              setShowMobileMenu(false);
            }}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/>
            </svg>
            Messages
          </a>
          
          <a href="#" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c-1.105 0-2 .9-2 2s.895 2 2 2 2-.9 2-2-.895-2-2-2zM8 6c0-2.21 1.791-4 4-4s4 1.79 4 4-1.791 4-4 4-4-1.79-4-4z"/>
            </svg>
            Profile
          </a>
          
          <a href="#" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M3.75 12c0-4.56 3.69-8.25 8.25-8.25s8.25 3.69 8.25 8.25-3.69 8.25-8.25 8.25S3.75 16.56 3.75 12zM12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zm-4.75 11.5c.69 0 1.25-.56 1.25-1.25s-.56-1.25-1.25-1.25S6 11.31 6 12s.56 1.25 1.25 1.25zm9.5 0c.69 0 1.25-.56 1.25-1.25s-.56-1.25-1.25-1.25-1.25.56-1.25 1.25.56 1.25 1.25 1.25zM13.25 12c0 .69-.56 1.25-1.25 1.25s-1.25-.56-1.25-1.25.56-1.25 1.25-1.25 1.25.56 1.25 1.25z"/>
            </svg>
            More
          </a>
        </nav>

        <button 
          className="post-button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMobileMenu(false);
            setShowComposeModal(true);
          }}
        >
          Post
        </button>

        <div className="user-profile-container">
          <div 
            className="user-profile"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowMobileMenu(false);
            }}
          >
            <img 
              key={`dashboard-sidebar-avatar-${user?._id || user?.id}-${user?.photo || 'default'}-${Date.now()}`}
              src={user?.photo ? `${user.photo}${user.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User')} 
              alt="Profile" 
              className="profile-pic"
              onError={(e) => {
                console.error('Dashboard sidebar avatar failed to load:', user?.photo);
                e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User');
              }}
            />
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-handle">@{user?.email?.split('@')[0] || 'user'}</div>
            </div>
            <button className="more-button">⋯</button>
          </div>

          {showProfileMenu && (
            <div className="profile-menu">
              <div className="menu-item logout" onClick={handleLogout}>
                Log out @{user?.email?.split('@')[0] || 'user'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center Column */}
      <div className="center-column">
        {/* Feed Header */}
        <div className="feed-header">
          <div className="feed-tabs">
            <button 
              className={`feed-tab ${activeTab === 'for-you' ? 'active' : ''}`}
              onClick={() => setActiveTab('for-you')}
            >
              For you
            </button>
            <button 
              className={`feed-tab ${activeTab === 'following' ? 'active following-active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Following
            </button>
          </div>
        </div>

        {/* Compose Post */}
        <div className="compose-post">
          <div className="compose-header">
            <img 
              key={`dashboard-compose-avatar-${user?._id || user?.id}-${user?.photo || 'default'}-${Date.now()}`}
              src={user?.photo ? `${user.photo}${user.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User')} 
              alt="Profile" 
              className="compose-profile-pic"
              onError={(e) => {
                console.error('Dashboard compose avatar failed to load:', user?.photo);
                e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User');
              }}
            />
            <div className="compose-input-container">
              <textarea
                className="compose-input"
                placeholder={showPollCreator ? "Ask a question..." : "What is happening?!"}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                disabled={isPosting}
              />
              {/* Debug info */}
              <div style={{ color: '#71767b', fontSize: '12px', marginTop: '4px' }}>
                Debug: showPollCreator = {showPollCreator.toString()}
              </div>
              <div className="compose-actions">
                <div className="compose-icons">
                  <button className="compose-icon" disabled>
                    <svg viewBox="0 0 24 24">
                      <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"/>
                    </svg>
                  </button>
                  <button className="compose-icon" disabled>
                    <svg viewBox="0 0 24 24">
                      <path d="M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13zM18 10.711V9.25h-3.74v5.5h1.44v-1.719h1.7V11.57h-1.7v-.859H18zM11.79 9.25h1.44v5.5h-1.44v-5.5zm-3.07 1.375c.34 0 .77.172 1.02.43l1.03-.86c-.51-.601-1.28-.945-2.05-.945C7.19 9.25 6 10.453 6 12s1.19 2.75 2.72 2.75c.77 0 1.54-.344 2.05-.945l-1.03-.86c-.25.258-.68.43-1.02.43-.76 0-1.29-.546-1.29-1.375S8.03 10.625 8.79 10.625z"/>
                    </svg>
                  </button>
                  <button 
                    className={`compose-icon ${showPollCreator ? 'active' : ''}`}
                    onClick={() => {
                      console.log('Poll button clicked, current state:', showPollCreator);
                      const newState = !showPollCreator;
                      setShowPollCreator(newState);
                      console.log('Poll creator should now be:', newState);
                      console.log('showPollCreator state updated to:', newState);
                    }}
                    disabled={isPosting}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM8 4h8v3.5l-4 4-4-4V4z"/>
                    </svg>
                  </button>
                </div>
                <button 
                  className={`compose-post-btn ${(newPost.trim() || pollData) ? 'active' : ''}`}
                  onClick={handlePost}
                  disabled={(!newPost.trim() && !pollData) || isPosting}
                >
                  {isPosting ? 'Posting...' : 'Post'}
                  {console.log('Post button state - newPost:', newPost, 'pollData:', pollData, 'disabled:', (!newPost.trim() && !pollData) || isPosting)}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Poll Creator - Integrated into compose area */}
        {showPollCreator && (
          <div className="poll-creator-integrated">
            <div style={{ background: '#1d1f23', padding: '16px', borderRadius: '8px', margin: '8px 0' }}>
              <h3 style={{ color: '#1d9bf0', margin: '0 0 16px 0' }}>Poll Creator</h3>
              <PollCreator
                onPollCreate={handlePollCreate}
                onCancel={handlePollCancel}
              />
            </div>
          </div>
        )}

        {/* Posts Feed */}
        <div className="posts-feed">
          {(() => {
            // Filter posts based on active tab
            let filteredPosts = posts;
            const currentUserId = user?._id?.toString() || user?.id?.toString();
            
            if (activeTab === 'following') {
              // Only show posts from users you follow, plus your own posts
              filteredPosts = posts.filter(post => {
                const postAuthorId = post.author?._id?.toString() || post.author?.id?.toString();
                // Include own posts and posts from followed users
                return postAuthorId === currentUserId || followingList.includes(postAuthorId);
              });
            }
            // For 'for-you' tab, show all posts (no filtering)

            if (filteredPosts.length === 0) {
              if (activeTab === 'following') {
                return (
                  <div className="no-posts">
                    <svg className="no-posts-icon" viewBox="0 0 24 24">
                      <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10H6v10H4zm9.248 0v-7h2v7h-2z"/>
                    </svg>
                    <h3>No posts yet</h3>
                    <p>When people you follow post, their posts will show up here.</p>
                  </div>
                );
              }
              return (
                <div className="no-posts">
                  <svg className="no-posts-icon" viewBox="0 0 24 24">
                    <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10H6v10H4zm9.248 0v-7h2v7h-2z"/>
                  </svg>
                  <h3>Welcome to X!</h3>
                  <p>This is the best place to see what's happening in your world. Find some people and topics to follow now.</p>
                </div>
              );
            }

            return filteredPosts.map((post) => (
              <div key={post._id} className="post-card">
                <div className="post-header">
                  <img 
                    key={`dashboard-post-avatar-${post._id}-${post.author?._id || post.author?.id}-${post.author?.photo || 'default'}`}
                    src={post.author?.photo ? `${post.author.photo}${post.author.photo.includes('?') ? '&' : '?'}t=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.author?.name || 'User')} 
                    alt="Profile" 
                    className="post-profile-pic"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.author?._id || post.author?.id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      console.error('Dashboard post avatar failed to load:', post.author?.photo);
                      e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.author?.name || 'User');
                    }}
                  />
                  <div className="post-user-info">
                    <span 
                      className="post-user-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${post.author?._id || post.author?.id}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {post.author?.name || 'User'}
                    </span>
                    <span className="post-user-handle"> @{post.author?.email?.split('@')[0] || 'user'}</span>
                    <span className="post-timestamp"> · {formatTimeAgo(post.createdAt)}</span>
                  </div>
                </div>
                {/* Show 'Replying to' if this post is a reply */}
                {post.parentAuthor && (
                  <div className="replying-to-label">
                    Replying to<span className="replying-to-email"> {post.parentAuthor.email}</span>
                  </div>
                )}
                <div className="post-content">{post.content}</div>
                
                {/* Poll Display */}
                {post.poll && (
                  <>
                    {console.log('Dashboard - Rendering poll for post:', post._id, 'poll data:', post.poll)}
                    <PollDisplay
                      poll={{
                        ...post.poll,
                        author: post.author
                      }}
                      currentUserId={user?._id}
                      onVote={handleVote}
                    />
                  </>
                )}
                {!post.poll && post.content && console.log('Dashboard - Post has no poll:', post._id, 'content:', post.content)}
                
                {/* Post Media */}
                {((post.images && post.images.length > 0) || (post.media && post.media.length > 0)) && (
                  <div className="post-images">
                    <div className={`post-image-grid ${(post.media?.length || post.images?.length || 0) === 1 ? 'single' : (post.media?.length || post.images?.length || 0) === 2 ? 'double' : 'multiple'}`}>
                      {/* Display new media format */}
                      {post.media && post.media.map((mediaItem, index) => (
                        <div key={index} className="post-image-container">
                          {mediaItem.type === 'video' ? (
                            <video 
                              src={mediaItem.url}
                              className="post-image"
                              controls
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <img 
                              src={mediaItem.url}
                              alt={`Post media ${index + 1}`}
                              className="post-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                      ))}
                      {/* Fallback to old images format for backward compatibility */}
                      {(!post.media || post.media.length === 0) && post.images && post.images.map((image, index) => (
                        <div key={index} className="post-image-container">
                          <img 
                            src={image}
                            alt={`Post image ${index + 1}`}
                            className="post-image"
                            onError={(e) => {
                              console.error('Failed to load image:', image);
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="post-actions">
                  <button 
                    className="post-action"
                    onClick={() => handleOpenCommentModal(post)}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                    </svg>
                    <span>{post.replies || 0}</span>
                  </button>
                  <button className="post-action">
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span>0</span>
                  </button>
                  <button className="post-action">
                    <svg viewBox="0 0 24 24">
                      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                    </svg>
                    <span>0</span>
                  </button>
                  <button 
                    className="post-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPostForShare(post);
                      setShowShareModal(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
                    </svg>
                  </button>
                </div>
                {/* Emoji Reactions Bar */}
                {!post.poll && (
                  <div className="post-reactions">
                    {(() => {
                      const byEmoji = {};
                      (post.reactions || []).forEach(r => {
                        if (!byEmoji[r.emoji]) byEmoji[r.emoji] = { count: 0, self: false };
                        byEmoji[r.emoji].count++;
                        if (r.userId === (user?._id || user?.id)) byEmoji[r.emoji].self = true;
                      });
                      const emojis = Object.entries(byEmoji);
                      return (
                        <div className="reactions-container">
                          {emojis.map(([emoji, info]) => (
                            <button
                              key={emoji}
                              className={`reaction-btn${info.self ? ' my-reaction' : ''}`}
                              disabled={reactionLoadingPostId === post._id}
                              onClick={() => info.self ? handleRemoveReaction(post._id) : handleAddOrChangeReaction(post._id, emoji)}
                              style={{ fontSize: 20, background: info.self ? '#1d9bf0' : '#23272c', borderRadius: 18, padding: '2px 10px', border: 'none', cursor: 'pointer', color: 'white', outline: info.self ? '2px solid #ffd400' : 'none', opacity: reactionLoadingPostId===post._id ? 0.6 : 1 }}
                              title={info.self ? 'Remove your reaction' : 'React'}
                            >
                              {emoji} {info.count > 1 && <span className="reaction-count">{info.count}</span>}
                            </button>
                          ))}
                          {/* Smiley for adding/changing reaction */}
                          <button
                            className="add-reaction-btn"
                            style={{ border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: 0, color: '#1d9bf0', marginLeft: 2, display: 'flex', alignItems: 'center' }}
                            title="React with emoji"
                            disabled={reactionLoadingPostId===post._id}
                            onClick={() => setShowReactionPickerPostId(post._id)}
                          >
                            <svg viewBox="0 0 24 24" width="22" height="22">
                              <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 18c-2.137 0-3.998-1.157-4.9-2.889-.126-.242.06-.535.332-.535h9.136c.272 0 .458.293.332.535C15.998 16.843 14.137 18 12 18z" fill="currentColor"/>
                            </svg>
                          </button>
                          {showReactionPickerPostId===post._id && (
                            <div style={{ position: 'absolute', zIndex: 1003, marginTop: 8 }}>
                              <Picker 
                                data={emojiData}
                                theme="dark"
                                onEmojiSelect={emoji => handleAddOrChangeReaction(post._id, emoji.native)}
                                previewPosition="none"
                                perLine={8}
                              />
                              <button onClick={() => setShowReactionPickerPostId(null)} style={{ marginTop: 2, fontSize: 13, background: 'none', color: '#aaa', border: 'none', cursor: 'pointer' }}>Close</button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="right-sidebar">
        <div className="search-section">
          <div className="search-box">
            <svg className="search-icon" viewBox="0 0 24 24">
              <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z"/>
            </svg>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search"
            />
          </div>
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
          <a href="#" className="show-more-link">Show more</a>
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
              onClick={fetchSuggestedUsers}
              style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            >
              Show more
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-bottom-nav">
        <button className="mobile-nav-item active">
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M12 1.696L6.5 7.196V19.5h3v-5.5h5v5.5h3V7.196L12 1.696z"/>
          </svg>
          <span>Home</span>
        </button>
        <button className="mobile-nav-item" onClick={() => navigate('/explore')}>
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781C14.065 17.318 12.236 18 10.25 18c-4.694 0-8.5-3.806-8.5-8.5z"/>
          </svg>
          <span>Explore</span>
        </button>
        <button className="mobile-nav-item">
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M19.993 9.042C19.48 5.017 16.054 2 11.996 2s-7.49 3.021-7.999 7.051L2.866 18H7.1c.463 2.282 2.481 4 4.9 4s4.437-1.718 4.9-4h4.234l-1.141-8.958zM12 20c-1.306 0-2.417-.835-2.829-2h5.658c-.412 1.165-1.523 2-2.829 2zm-6.866-4l.847-6.698C6.364 6.272 8.941 4 11.996 4s5.627 2.268 6.013 5.295L18.864 16H5.134z"/>
          </svg>
          <span>Notifications</span>
        </button>
        <button className="mobile-nav-item" onClick={() => navigate('/messages')}>
          <svg className="mobile-nav-icon" viewBox="0 0 24 24">
            <path d="M1.998 5.5c0-1.381 1.119-2.5 2.5-2.5h15c1.381 0 2.5 1.119 2.5 2.5v13c0 1.381-1.119 2.5-2.5 2.5h-15c-1.381 0-2.5-1.119-2.5-2.5v-13zm2.5-.5c-.276 0-.5.224-.5.5v2.764l8 3.638 8-3.636V5.5c0-.276-.224-.5-.5-.5h-15zm15.5 5.463l-8 3.636-8-3.638V18.5c0 .276.224.5.5.5h15c.276 0 .5-.224.5-.5v-8.037z"/>
          </svg>
          <span>Messages</span>
        </button>
        <button 
          className="mobile-nav-item"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <img 
            key={`dashboard-mobile-avatar-${user?._id || user?.id}-${user?.photo || 'default'}-${Date.now()}`}
            src={user?.photo ? `${user.photo}${user.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User')} 
            alt="Profile" 
            className="mobile-nav-profile-pic"
            onError={(e) => {
              console.error('Dashboard mobile avatar failed to load:', user?.photo);
              e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User');
            }}
          />
          <span>Profile</span>
        </button>
      </div>

      {/* Comment Modal */}
      <CommentModal 
        isOpen={showCommentModal}
        onClose={handleCloseCommentModal}
        post={selectedPostForComment}
        onCommentPosted={handleCommentPosted}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedPostForShare(null);
        }}
        post={selectedPostForShare}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        onPostCreated={(newPost) => {
          setPosts([newPost, ...posts]);
          showNotification('Post created successfully!', 'success');
        }}
      />
    </div>
  );
};

export default Dashboard;

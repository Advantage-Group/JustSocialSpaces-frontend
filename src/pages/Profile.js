import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Profile.css';
import CommentModal from '../components/CommentModal';
import PostDetailModal from '../components/PostDetailModal';
import ShareModal from '../components/ShareModal';
import ImageEditor from '../components/ImageEditor';
import LikeButton from '../components/LikeButton';

const Profile = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const { userId } = useParams(); // For viewing other users' profiles
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editType, setEditType] = useState('avatar'); // 'avatar' or 'banner'
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [reactionLoadingPostId, setReactionLoadingPostId] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'likes' && !userId) {
      // Only fetch liked posts for own profile
      console.log('Likes tab activated, fetching liked posts...');
      fetchLikedPosts();
    }
  }, [activeTab, userId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // If userId param exists, we're viewing another user's profile
      // Otherwise, we're viewing our own profile
      if (userId) {
        // Fetch other user's profile with follow status
        const profileRes = await fetch(`http://localhost:5000/api/auth/user/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (profileRes.ok) {
          const userData = await profileRes.json();
          setProfileUser(userData);
          setIsFollowing(userData.isFollowing || false);
        } else {
          // Fallback to current user data if fetch fails
          setProfileUser(state.user);
          setIsFollowing(false);
        }
      } else {
        // Fetch current user profile
        const profileRes = await fetch('http://localhost:5000/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (profileRes.ok) {
          const userData = await profileRes.json();
          setProfileUser(userData);
          setIsFollowing(false); // Can't follow yourself
          
          // Update context
          dispatch({ type: 'SET_USER', payload: userData });
        }
      }

      // Fetch user's posts
      const userIdToFetch = userId || state.user?._id || state.user?.id;
      if (userIdToFetch) {
        const postsRes = await fetch(`http://localhost:5000/api/posts/user/${userIdToFetch}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (postsRes.ok) {
          const data = await postsRes.json();
          console.log('Fetched posts for profile:', data.posts?.length, 'posts');
          // Update posts with fresh author data from server
          setPosts(data.posts || []);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentUserId = state.user?._id || state.user?.id;
      
      if (!currentUserId) {
        console.log('No current user ID, cannot fetch liked posts');
        return;
      }
      
      console.log('Fetching liked posts for user:', currentUserId);
      
      const response = await fetch(`http://localhost:5000/api/posts/liked/${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched liked posts response:', data);
        console.log('Number of liked posts:', data.posts?.length || 0);
        setLikedPosts(data.posts || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error fetching liked posts:', response.status, errorData);
        setLikedPosts([]);
      }
    } catch (error) {
      console.error('Error fetching liked posts:', error);
      setLikedPosts([]);
    }
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile modal
    alert('Edit profile functionality coming soon!');
  };

  const handleFollow = async () => {
    if (!userId || !profileUser) return;
    
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/follow/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsFollowing(true);
        // Update followers count
        setProfileUser(prev => ({
          ...prev,
          followersCount: (prev.followersCount || 0) + 1
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to follow user');
      }
    } catch (error) {
      console.error('Error following user:', error);
      alert('Failed to follow user');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!userId || !profileUser) return;
    
    setFollowLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/auth/unfollow/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsFollowing(false);
        // Update followers count
        setProfileUser(prev => ({
          ...prev,
          followersCount: Math.max(0, (prev.followersCount || 0) - 1)
        }));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to unfollow user');
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
      alert('Failed to unfollow user');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleEditPhoto = (type) => {
    setEditType(type);
    // Trigger file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a JPG, PNG, or WEBP image.');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be smaller than 5MB.');
        return;
      }
      
      // Read the file and show in ImageEditor
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImageSrc(e.target.result);
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleImageSave = async (croppedImageBlob) => {
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('profilePhoto', croppedImageBlob, 'profile.jpg');
      
      const uploadRes = await fetch('http://localhost:5000/api/auth/upload-profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        console.log('Profile photo upload response:', data);
        console.log('Photo URL from server:', data.photoUrl);
        
        // Use the photoUrl directly from server
        const photoUrl = data.photoUrl;
        
        // Get current user ID (from state or params)
        const currentUserId = state.user?._id || state.user?.id;
        
        // Update local user data with full user object from response
        const updatedUser = data.user || { ...state.user, photo: photoUrl };
        dispatch({ type: 'SET_USER', payload: updatedUser });
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Force immediate UI update with full user object - merge with existing profileUser
        setProfileUser(prev => {
          const merged = {
            ...prev,
            ...updatedUser,
            photo: photoUrl,
            _lastUpdate: Date.now() // Force re-render
          };
          console.log('Updating profileUser state:', merged);
          return merged;
        });
        
        setShowImageEditor(false);
        setSelectedImageSrc(null);
        
        // Update posts in context to reflect new profile photo
        if (state.posts && state.posts.length > 0 && currentUserId) {
          const updatedPosts = state.posts.map(post => {
            if (post.author && (post.author._id === currentUserId || post.author.id === currentUserId)) {
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
          dispatch({ type: 'SET_POSTS', payload: updatedPosts });
        }
        
        // Update local posts state as well - this is critical for Profile page posts
        setPosts(prevPosts => {
          if (prevPosts && prevPosts.length > 0 && currentUserId) {
            const updated = prevPosts.map(post => {
              if (post.author && (post.author._id === currentUserId || post.author.id === currentUserId)) {
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
            console.log('Updated local posts with new profile photo:', updated.length, 'posts');
            return updated;
          }
          return prevPosts;
        });
        
        // Dispatch custom event to refresh posts in other components
        if (currentUserId) {
          window.dispatchEvent(new CustomEvent('profilePhotoUpdated', { 
            detail: { userId: currentUserId, photoUrl: photoUrl } 
          }));
        }
        
        // Refresh profile data to get latest from server (with delay to ensure DB is updated)
        // This will also refresh posts from server with updated author data
        setTimeout(() => {
          console.log('Refreshing profile data from server...');
          fetchProfileData();
        }, 1000);
        
        alert('Profile photo updated successfully!');
      } else {
        const error = await uploadRes.json();
        alert(error.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo');
    }
  };

  const handleLike = async (postId) => {
    setReactionLoadingPostId(postId);
    
    // Find the current post and create optimistic update
    const currentPost = posts.find(p => p._id === postId);
    if (!currentPost) return;
    
    const userId = state.user?._id || state.user?.id;
    const currentReactions = currentPost.reactions || [];
    
    // Optimistically add the reaction
    const optimisticReactions = [...currentReactions.filter(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      return rUserId !== userId?.toString();
    }), { emoji: '❤️', userId }];
    
    // Optimistically update the post in local state
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p._id === postId ? { ...p, reactions: optimisticReactions } : p
      )
    );
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji: '❤️' })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update with server response
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? { ...p, reactions: data.reactions } : p
          )
        );
        
        // If on likes tab, refresh liked posts to include the newly liked post
        if (activeTab === 'likes' && !userId) {
          fetchLikedPosts();
        }
      } else {
        // Revert on error
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? currentPost : p
          )
        );
      }
    } catch (e) {
      // Revert on error
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p._id === postId ? currentPost : p
        )
      );
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const handleUnlike = async (postId) => {
    setReactionLoadingPostId(postId);
    
    // Find the current post and create optimistic update
    const currentPost = posts.find(p => p._id === postId);
    if (!currentPost) return;
    
    const userId = state.user?._id || state.user?.id;
    const currentReactions = currentPost.reactions || [];
    
    // Optimistically remove the reaction
    const optimisticReactions = currentReactions.filter(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      return rUserId !== userId?.toString();
    });
    
    // Optimistically update the post in local state
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p._id === postId ? { ...p, reactions: optimisticReactions } : p
      )
    );
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update with server response
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? { ...p, reactions: data.reactions } : p
          )
        );
        
        // If on likes tab, remove from liked posts
        if (activeTab === 'likes' && !userId) {
          setLikedPosts(prevLikedPosts => 
            prevLikedPosts.filter(p => p._id !== postId)
          );
        }
      } else {
        // Revert on error
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? currentPost : p
          )
        );
      }
    } catch (e) {
      // Revert on error
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p._id === postId ? currentPost : p
        )
      );
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const handleCommentClick = (post) => {
    setSelectedPost(post);
    setShowCommentModal(true);
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setShowPostDetail(true);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatPostDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOwnProfile = !userId || userId === state.user?._id;

  if (loading) {
    return (
      <div className="profile-page loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <div className="profile-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/>
          </svg>
        </button>
        <div className="profile-header-info">
          <h2>{profileUser?.name || 'User'}</h2>
          <span className="posts-count">{posts.length} posts</span>
        </div>
        <button className="search-button">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/>
          </svg>
        </button>
      </div>

      {/* Banner */}
      <div className="profile-banner" onClick={() => isOwnProfile && handleEditPhoto('banner')}>
        {profileUser?.bannerPhoto ? (
          <img src={profileUser.bannerPhoto} alt="Banner" />
        ) : (
          <div className="banner-placeholder"></div>
        )}
      </div>

      {/* Profile Info */}
      <div className="profile-info-section">
        <div className="profile-avatar-container">
          <div className="profile-avatar" onClick={() => isOwnProfile && handleEditPhoto('avatar')}>
            <img 
              key={`profile-avatar-${profileUser?._id || profileUser?.id}-${profileUser?.photo || 'default'}-${profileUser?.photo ? profileUser.photo.split('?')[0] : ''}`}
              src={profileUser?.photo ? `${profileUser.photo}${profileUser.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.name || 'User')}&size=133`} 
              alt="Profile"
              onError={(e) => {
                console.error('Profile photo failed to load:', profileUser?.photo);
                console.error('Attempting to load from URL:', e.target.src);
                // Try to test the URL
                if (profileUser?.photo && profileUser.photo.includes('/api/posts/media/')) {
                  const testUrl = profileUser.photo.replace('/api/posts/media/', '/api/posts/media-test/').split('?')[0];
                  console.log('Test URL:', testUrl);
                  fetch(testUrl)
                    .then(res => res.json())
                    .then(data => console.log('MinIO test result:', data))
                    .catch(err => console.error('MinIO test error:', err));
                }
                // Fallback to default avatar if image fails to load
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser?.name || 'User')}&size=133`;
              }}
              onLoad={() => {
                console.log('Profile photo loaded successfully:', profileUser?.photo);
              }}
            />
            {isOwnProfile && (
              <div className="avatar-edit-overlay">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
            )}
          </div>
          {isOwnProfile ? (
            <button className="edit-profile-button" onClick={handleEditProfile}>
              Edit profile
            </button>
          ) : (
            <div className="profile-action-buttons">
              <button 
                className="more-options-button"
                onClick={() => {/* TODO: Show more options menu */}}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path fill="currentColor" d="M3 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 2c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm7 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                </svg>
              </button>
              {isFollowing ? (
                <button 
                  className="follow-button following"
                  onClick={handleUnfollow}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : 'Following'}
                </button>
              ) : (
                <button 
                  className="follow-button"
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? '...' : 'Follow'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="profile-details">
          <h1 className="profile-name">{profileUser?.name || 'User'}</h1>
          <span className="profile-handle">@{profileUser?.email?.split('@')[0] || 'user'}</span>
          
          {profileUser?.bio && (
            <p className="profile-bio">{profileUser.bio}</p>
          )}
          
          <div className="profile-meta">
            <div className="meta-item">
              <svg viewBox="0 0 24 24" width="18.75" height="18.75">
                <path fill="currentColor" d="M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm4-4h2v-2h-2v2z"/>
              </svg>
              <span>Joined {formatDate(profileUser?.createdAt)}</span>
            </div>
          </div>

          <div className="profile-stats">
            <a href="#" className="stat-link">
              <span className="stat-value">{profileUser?.followingCount || 0}</span>
              <span className="stat-label">Following</span>
            </a>
            <a href="#" className="stat-link">
              <span className="stat-value">{profileUser?.followersCount || 0}</span>
              <span className="stat-label">Followers</span>
            </a>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button 
          className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts
        </button>
        <button 
          className={`profile-tab ${activeTab === 'replies' ? 'active' : ''}`}
          onClick={() => setActiveTab('replies')}
        >
          Replies
        </button>
        <button 
          className={`profile-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Media
        </button>
        <button 
          className={`profile-tab ${activeTab === 'likes' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('likes');
            // Fetch liked posts when switching to likes tab
            if (!userId) {
              fetchLikedPosts();
            }
          }}
        >
          Likes
        </button>
      </div>

      {/* Posts Feed */}
      <div className="profile-feed">
        {(() => {
          // Filter posts based on active tab
          let filteredPosts = posts;
          if (activeTab === 'media') {
            filteredPosts = posts.filter(post => 
              (post.media && post.media.length > 0) || 
              (post.images && post.images.length > 0) || 
              post.gif
            );
          } else if (activeTab === 'replies') {
            // Filter for replies (posts that are replies to other posts)
            filteredPosts = posts.filter(post => post.parentPostId);
          } else if (activeTab === 'likes') {
            // Use liked posts if viewing own profile, otherwise show empty
            if (!userId) {
              filteredPosts = likedPosts;
            } else {
              // For other users' profiles, we can't see their likes
              filteredPosts = [];
            }
          }

          if (filteredPosts.length === 0) {
            if (activeTab === 'likes') {
              return (
                <div className="empty-feed">
                  <h3>No likes yet</h3>
                  <p>When you like posts, they will show up here.</p>
                </div>
              );
            }
            return (
              <div className="empty-feed">
                <h3>No {activeTab} yet</h3>
                <p>When you {activeTab === 'media' ? 'post images or GIFs' : activeTab === 'replies' ? 'reply to posts' : 'post something'}, they will show up here.</p>
              </div>
            );
          }

          // Special layout for Media tab
          if (activeTab === 'media') {
            // Collect all media items from all posts
            const allMediaItems = [];
            
            filteredPosts.forEach(post => {
              // Add GIF if exists
              if (post.gif) {
                allMediaItems.push({
                  postId: post._id,
                  type: 'gif',
                  url: typeof post.gif === 'string' ? post.gif : post.gif.url,
                  title: post.gif.title || 'GIF',
                  post: post
                });
              }
              
              // Add media items
              if (post.media && post.media.length > 0) {
                post.media.forEach(item => {
                  allMediaItems.push({
                    postId: post._id,
                    ...item,
                    post: post
                  });
                });
              }
              
              // Add images (fallback)
              if ((!post.media || post.media.length === 0) && post.images && post.images.length > 0) {
                post.images.forEach(img => {
                  allMediaItems.push({
                    postId: post._id,
                    type: 'image',
                    url: img,
                    post: post
                  });
                });
              }
            });
            
            return (
              <div className="media-grid-container">
                {allMediaItems.map((mediaItem, idx) => (
                  <div 
                    key={`${mediaItem.postId}-${idx}`} 
                    className="media-grid-item"
                    onClick={() => handlePostClick(mediaItem.post)}
                  >
                    {mediaItem.type === 'gif' ? (
                      <div className="media-item-wrapper">
                        <img 
                          src={mediaItem.url}
                          alt={mediaItem.title || 'GIF'}
                          className="media-grid-image"
                        />
                        <span className="gif-label">GIF</span>
                      </div>
                    ) : mediaItem.type === 'video' ? (
                      <div className="media-item-wrapper">
                        <video 
                          src={mediaItem.url}
                          className="media-grid-image"
                          muted
                        />
                      </div>
                    ) : (
                      <img 
                        src={mediaItem.url}
                        alt="Post media"
                        className="media-grid-image"
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          }

          // Regular post layout for other tabs
          return filteredPosts.map(post => (
            <div 
              key={post._id} 
              className="post-item"
              onClick={() => handlePostClick(post)}
              style={{ cursor: 'pointer' }}
            >
              <img 
                key={`post-avatar-${post._id}-${post.author?._id || post.author?.id}-${post.author?.photo || 'default'}`}
                src={post.author?.photo ? `${post.author.photo}${post.author.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}`} 
                alt={post.author?.name || 'User'}
                className="post-avatar"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/profile/${post.author?._id || post.author?.id}`);
                }}
                style={{ cursor: 'pointer' }}
                onError={(e) => {
                  console.error('Post avatar failed to load:', post.author?.photo);
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}`;
                }}
              />
              <div className="post-content-wrapper">
                <div className="post-header">
                  <span 
                    className="post-author-name"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.author._id || post.author.id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {post.author.name}
                  </span>
                  <span className="post-author-handle">@{post.author.email?.split('@')[0]}</span>
                  <span className="post-separator">·</span>
                  <span className="post-date">{formatPostDate(post.createdAt)}</span>
                </div>
                
                {post.content && post.content.trim() && (
                  <div className="post-text">
                    {post.content}
                  </div>
                )}

                {post.images && post.images.length > 0 && (
                  <div className={`post-images grid-${Math.min(post.images.length, 4)}`}>
                    {post.images.slice(0, 4).map((img, idx) => (
                      <img key={idx} src={img} alt="" />
                    ))}
                  </div>
                )}

                {post.gif && (
                  <div className="post-gif">
                    <img 
                      src={typeof post.gif === 'string' ? post.gif : post.gif.url} 
                      alt={post.gif.title || 'GIF'}
                      className="post-gif-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="post-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="action-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCommentClick(post);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                    </svg>
                    <span>{post.replies || 0}</span>
                  </button>
                  
                  <button 
                    className="action-button"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span>{post.retweets || 0}</span>
                  </button>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <LikeButton
                      post={post}
                      userId={state.user?._id || state.user?.id}
                      onLike={() => handleLike(post._id)}
                      onUnlike={() => handleUnlike(post._id)}
                      isLoading={reactionLoadingPostId === post._id}
                    />
                  </div>
                  
                  <button 
                    className="action-button"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/>
                    </svg>
                    <span>{post.views || 0}</span>
                  </button>
                  
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPostForShare(post);
                      setShowShareModal(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Modals */}
      {showCommentModal && selectedPost && (
        <CommentModal
          isOpen={showCommentModal}
          post={selectedPost}
          onClose={() => {
            setShowCommentModal(false);
            setSelectedPost(null);
          }}
          onCommentPosted={fetchProfileData}
        />
      )}

      {showPostDetail && selectedPost && (
        <PostDetailModal
          isOpen={showPostDetail}
          post={selectedPost}
          onClose={() => {
            setShowPostDetail(false);
            setSelectedPost(null);
          }}
          onUpdate={fetchProfileData}
        />
      )}

      {showImageEditor && selectedImageSrc && (
        <ImageEditor
          imageSrc={selectedImageSrc}
          onCancel={() => {
            setShowImageEditor(false);
            setSelectedImageSrc(null);
          }}
          onSave={handleImageSave}
          aspectRatio={editType === 'avatar' ? 1 : 3}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
          setSelectedPostForShare(null);
        }}
        post={selectedPostForShare}
      />

      {/* Hidden file input for photo selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default Profile;


import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ActionTypes } from '../context/AppContext';
import SpacesModal from '../components/SpacesModal';
import JitsiMeeting from '../components/JitsiMeeting';
import GifPicker from '../components/GifPicker';
import PollDisplay from '../components/PollDisplay';
import CommentModal from '../components/CommentModal';
import PostDetailModal from '../components/PostDetailModal';
import ShareModal from '../components/ShareModal';
import LikeButton from '../components/LikeButton';
import './Home.css';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';

const Home = () => {
  const navigate = useNavigate();
  const { state, dispatch, showNotification } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [newPost, setNewPost] = useState('');
  const [activeTab, setActiveTab] = useState('for-you');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState({ days: 1, hours: 0, minutes: 0 });
  const [showComposeEmojiPicker, setShowComposeEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSpacesModal, setShowSpacesModal] = useState(false);
  const [currentSpace, setCurrentSpace] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGif, setSelectedGif] = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState('');
  const [editRemoveKeys, setEditRemoveKeys] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editRemoveGif, setEditRemoveGif] = useState(false);
  const [editNewGif, setEditNewGif] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [showReactionPickerPostId, setShowReactionPickerPostId] = useState(null);
  const [reactionLoadingPostId, setReactionLoadingPostId] = useState(null);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);
  const [followingList, setFollowingList] = useState([]);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 600);

  useEffect(() => {
    fetchPosts();
    fetchFollowingList();
  }, []);

  // Update following list when user data changes
  useEffect(() => {
    if (state.user?.following) {
      setFollowingList(state.user.following.map(id => id.toString()));
    }
  }, [state.user?.following]);

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

  // Listen for profile photo updates and refresh posts
  useEffect(() => {
    const handleProfilePhotoUpdate = (event) => {
      const { userId, photoUrl } = event.detail;
      console.log('Home: Profile photo updated event received', { userId, photoUrl });

      // Update posts in state to reflect new profile photo
      if (state.posts && state.posts.length > 0) {
        const updatedPosts = state.posts.map(post => {
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
        console.log('Home: Updating posts with new profile photo', updatedPosts.length, 'posts');
        dispatch({ type: ActionTypes.SET_POSTS, payload: updatedPosts });
      }
      // Also refresh posts from server to get latest data
      setTimeout(() => {
        console.log('Home: Refreshing posts from server...');
        fetchPosts();
      }, 500);
    };

    window.addEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
    return () => {
      window.removeEventListener('profilePhotoUpdated', handleProfilePhotoUpdate);
    };
  }, [state.posts]);

  // Handle postId from URL query parameter (for navigation from notifications)
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (postId && !state.loading) {
      // First, check if post is already in the posts list
      const existingPost = state.posts.find(p => p._id === postId);
      if (existingPost) {
        setSelectedPostForDetail(existingPost);
        setShowPostDetailModal(true);
        // Clear the query parameter
        setSearchParams({});
      } else {
        // Fetch the post if it's not in the list
        fetchPostById(postId);
      }
    }
  }, [searchParams, state.posts, state.loading]);

  const fetchPostById = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const post = await response.json();
        // Format the post to match the expected structure
        const formattedPost = {
          ...post,
          // Ensure the post has the same structure as posts from the list
        };
        setSelectedPostForDetail(formattedPost);
        setShowPostDetailModal(true);
        // Clear the query parameter
        setSearchParams({});
      } else {
        showNotification('Post not found', 'error');
        setSearchParams({});
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      showNotification('Failed to load post', 'error');
      setSearchParams({});
    }
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (showComposeEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowComposeEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showComposeEmojiPicker]);

  // Track viewport size for responsive emoji picker placement
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for space open events from notifications
  useEffect(() => {
    const handleOpenSpace = async (event) => {
      if (event.detail) {
        // Fetch fresh space data from API to ensure correct jitsiRoomName
        const spaceId = event.detail.id || event.detail._id;
        if (spaceId) {
          try {
            const token = localStorage.getItem('token');
            console.log('🔄 Fetching fresh space data for spaceId:', spaceId);
            const response = await fetch(`http://localhost:5000/api/spaces/${spaceId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.ok) {
              const data = await response.json();
              console.log('✅ Fresh space data fetched:', {
                spaceId: data.space.id,
                jitsiRoomName: data.space.jitsiRoomName,
                jitsiDomain: data.space.jitsiDomain
              });
              setCurrentSpace(data.space);
            } else {
              console.warn('⚠️ Failed to fetch fresh space data, using provided data');
              setCurrentSpace(event.detail);
            }
          } catch (error) {
            console.error('❌ Error fetching fresh space data:', error);
            console.warn('⚠️ Using provided space data as fallback');
            setCurrentSpace(event.detail);
          }
        } else {
          setCurrentSpace(event.detail);
        }
        localStorage.removeItem('openSpace');
      }
    };

    // Check localStorage for space to open (from notification click)
    const openSpaceData = localStorage.getItem('openSpace');
    if (openSpaceData) {
      try {
        const spaceData = JSON.parse(openSpaceData);
        const spaceId = spaceData.id || spaceData._id;

        // Fetch fresh space data from API
        if (spaceId) {
          const token = localStorage.getItem('token');
          fetch(`http://localhost:5000/api/spaces/${spaceId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              throw new Error('Failed to fetch space');
            })
            .then(data => {
              console.log('✅ Fresh space data fetched from localStorage:', {
                spaceId: data.space.id,
                jitsiRoomName: data.space.jitsiRoomName,
                jitsiDomain: data.space.jitsiDomain
              });
              setCurrentSpace(data.space);
            })
            .catch(error => {
              console.error('❌ Error fetching fresh space data:', error);
              console.warn('⚠️ Using localStorage space data as fallback');
              setCurrentSpace(spaceData);
            });
        } else {
          setCurrentSpace(spaceData);
        }
        localStorage.removeItem('openSpace');
      } catch (error) {
        console.error('❌ Error parsing space data:', error);
      }
    }

    window.addEventListener('openSpace', handleOpenSpace);
    return () => window.removeEventListener('openSpace', handleOpenSpace);
  }, []);

  const fetchPosts = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-cache' // Prevent browser caching
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Home: Fetched posts from server:', data.posts?.length, 'posts');
        // Log first post author photo for debugging
        if (data.posts && data.posts.length > 0) {
          console.log('Home: First post author photo:', data.posts[0].author?.photo);
        }
        dispatch({ type: ActionTypes.SET_POSTS, payload: data.posts || [] });
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      showNotification('Failed to load posts', 'error');
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  const handleSpaceCreated = (spaceData) => {
    setCurrentSpace(spaceData);
  };

  const handleCloseSpace = () => {
    setCurrentSpace(null);
  };

  const handlePost = async () => {
    if ((!newPost.trim() && selectedMedia.length === 0 && !selectedGif) || isPosting) return;

    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');

      const formData = new FormData();
      formData.append('content', newPost.trim());

      // Add media files if any
      selectedMedia.forEach((media, index) => {
        formData.append('media', media);
      });

      // Add GIF if selected
      if (selectedGif) {
        formData.append('gif', JSON.stringify({
          url: selectedGif.images.original.url,
          title: selectedGif.title,
          id: selectedGif.id,
          source: 'giphy'
        }));
      }

      // Add poll if exists
      if (showPoll && pollOptions.some(option => option.trim())) {
        const totalMinutes = (pollDuration.days * 24 * 60) + (pollDuration.hours * 60) + pollDuration.minutes;
        formData.append('poll', JSON.stringify({
          question: newPost.trim() || 'Poll Question',
          choices: pollOptions.filter(option => option.trim()).map(option => ({ text: option.trim() })),
          duration: totalMinutes
        }));
        // Clear post content when creating a poll to avoid duplication
        formData.set('content', '');
      }

      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        dispatch({ type: ActionTypes.ADD_POST, payload: data.post });

        // Reset form
        setNewPost('');
        setSelectedMedia([]);
        setSelectedGif(null);
        setShowPoll(false);
        setPollOptions(['', '']);
        setPollDuration({ days: 1, hours: 0, minutes: 0 });
        setIsExpanded(false);

        showNotification('Your post was sent!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to create post', 'error');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      showNotification('Something went wrong. Please try again.', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files);
    const maxMedia = 4;

    if (selectedMedia.length + files.length > maxMedia) {
      showNotification(`You can only upload up to ${maxMedia} media files`, 'error');
      return;
    }

    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB for videos, 5MB for images
      const isValidSize = file.size <= maxSize;

      if (!isValidType) {
        showNotification('Please select only image or video files', 'error');
        return false;
      }

      if (!isValidSize) {
        const sizeLimit = file.type.startsWith('video/') ? '50MB' : '5MB';
        showNotification(`File size should be less than ${sizeLimit}`, 'error');
        return false;
      }

      return true;
    });

    setSelectedMedia(prev => [...prev, ...validFiles]);
    setIsExpanded(true);
  };

  const removeMedia = (index) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions(prev => [...prev, '']);
    }
  };

  const removePollOption = (index) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index, value) => {
    setPollOptions(prev => prev.map((option, i) => i === index ? value : option));
  };

  const togglePoll = () => {
    setShowPoll(!showPoll);
    if (!showPoll) {
      setIsExpanded(true);
    }
  };

  const toggleGifPicker = () => {
    setShowGifPicker(!showGifPicker);
    if (!showGifPicker) {
      setIsExpanded(true);
    }
  };

  const handleGifSelect = (gif) => {
    setSelectedGif(gif);
    setIsExpanded(true);
    if (editingPost) {
      setEditNewGif(gif);
      setEditRemoveGif(false);
    }
  };

  const removeGif = () => {
    setSelectedGif(null);
  };

  const getCharacterCount = () => {
    return newPost.length;
  };

  const getCharacterCountColor = () => {
    const count = getCharacterCount();
    if (count > 260) return '#f4245e'; // Red
    if (count > 240) return '#ffd400'; // Yellow
    return '#71767b'; // Gray
  };

  const handleEmojiSelect = (emoji) => {
    const native = emoji?.native || '';
    if (!native) return;
    setNewPost(prev => `${prev}${native}`);
    setIsExpanded(true);
  };

  const togglePostMenu = (postId) => {
    setOpenMenuPostId(prev => prev === postId ? null : postId);
  };

  const handleDeletePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        dispatch({ type: ActionTypes.REMOVE_POST, payload: postId });
        showNotification('Post deleted', 'success');
      } else {
        const err = await response.json().catch(() => ({}));
        showNotification(err.error || 'Failed to delete post', 'error');
      }
    } catch (e) {
      showNotification('Failed to delete post', 'error');
    } finally {
      setOpenMenuPostId(null);
    }
  };

  const startEditPost = (post) => {
    setEditingPost(post);
    setEditText(post.content || '');
    setEditRemoveKeys([]);
    setEditNewFiles([]);
    setEditRemoveGif(false);
    setEditNewGif(null);
    setOpenMenuPostId(null);
  };

  const submitEditPost = async () => {
    if (!editingPost) return;
    const content = editText.trim();
    if (content.length > 280) {
      showNotification('Post exceeds 280 characters', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('content', content);
      if (editRemoveKeys.length > 0) form.append('removeMediaKeys', JSON.stringify(editRemoveKeys));
      if (editRemoveGif) form.append('removeGif', 'true');
      editNewFiles.forEach(f => form.append('media', f));
      if (editNewGif) form.append('gif', JSON.stringify({ url: editNewGif.images.original.url, title: editNewGif.title, id: editNewGif.id, source: 'giphy' }));
      const response = await fetch(`http://localhost:5000/api/posts/${editingPost._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      if (response.ok) {
        const data = await response.json();
        dispatch({ type: ActionTypes.UPDATE_POST, payload: data.post });
        showNotification('Post updated', 'success');
        setEditingPost(null);
        setEditText('');
        setEditRemoveKeys([]);
        setEditNewFiles([]);
        setEditRemoveGif(false);
        setEditNewGif(null);
      } else {
        const err = await response.json().catch(() => ({}));
        showNotification(err.error || 'Failed to update post', 'error');
      }
    } catch (e) {
      showNotification('Failed to update post', 'error');
    }
  };

  const toggleRemoveMediaKey = (key) => {
    setEditRemoveKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const onEditFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    setEditNewFiles(prev => [...prev, ...files]);
    e.target.value = '';
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

  const canPost = () => {
    return (newPost.trim() || selectedMedia.length > 0 || selectedGif) && !isPosting && getCharacterCount() <= 280;
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
      await fetchPosts();
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
      await fetchPosts();
    } catch (e) {
      showNotification('Failed to remove reaction.', 'error');
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const handleLike = async (postId) => {
    setReactionLoadingPostId(postId);

    // Find the current post and create optimistic update
    const currentPost = state.posts.find(p => p._id === postId);
    if (!currentPost) return;

    const userId = state.user?._id || state.user?.id;
    const currentReactions = currentPost.reactions || [];

    // Optimistically add the reaction
    const optimisticReactions = [...currentReactions.filter(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      return rUserId !== userId?.toString();
    }), { emoji: '❤️', userId }];

    // Optimistically update the post in state
    dispatch({
      type: ActionTypes.UPDATE_POST,
      payload: { ...currentPost, reactions: optimisticReactions }
    });

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
        dispatch({
          type: ActionTypes.UPDATE_POST,
          payload: { ...currentPost, reactions: data.reactions }
        });
      } else {
        // Revert on error
        dispatch({
          type: ActionTypes.UPDATE_POST,
          payload: currentPost
        });
        showNotification('Failed to like post.', 'error');
      }
    } catch (e) {
      // Revert on error
      dispatch({
        type: ActionTypes.UPDATE_POST,
        payload: currentPost
      });
      showNotification('Failed to like post.', 'error');
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const handleUnlike = async (postId) => {
    setReactionLoadingPostId(postId);

    // Find the current post and create optimistic update
    const currentPost = state.posts.find(p => p._id === postId);
    if (!currentPost) return;

    const userId = state.user?._id || state.user?.id;
    const currentReactions = currentPost.reactions || [];

    // Optimistically remove the reaction
    const optimisticReactions = currentReactions.filter(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      return rUserId !== userId?.toString();
    });

    // Optimistically update the post in state
    dispatch({
      type: ActionTypes.UPDATE_POST,
      payload: { ...currentPost, reactions: optimisticReactions }
    });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Update with server response
        dispatch({
          type: ActionTypes.UPDATE_POST,
          payload: { ...currentPost, reactions: data.reactions }
        });
      } else {
        // Revert on error
        dispatch({
          type: ActionTypes.UPDATE_POST,
          payload: currentPost
        });
        showNotification('Failed to unlike post.', 'error');
      }
    } catch (e) {
      // Revert on error
      dispatch({
        type: ActionTypes.UPDATE_POST,
        payload: currentPost
      });
      showNotification('Failed to unlike post.', 'error');
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  if (state.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your feed...</p>
      </div>
    );
  }

  return (
    <div className="home-page">
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
      <div className={`compose-post ${isExpanded ? 'expanded' : ''}`}>
        <div className="compose-header">
          <img
            key={`compose-avatar-${state.user?._id || state.user?.id}-${state.user?.photo || 'default'}-${state.user?._lastUpdate || Date.now()}`}
            src={state.user?.photo ? `${state.user.photo}${state.user.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user?.name || 'User')}
            alt="Profile"
            className="compose-profile-pic"
            onClick={() => navigate(`/profile/${state.user?._id || state.user?.id}`)}
            style={{ cursor: 'pointer' }}
            onError={(e) => {
              console.error('Compose avatar failed to load:', state.user?.photo);
              e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user?.name || 'User');
            }}
          />
          <div className="compose-input-container">
            <div className="compose-input-wrapper">
              <textarea
                className="compose-input"
                placeholder={showPoll ? "Ask a Question" : "What is happening?!"}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                disabled={isPosting}
                maxLength={280}
                rows={1}
                style={{
                  height: isExpanded ? 'auto' : '24px',
                  minHeight: isExpanded ? '120px' : '24px'
                }}
              />
            </div>

            {/* Media Preview */}
            {selectedMedia.length > 0 && (
              <div className="image-preview-container">
                <div className={`image-grid ${selectedMedia.length === 1 ? 'single' : selectedMedia.length === 2 ? 'double' : 'multiple'}`}>
                  {selectedMedia.map((media, index) => (
                    <div key={index} className="image-preview">
                      {media.type.startsWith('video/') ? (
                        <video
                          src={URL.createObjectURL(media)}
                          className="preview-image"
                          controls
                          style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                        />
                      ) : (
                        <img
                          src={URL.createObjectURL(media)}
                          alt={`Upload ${index + 1}`}
                          className="preview-image"
                        />
                      )}
                      <button
                        className="remove-image-btn"
                        onClick={() => removeMedia(index)}
                        aria-label="Remove media"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GIF Preview */}
            {selectedGif && (
              <div className="gif-preview-container">
                <div className="gif-preview">
                  <img
                    src={selectedGif.images.original.url}
                    alt={selectedGif.title}
                    className="preview-gif"
                  />
                  <button
                    className="remove-gif-btn"
                    onClick={removeGif}
                    aria-label="Remove GIF"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Poll Creator */}
            {showPoll && (
              <div className="poll-creator">
                <div className="poll-header">
                  <span className="poll-title">Poll</span>
                  <button
                    className="remove-poll-btn"
                    onClick={() => setShowPoll(false)}
                    aria-label="Remove poll"
                  >
                    ×
                  </button>
                </div>

                <div className="poll-options-container">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="poll-option-wrapper">
                      <div className="poll-option">
                        <input
                          type="text"
                          placeholder={`Choice ${index + 1}`}
                          value={option}
                          onChange={(e) => updatePollOption(index, e.target.value)}
                          className="poll-input"
                          maxLength={25}
                        />
                        <div className="poll-option-actions">
                          <span className="poll-char-count">{option.length}/25</span>
                          {pollOptions.length > 2 && (
                            <button
                              className="remove-option-btn"
                              onClick={() => removePollOption(index)}
                              aria-label="Remove option"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {pollOptions.length < 4 && (
                    <button className="add-poll-option" onClick={addPollOption}>
                      <svg viewBox="0 0 24 24" className="add-icon">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                      </svg>
                      Add a choice
                    </button>
                  )}
                </div>

                <div className="poll-settings">
                  <div className="poll-duration-section">
                    <span className="poll-duration-label">Poll length</span>
                    <div className="poll-duration-controls">
                      <div className="duration-selector">
                        <select
                          value={pollDuration.days}
                          onChange={(e) => setPollDuration(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                          className="duration-dropdown"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7].map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                        <span className="duration-label">Days</span>
                      </div>

                      <div className="duration-selector">
                        <select
                          value={pollDuration.hours}
                          onChange={(e) => setPollDuration(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                          className="duration-dropdown"
                        >
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(hour => (
                            <option key={hour} value={hour}>{hour}</option>
                          ))}
                        </select>
                        <span className="duration-label">Hours</span>
                      </div>

                      <div className="duration-selector">
                        <select
                          value={pollDuration.minutes}
                          onChange={(e) => setPollDuration(prev => ({ ...prev, minutes: parseInt(e.target.value) }))}
                          className="duration-dropdown"
                        >
                          {[0, 15, 30, 45].map(minute => (
                            <option key={minute} value={minute}>{minute}</option>
                          ))}
                        </select>
                        <span className="duration-label">Minutes</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="poll-actions">
                  <button
                    className="remove-poll-button"
                    onClick={() => setShowPoll(false)}
                  >
                    Remove poll
                  </button>
                </div>
              </div>
            )}

            <div className="compose-actions">
              <div className="compose-icons" style={{ position: 'relative' }}>
                <label className="compose-icon" title="Media">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                    style={{ display: 'none' }}
                    disabled={selectedMedia.length >= 4 || showPoll}
                  />
                  <svg viewBox="0 0 24 24">
                    <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z" />
                  </svg>
                </label>

                <button
                  className="compose-icon"
                  onClick={toggleGifPicker}
                  disabled={selectedMedia.length > 0 || showPoll}
                  title="GIF"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13zM18 10.711V9.25h-3.74v5.5h1.44v-1.719h1.7V11.57h-1.7v-.859H18zM11.79 9.25h1.44v5.5h-1.44v-5.5zm-3.07 1.375c.34 0 .77.172 1.02.43l1.03-.86c-.51-.601-1.28-.945-2.05-.945C7.19 9.25 6 10.453 6 12s1.19 2.75 2.72 2.75c.77 0 1.54-.344 2.05-.945l-1.03-.86c-.25.258-.68.43-1.02.43-.76 0-1.29-.546-1.29-1.375S8.03 10.625 8.79 10.625z" />
                  </svg>
                </button>

                <button
                  className="compose-icon"
                  title="Emoji"
                  onClick={() => setShowComposeEmojiPicker(prev => !prev)}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 18c-2.137 0-3.998-1.157-4.9-2.889-.126-.242.06-.535.332-.535h9.136c.272 0 .458.293.332.535C15.998 16.843 14.137 18 12 18z" />
                  </svg>
                </button>
                {showComposeEmojiPicker && (
                  <div
                    className="emoji-picker-popover"
                    ref={emojiPickerRef}
                    style={{
                      position: isMobile ? 'fixed' : 'absolute',
                      top: isMobile ? 'auto' : 40,
                      bottom: isMobile ? 72 : 'auto',
                      left: isMobile ? '50%' : 0,
                      transform: isMobile ? 'translateX(-50%)' : 'none',
                      zIndex: 2000,
                      background: '#23272c',
                      padding: '10px 4px 6px 4px',
                      borderRadius: 16,
                      border: '1.5px solid #444',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
                      minWidth: isMobile ? 'min(94vw, 360px)' : 340,
                      maxWidth: isMobile ? 'min(96vw, 420px)' : 420,
                      width: 'auto',
                      minHeight: isMobile ? '50vh' : 300,
                      maxHeight: isMobile ? '70vh' : 420,
                      overflow: 'auto',
                      transition: 'all 0.18s cubic-bezier(.39,1.65,.53,1)'
                    }}
                  >
                    <Picker
                      data={emojiData}
                      theme="dark"
                      onEmojiSelect={handleEmojiSelect}
                      previewPosition="bottom"
                      searchPosition="top"
                      navPosition="top"
                      emojiVersion="15.1"
                      perLine={8}
                    />
                  </div>
                )}

                <button
                  className={`compose-icon ${showPoll ? 'active' : ''}`}
                  onClick={togglePoll}
                  disabled={selectedMedia.length > 0 || selectedGif}
                  title="Poll"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M6 5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0-2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                  </svg>
                </button>

                <button
                  className="compose-icon spaces-btn"
                  onClick={() => setShowSpacesModal(true)}
                  title="Start a Space"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </button>
              </div>

              <div className="compose-right">
                {isExpanded && (
                  <div className="audience-selector">
                    <button className="audience-btn" title="Everyone can reply">
                      <svg viewBox="0 0 24 24" className="audience-icon">
                        <path d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zM12 20.25c-4.56 0-8.25-3.69-8.25-8.25S7.44 3.75 12 3.75s8.25 3.69 8.25 8.25-3.69 8.25-8.25 8.25zM8.5 12c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5S8.5 13.93 8.5 12z" />
                      </svg>
                      <span className="audience-text">Everyone can reply</span>
                    </button>
                  </div>
                )}

                <div className="post-controls">
                  {isExpanded && getCharacterCount() > 0 && (
                    <div className="character-count-container">
                      <svg className="character-progress" viewBox="0 0 20 20">
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="none"
                          stroke="#2f3336"
                          strokeWidth="2"
                        />
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          fill="none"
                          stroke={getCharacterCountColor()}
                          strokeWidth="2"
                          strokeDasharray={`${(getCharacterCount() / 280) * 50.27} 50.27`}
                          strokeDashoffset="12.57"
                          transform="rotate(-90 10 10)"
                        />
                      </svg>
                      {getCharacterCount() > 260 && (
                        <span className="character-count" style={{ color: getCharacterCountColor() }}>
                          {280 - getCharacterCount()}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    className={`compose-post-btn ${canPost() ? 'active' : ''}`}
                    onClick={handlePost}
                    disabled={!canPost()}
                  >
                    {isPosting ? (
                      <>
                        <div className="posting-spinner"></div>
                        Posting
                      </>
                    ) : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="posts-feed">
        {(() => {
          // Filter posts based on active tab
          let filteredPosts = state.posts;
          const currentUserId = state.user?._id?.toString() || state.user?.id?.toString();

          if (activeTab === 'following') {
            // Only show posts from users you follow, plus your own posts
            filteredPosts = state.posts.filter(post => {
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
                    <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10H6v10H4zm9.248 0v-7h2v7h-2z" />
                  </svg>
                  <h3>No posts yet</h3>
                  <p>When people you follow post, their posts will show up here.</p>
                </div>
              );
            }
            return (
              <div className="no-posts">
                <svg className="no-posts-icon" viewBox="0 0 24 24">
                  <path d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10H6v10H4zm9.248 0v-7h2v7h-2z" />
                </svg>
                <h3>Welcome to X!</h3>
                <p>This is the best place to see what's happening in your world. Find some people and topics to follow now.</p>
              </div>
            );
          }

          return filteredPosts.map((post) => {
            const isOwnPost = (post.author?.email && state.user?.email && post.author.email === state.user.email) ||
              (post.author?._id && state.user?._id && post.author._id === state.user._id);
            return (
              <article
                key={post._id}
                className="post-card"
                onClick={() => {
                  setSelectedPostForDetail(post);
                  setShowPostDetailModal(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="post-header">
                  <img
                    key={`post-avatar-${post._id}-${post.author?._id || post.author?.id}-${post.author?.photo || 'default'}`}
                    src={post.author?.photo ? `${post.author.photo}${post.author.photo.includes('?') ? '&' : '?'}t=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.author?.name || 'User')}
                    alt="Profile"
                    className="post-profile-pic"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.author?._id || post.author?.id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      console.error('Post avatar failed to load:', post.author?.photo, 'for post:', post._id);
                      e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.author?.name || 'User');
                    }}
                    onLoad={() => {
                      console.log('Post avatar loaded successfully:', post.author?.photo, 'for post:', post._id);
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
                  {isOwnPost && (
                    <div className="post-more">
                      <button
                        className="post-more-btn"
                        aria-label="More"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePostMenu(post._id);
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <circle cx="5" cy="12" r="2"></circle>
                          <circle cx="12" cy="12" r="2"></circle>
                          <circle cx="19" cy="12" r="2"></circle>
                        </svg>
                      </button>
                      {openMenuPostId === post._id && (
                        <div className="post-menu" role="menu" onClick={(e) => e.stopPropagation()}>
                          <button className="post-menu-item" onClick={(e) => {
                            e.stopPropagation();
                            startEditPost(post);
                          }}>Edit</button>
                          <button className="post-menu-item danger" onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post._id);
                          }}>Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Show 'Replying to' if this post is a reply */}
                {post.parentAuthor && (
                  <div className="replying-to-label">
                    Replying to<span className="replying-to-email"> {post.parentAuthor.email}</span>
                  </div>
                )}
                {/* Only show post content if there's no poll */}
                {!post.poll && <div className="post-content">{post.content}</div>}

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

                {/* Post GIF */}
                {post.gif && (
                  <div className="post-gif">
                    <img
                      src={post.gif.url}
                      alt={post.gif.title || 'GIF'}
                      className="post-gif-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Post Poll */}
                {post.poll && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <PollDisplay
                      poll={post.poll}
                      currentUserId={state.user?._id}
                      onVote={async (pollId, choiceIndex) => {
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
                            // Refresh posts to show updated poll results
                            fetchPosts();
                            showNotification('Vote recorded!', 'success');
                          } else {
                            const errorData = await response.json();
                            showNotification(errorData.error || 'Failed to vote', 'error');
                          }
                        } catch (error) {
                          console.error('Error voting:', error);
                          showNotification('Failed to vote', 'error');
                        }
                      }}
                    />
                  </div>
                )}

                {/* Emoji Reactions Bar */}
                {/* REMOVED: The reaction bar and smiley icon trigger */}

                <div className="post-actions">
                  <button
                    className="post-action"
                    aria-label="Reply"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCommentModal(post);
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z" />
                    </svg>
                    <span>{post.replies || 0}</span>
                  </button>
                  <button
                    className="post-action"
                    aria-label="Repost"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z" />
                    </svg>
                    <span>0</span>
                  </button>
                  <LikeButton
                    post={post}
                    userId={state.user?._id || state.user?.id}
                    onLike={() => handleLike(post._id)}
                    onUnlike={() => handleUnlike(post._id)}
                    isLoading={reactionLoadingPostId === post._id}
                  />
                  <button
                    className="post-action"
                    aria-label="Share"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPostForShare(post);
                      setShowShareModal(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z" />
                    </svg>
                  </button>
                </div>
              </article>
            );
          });
        })()}
      </div>

      {/* Spaces Modal */}
      <SpacesModal
        isOpen={showSpacesModal}
        onClose={() => setShowSpacesModal(false)}
        onSpaceCreated={handleSpaceCreated}
      />

      {/* Jitsi Meeting */}
      {currentSpace && (
        <JitsiMeeting
          spaceData={currentSpace}
          onClose={handleCloseSpace}
        />
      )}

      {/* GIF Picker Modal */}
      <GifPicker
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleGifSelect}
      />

      {/* Edit Modal */}
      {editingPost && (
        <div className="edit-modal-overlay" onClick={() => setEditingPost(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <div className="edit-modal-title">Edit post</div>
              <button className="post-more-btn" onClick={() => setEditingPost(null)}>×</button>
            </div>
            <div className="edit-modal-body">
              <textarea className="edit-input" value={editText} onChange={(e) => setEditText(e.target.value)} maxLength={280} />

              {/* Existing media with remove toggles */}
              {(editingPost.media && editingPost.media.length > 0) && (
                <div className="edit-media-section">
                  <div className="edit-media-grid">
                    {editingPost.media.map((m, idx) => (
                      <div key={idx} className="edit-media-item">
                        {m.type === 'video' ? (
                          <video src={m.url} muted />
                        ) : (
                          <img src={m.url} alt="media" />
                        )}
                        <button className="edit-remove-btn" onClick={() => toggleRemoveMediaKey(m.key)}>
                          {editRemoveKeys.includes(m.key) ? 'Undo' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new files */}
              <div className="edit-controls">
                <label className="btn btn-secondary edit-file-input">
                  Add image/video
                  <input type="file" accept="image/*,video/*" multiple onChange={onEditFilesSelected} style={{ display: 'none' }} />
                </label>
                {editNewFiles.length > 0 && <span style={{ color: '#71767b' }}>{editNewFiles.length} new file(s) selected</span>}
              </div>

              {/* GIF controls */}
              <div className="edit-gif-row">
                <div style={{ color: '#e7e9ea', fontWeight: 600 }}>GIF</div>
                <div>
                  {(!editRemoveGif && editingPost.gif) && (
                    <>
                      <img src={editingPost.gif.url} alt="gif" className="edit-gif-thumb" />
                      <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setEditRemoveGif(true)}>Remove GIF</button>
                    </>
                  )}
                  {!editingPost.gif && !editNewGif && (
                    <button className="btn btn-secondary" onClick={() => setShowGifPicker(true)}>Add GIF</button>
                  )}
                  {editNewGif && (
                    <>
                      <img src={editNewGif.images.original.url} alt="gif" className="edit-gif-thumb" />
                      <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setEditNewGif(null)}>Clear</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="edit-modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingPost(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitEditPost} disabled={editText.trim().length === 0 && editRemoveKeys.length === 0 && editNewFiles.length === 0 && !editRemoveGif && !editNewGif}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      <CommentModal
        isOpen={showCommentModal}
        onClose={handleCloseCommentModal}
        post={selectedPostForComment}
        onCommentPosted={handleCommentPosted}
      />

      {/* Post Detail Modal */}
      <PostDetailModal
        isOpen={showPostDetailModal}
        onClose={() => {
          setShowPostDetailModal(false);
          setSelectedPostForDetail(null);
        }}
        post={selectedPostForDetail ? state.posts.find(p => p._id === selectedPostForDetail._id) || selectedPostForDetail : null}
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
    </div>
  );
};

export default Home;

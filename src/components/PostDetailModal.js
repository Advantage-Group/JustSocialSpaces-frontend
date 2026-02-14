import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, ActionTypes } from '../context/AppContext';
import GifPicker from './GifPicker';
import ShareModal from './ShareModal';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import './PostDetailModal.css';

const PostDetailModal = ({ isOpen, onClose, post }) => {
  const navigate = useNavigate();
  const { state, dispatch, showNotification } = useApp();
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedGif, setSelectedGif] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);
  const repliesRef = useRef(null);

  // Format time ago
  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    // Format full date
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format timestamp
  const formatTimestamp = (dateString) => {
    const postDate = new Date(dateString);
    const timeStr = postDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateStr = postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${timeStr} · ${dateStr}`;
  };

  // Format view count
  const formatViewCount = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Fetch replies
  useEffect(() => {
    if (isOpen && post?._id) {
      fetchReplies();
    }
  }, [isOpen, post?._id]);

  const fetchReplies = async () => {
    if (!post?._id) return;
    setLoadingReplies(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${post._id}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Handle reply submission
  const handleReply = async () => {
    if ((!replyText.trim() && selectedMedia.length === 0 && !selectedGif) || isPostingReply || !post?._id) return;

    setIsPostingReply(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', replyText.trim());
      formData.append('parentPostId', post._id);
      
      selectedMedia.forEach((media) => {
        formData.append('media', media);
      });
      
      if (selectedGif) {
        formData.append('gif', JSON.stringify({
          url: selectedGif.images.original.url,
          title: selectedGif.title,
          id: selectedGif.id,
          source: 'giphy'
        }));
      }

      const response = await fetch('http://localhost:5000/api/posts/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(prev => [data.comment, ...prev]);
        setReplyText('');
        setSelectedMedia([]);
        setSelectedGif(null);
        showNotification('Reply posted!', 'success');
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to post reply', 'error');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      showNotification('Something went wrong. Please try again.', 'error');
    } finally {
      setIsPostingReply(false);
    }
  };

  // Handle media upload
  const handleMediaUpload = (event) => {
    const files = Array.from(event.target.files);
    const maxMedia = 4;
    const remainingSlots = maxMedia - selectedMedia.length;
    const filesToAdd = files.slice(0, remainingSlots);
    setSelectedMedia(prev => [...prev, ...filesToAdd]);
    event.target.value = '';
  };

  const removeMedia = (index) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Handle like
  const handleLike = async () => {
    if (!post?._id) return;
    
    const userId = state.user?._id || state.user?.id;
    const currentReactions = post.reactions || [];
    
    // Check if user already liked
    const isLiked = currentReactions.some(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      const heartEmojis = ['❤️', '❤', '💕', '💖', '💗', '💓', '💝', '🧡'];
      return rUserId === userId?.toString() && heartEmojis.includes(r.emoji);
    });
    
    if (isLiked) {
      // Unlike
      const optimisticReactions = currentReactions.filter(r => {
        const rUserId = r.userId?._id || r.userId?.toString();
        return rUserId !== userId?.toString();
      });
      
      dispatch({ 
        type: ActionTypes.UPDATE_POST, 
        payload: { ...post, reactions: optimisticReactions } 
      });
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/posts/${post._id}/react`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          dispatch({ 
            type: ActionTypes.UPDATE_POST, 
            payload: { ...post, reactions: data.reactions } 
          });
        } else {
          dispatch({ 
            type: ActionTypes.UPDATE_POST, 
            payload: post 
          });
          showNotification('Failed to unlike post.', 'error');
        }
      } catch (e) {
        dispatch({ 
          type: ActionTypes.UPDATE_POST, 
          payload: post 
        });
        showNotification('Failed to unlike post.', 'error');
      }
    } else {
      // Like
      const optimisticReactions = [...currentReactions.filter(r => {
        const rUserId = r.userId?._id || r.userId?.toString();
        return rUserId !== userId?.toString();
      }), { emoji: '❤️', userId }];
      
      dispatch({ 
        type: ActionTypes.UPDATE_POST, 
        payload: { ...post, reactions: optimisticReactions } 
      });
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/posts/${post._id}/react`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ emoji: '❤️' })
        });
        
        if (response.ok) {
          const data = await response.json();
          dispatch({ 
            type: ActionTypes.UPDATE_POST, 
            payload: { ...post, reactions: data.reactions } 
          });
        } else {
          dispatch({ 
            type: ActionTypes.UPDATE_POST, 
            payload: post 
          });
          showNotification('Failed to like post.', 'error');
        }
      } catch (e) {
        dispatch({ 
          type: ActionTypes.UPDATE_POST, 
          payload: post 
        });
        showNotification('Failed to like post.', 'error');
      }
    }
  };

  // Handle retweet
  const handleRetweet = async () => {
    showNotification('Retweet functionality coming soon', 'info');
  };

  // Handle bookmark
  const handleBookmark = async () => {
    showNotification('Bookmark functionality coming soon', 'info');
  };

  // Handle share - open ShareModal
  const handleShare = () => {
    setShowShareModal(true);
  };

  // Close modal on outside click
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  // Close emoji picker on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showEmojiPicker]);

  // Highlight hashtags and mentions
  const formatPostText = (text) => {
    if (!text) return '';
    const parts = [];
    const regex = /(#\w+|@\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.index), type: 'text' });
      }
      parts.push({ 
        text: match[0], 
        type: match[0].startsWith('#') ? 'hashtag' : 'mention' 
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), type: 'text' });
    }

    return parts;
  };

  if (!isOpen || !post) return null;

  const textParts = formatPostText(post.content || '');

  return (
    <div className="post-detail-modal-overlay" onClick={onClose}>
      <div className="post-detail-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header with back and forward arrows */}
        <div className="post-detail-modal-header">
          <button
            onClick={onClose}
            className="post-detail-modal-nav-btn"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z"/>
            </svg>
          </button>
          <div className="post-detail-modal-header-center">
            {post.author?.name || 'Post'}
          </div>
          <button
            className="post-detail-modal-nav-btn"
            aria-label="Forward"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '20px', height: '20px' }}>
              <path d="M16.586 11l-5.043-5.04 1.414-1.42L20.414 12l-7.457 7.46-1.414-1.42L16.586 13H3v-2h13.586z"/>
            </svg>
          </button>
        </div>

        {/* Main content area */}
        <div className="post-detail-modal-content">
          {/* Main post section */}
          <div className="post-detail-modal-main">
            <div className="post-detail-modal-main-inner">
              {/* Main Post Card */}
              <article className="post-detail-main-post">
                {/* User Info */}
                <div className="post-detail-user-info">
                  <img
                    src={post.author?.photo ? `${post.author.photo}${post.author.photo.includes('?') ? '&' : '?'}v=${post.author?._id || post.author?.id || 'default'}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}`}
                    alt={post.author?.name || 'User'}
                    className="post-detail-user-avatar"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (post.author?._id || post.author?.id) {
                        navigate(`/profile/${post.author._id || post.author.id}`);
                        onClose();
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                    key={`${post._id}-${post.author?._id || post.author?.id}-${post.author?.photo || 'default'}`}
                    loading="eager"
                    onLoad={() => {
                      console.log('Post detail avatar loaded successfully:', post.author?.photo);
                    }}
                    onError={(e) => {
                      console.error('Post detail avatar failed to load:', post.author?.photo);
                      console.error('Attempted URL:', e.target.src);
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}`;
                    }}
                  />
                  <div className="post-detail-user-details">
                    <div className="post-detail-user-name-row">
                      <span 
                        className="post-detail-user-name"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (post.author?._id || post.author?.id) {
                            navigate(`/profile/${post.author._id || post.author.id}`);
                            onClose();
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {post.author?.name || 'User'}
                      </span>
                      {true && (
                        <svg viewBox="0 0 24 24" className="post-detail-verified-badge" fill="currentColor">
                          <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                        </svg>
                      )}
                      <span className="post-detail-user-handle">@{post.author?.email?.split('@')[0] || 'user'}</span>
                    </div>
                  </div>
                </div>

                {/* Post Text */}
                {post.content && (
                  <div className="post-detail-post-text">
                    {textParts.map((part, index) => {
                      if (part.type === 'hashtag') {
                        return (
                          <span key={index} className="hashtag">
                            {part.text}
                          </span>
                        );
                      } else if (part.type === 'mention') {
                        return (
                          <span key={index} className="mention">
                            {part.text}
                          </span>
                        );
                      }
                      return <span key={index}>{part.text}</span>;
                    })}
                  </div>
                )}

                {/* Post Media */}
                {(post.media?.length > 0 || post.images?.length > 0 || post.gif) && (
                  <div className="post-detail-post-media">
                    {post.gif ? (
                      <img
                        src={post.gif.url}
                        alt={post.gif.title || 'GIF'}
                      />
                    ) : post.media?.length > 0 ? (
                      post.media[0].type === 'video' ? (
                        <video
                          src={post.media[0].url}
                          controls
                        />
                      ) : (
                        <img
                          src={post.media[0].url}
                          alt="Post media"
                        />
                      )
                    ) : post.images?.[0] ? (
                      <img
                        src={post.images[0]}
                        alt="Post image"
                      />
                    ) : null}
                  </div>
                )}

                {/* Timestamp and Views */}
                <div className="post-detail-timestamp">
                  <span>{formatTimestamp(post.createdAt)}</span>
                  <span style={{ marginLeft: '16px' }}>{formatViewCount(post.views || 0)} Views</span>
                </div>

                {/* Interaction Buttons */}
                <div className="post-detail-interactions">
                  <button
                    onClick={() => {
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    className="post-detail-interaction-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                    </svg>
                    <span className="post-detail-interaction-count">
                      {post.replies ? (post.replies >= 1000 ? `${(post.replies / 1000).toFixed(1)}K` : post.replies) : 0}
                    </span>
                  </button>

                  <button
                    onClick={handleRetweet}
                    className="post-detail-interaction-btn retweet"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span className="post-detail-interaction-count">
                      {post.retweets ? (post.retweets >= 1000 ? `${(post.retweets / 1000).toFixed(1)}K` : post.retweets) : 0}
                    </span>
                  </button>

                  <button
                    onClick={handleLike}
                    className="post-detail-interaction-btn like"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
                    </svg>
                    <span className="post-detail-interaction-count">
                      {(() => {
                        const heartEmojis = ['❤️', '❤', '💕', '💖', '💗', '💓', '💝', '🧡'];
                        const likeCount = post?.reactions?.filter(r => heartEmojis.includes(r.emoji)).length || 0;
                        return likeCount >= 1000 ? `${(likeCount / 1000).toFixed(1)}K` : likeCount;
                      })()}
                    </span>
                  </button>

                  <button
                    onClick={handleBookmark}
                    className="post-detail-interaction-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 4.5C4 3.12 5.119 2 6.5 2h11C18.881 2 20 3.12 20 4.5v18.44l-8-5.71-8 5.71V4.5z"/>
                    </svg>
                    <span className="post-detail-interaction-count">643</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="post-detail-modal-nav-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
                    </svg>
                  </button>
                </div>
              </article>

              {/* Post your reply section */}
              <div style={{ padding: '16px', borderBottom: '1px solid #2f3336' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Post your reply</h3>
                <div className="post-detail-reply-section">
                  <img
                    src={state.user?.photo ? `${state.user.photo}${state.user.photo.includes('?') ? '&' : '?'}v=${state.user?._id || state.user?.id || 'default'}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user?.name || 'User')}`}
                    alt="Your profile"
                    className="post-detail-reply-avatar"
                    key={`reply-input-${state.user?._id || state.user?.id}-${state.user?.photo || 'default'}`}
                    loading="eager"
                    onError={(e) => {
                      console.error('Reply input avatar failed to load:', state.user?.photo);
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(state.user?.name || 'User')}`;
                    }}
                  />
                  <div className="post-detail-reply-input-wrapper">
                    <textarea
                      ref={textareaRef}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Post your reply"
                      className="post-detail-reply-textarea"
                      rows="3"
                      maxLength={280}
                    />
                    
                    {/* Media Preview */}
                    {selectedMedia.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        {selectedMedia.map((media, index) => (
                          <div key={index} className="post-detail-reply-media-preview">
                            {media.type.startsWith('video/') ? (
                              <video src={URL.createObjectURL(media)} controls style={{ maxWidth: '100%', width: '100%', borderRadius: '8px' }} />
                            ) : (
                              <img src={URL.createObjectURL(media)} alt={`Preview ${index + 1}`} style={{ maxWidth: '100%', width: '100%', borderRadius: '8px' }} />
                            )}
                            <button
                              onClick={() => removeMedia(index)}
                              className="post-detail-reply-remove-media"
                            >
                              <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* GIF Preview */}
                    {selectedGif && (
                      <div className="post-detail-reply-media-preview" style={{ marginBottom: '12px' }}>
                        <img src={selectedGif.images.original.url} alt={selectedGif.title} style={{ maxWidth: '100%', width: '100%', borderRadius: '8px' }} />
                        <button
                          onClick={() => setSelectedGif(null)}
                          className="post-detail-reply-remove-media"
                        >
                          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px' }} fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      </div>
                    )}

                    <div className="post-detail-reply-actions">
                      <div className="post-detail-reply-toolbar">
                        <label className="post-detail-reply-icon-btn" style={{ cursor: 'pointer' }}>
                          <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} style={{ display: 'none' }} />
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.75 2H4.25C3.01 2 2 3.01 2 4.25v15.5C2 20.99 3.01 22 4.25 22h15.5c1.24 0 2.25-1.01 2.25-2.25V4.25C22 3.01 20.99 2 19.75 2zM4.25 3.5h15.5c.413 0 .75.337.75.75v9.676l-3.858-3.858c-.14-.14-.33-.22-.53-.22h-.003c-.2 0-.393.08-.532.224l-4.317 5.53-1.205-1.207c-.14-.14-.33-.22-.53-.22s-.39.08-.53.22L3.5 17.642V4.25c0-.413.337-.75.75-.75zm-.744 16.28l5.418-5.534 6.282 6.254H4.25c-.402 0-.727-.322-.744-.72zm16.244 0h-2.42l-5.007-4.987 3.792-3.85 4.385 4.384v3.703c0 .413-.337.75-.75.75z"/>
                          </svg>
                        </label>
                        <button
                          onClick={() => setShowGifPicker(!showGifPicker)}
                          className="post-detail-reply-icon-btn"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="post-detail-reply-icon-btn"
                          ref={emojiPickerRef}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 18c-2.137 0-3.998-1.157-4.9-2.889-.126-.242.06-.535.332-.535h9.136c.272 0 .458.293.332.535C15.998 16.843 14.137 18 12 18z"/>
                          </svg>
                          {showEmojiPicker && (
                            <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: '8px', zIndex: 50 }}>
                              <Picker
                                data={emojiData}
                                theme="dark"
                                onEmojiSelect={(emoji) => {
                                  setReplyText(prev => prev + (emoji.native || ''));
                                  setShowEmojiPicker(false);
                                }}
                                previewPosition="none"
                              />
                            </div>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={handleReply}
                        disabled={(!replyText.trim() && selectedMedia.length === 0 && !selectedGif) || isPostingReply}
                        className="post-detail-reply-submit"
                      >
                        {isPostingReply ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Replies Thread */}
              <div style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>Replies</h3>
                {loadingReplies ? (
                  <div className="post-detail-loading">Loading replies...</div>
                ) : replies.length === 0 ? (
                  <div className="post-detail-empty">No replies yet</div>
                ) : (
                  <div ref={repliesRef}>
                    {replies.map((reply) => {
                      const replyTextParts = formatPostText(reply.content || '');
                      return (
                        <div key={reply._id} className="post-detail-reply-item">
                          <div className="post-detail-reply-header">
                            <img
                              src={reply.author?.photo ? `${reply.author.photo}${reply.author.photo.includes('?') ? '&' : '?'}v=${reply.author?._id || reply.author?.id || 'default'}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.author?.name || 'User')}`}
                              alt={reply.author?.name || 'User'}
                              className="post-detail-reply-avatar-small"
                              key={`reply-${reply._id}-${reply.author?._id || reply.author?.id}-${reply.author?.photo || 'default'}`}
                              loading="lazy"
                              onError={(e) => {
                                console.error('Reply avatar failed to load:', reply.author?.photo);
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.author?.name || 'User')}`;
                              }}
                            />
                            <div className="post-detail-reply-content">
                              <div className="post-detail-reply-meta">
                                <span className="post-detail-reply-author-name">{reply.author?.name || 'User'}</span>
                                <span className="post-detail-reply-author-handle">@{reply.author?.email?.split('@')[0] || 'user'}</span>
                                <span className="post-detail-reply-time">· {formatTimeAgo(reply.createdAt)}</span>
                              </div>
                              {reply.content && (
                                <div className="post-detail-reply-text">
                                  {replyTextParts.map((part, index) => {
                                    if (part.type === 'hashtag' || part.type === 'mention') {
                                      return (
                                        <span key={index} className={part.type}>
                                          {part.text}
                                        </span>
                                      );
                                    }
                                    return <span key={index}>{part.text}</span>;
                                  })}
                                </div>
                              )}
                              {(reply.media?.length > 0 || reply.gif) && (
                                <div className="post-detail-reply-media">
                                  {reply.gif ? (
                                    <img
                                      src={reply.gif.url}
                                      alt={reply.gif.title || 'GIF'}
                                    />
                                  ) : reply.media?.[0] ? (
                                    reply.media[0].type === 'video' ? (
                                      <video src={reply.media[0].url} controls />
                                    ) : (
                                      <img
                                        src={reply.media[0].url}
                                        alt="Reply media"
                                      />
                                    )
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* GIF Picker Modal */}
      {showGifPicker && (
        <GifPicker
          isOpen={showGifPicker}
          onClose={() => setShowGifPicker(false)}
          onSelectGif={(gif) => {
            setSelectedGif(gif);
            setShowGifPicker(false);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={post}
      />
    </div>
  );
};

export default PostDetailModal;

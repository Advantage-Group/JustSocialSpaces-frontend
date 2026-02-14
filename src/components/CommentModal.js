import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import GifPicker from './GifPicker';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import './CommentModal.css';

const CommentModal = ({ isOpen, onClose, post, onCommentPosted }) => {
  const navigate = useNavigate();
  const { state, showNotification } = useApp();
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedGif, setSelectedGif] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showEmojiPicker]);

  const handleComment = async () => {
    if ((!commentText.trim() && selectedMedia.length === 0 && !selectedGif) || isPosting) return;

    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('content', commentText.trim());
      formData.append('parentPostId', post._id);
      
      // Add media files if any
      selectedMedia.forEach((media) => {
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

      const response = await fetch('http://localhost:5000/api/posts/comments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Reply posted!', 'success');
        
        // Reset form
        setCommentText('');
        setSelectedMedia([]);
        setSelectedGif(null);
        
        // Call callback to refresh posts
        if (onCommentPosted) {
          onCommentPosted(data.comment);
        }
        
        // Close modal
        onClose();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to post reply', 'error');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
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
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
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
  };

  const removeMedia = (index) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleGifSelect = (gif) => {
    setSelectedGif(gif);
    setShowGifPicker(false);
  };

  const removeGif = () => {
    setSelectedGif(null);
  };

  const handleEmojiSelect = (emoji) => {
    const native = emoji?.native || '';
    if (!native) return;
    setCommentText(prev => `${prev}${native}`);
    setShowEmojiPicker(false);
  };

  const getCharacterCount = () => {
    return commentText.length;
  };

  const getCharacterCountColor = () => {
    const count = getCharacterCount();
    if (count > 260) return '#f4245e';
    if (count > 240) return '#ffd400';
    return '#71767b';
  };

  const canPost = () => {
    return (commentText.trim() || selectedMedia.length > 0 || selectedGif) && !isPosting && getCharacterCount() <= 280;
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

  if (!isOpen) return null;

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="comment-modal-header">
          <button className="comment-modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </button>
        </div>

        {/* Original Post Context */}
        <div className="comment-original-post">
          <div className="comment-post-header">
            <img 
              src={post.author?.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.author?.name || 'User')} 
              alt="Profile" 
              className="comment-post-profile-pic"
              onClick={(e) => {
                e.stopPropagation();
                if (post.author?._id || post.author?.id) {
                  navigate(`/profile/${post.author._id || post.author.id}`);
                  onClose();
                }
              }}
              style={{ cursor: 'pointer' }}
              key={`comment-${post._id}-${post.author?._id || post.author?.id}-${post.author?.photo || 'default'}`}
            />
            <div className="comment-post-user-info">
              <span 
                className="comment-post-user-name"
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
              <span className="comment-post-user-handle"> @{post.author?.email?.split('@')[0] || 'user'}</span>
              <span className="comment-post-timestamp"> · {formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>
          
          <div className="comment-post-content">{post.content}</div>
          
          {/* Original Post Media */}
          {((post.images && post.images.length > 0) || (post.media && post.media.length > 0)) && (
            <div className="comment-post-images">
              <div className={`comment-post-image-grid ${(post.media?.length || post.images?.length || 0) === 1 ? 'single' : (post.media?.length || post.images?.length || 0) === 2 ? 'double' : 'multiple'}`}>
                {post.media && post.media.map((mediaItem, index) => (
                  <div key={index} className="comment-post-image-container">
                    {mediaItem.type === 'video' ? (
                      <video 
                        src={mediaItem.url}
                        className="comment-post-image"
                        controls
                      />
                    ) : (
                      <img 
                        src={mediaItem.url}
                        alt={`Post media ${index + 1}`}
                        className="comment-post-image"
                      />
                    )}
                  </div>
                ))}
                {(!post.media || post.media.length === 0) && post.images && post.images.map((image, index) => (
                  <div key={index} className="comment-post-image-container">
                    <img 
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="comment-post-image"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Original Post GIF */}
          {post.gif && (
            <div className="comment-post-gif">
              <img 
                src={post.gif.url}
                alt={post.gif.title || 'GIF'}
                className="comment-post-gif-image"
              />
            </div>
          )}

          {/* Reply Context */}
          <div className="comment-reply-context">
            Replying to <span className="comment-reply-handle">@{post.author?.email?.split('@')[0] || 'user'}</span>
          </div>
        </div>

        {/* Comment Input Area */}
        <div className="comment-input-area">
          <img 
            src={state.user?.photo || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(state.user?.name || 'User')} 
            alt="Profile" 
            className="comment-user-profile-pic" 
          />
          <div className="comment-input-container">
            <textarea
              ref={textareaRef}
              className="comment-input"
              placeholder="Post your reply"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={isPosting}
              maxLength={280}
              rows={3}
            />
            
            {/* Media Preview */}
            {selectedMedia.length > 0 && (
              <div className="comment-media-preview">
                <div className={`comment-media-grid ${selectedMedia.length === 1 ? 'single' : selectedMedia.length === 2 ? 'double' : 'multiple'}`}>
                  {selectedMedia.map((media, index) => (
                    <div key={index} className="comment-media-item">
                      {media.type.startsWith('video/') ? (
                        <video 
                          src={URL.createObjectURL(media)} 
                          className="comment-preview-media"
                          controls
                        />
                      ) : (
                        <img 
                          src={URL.createObjectURL(media)} 
                          alt={`Upload ${index + 1}`}
                          className="comment-preview-media"
                        />
                      )}
                      <button 
                        className="comment-remove-media-btn"
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
              <div className="comment-gif-preview">
                <div className="comment-gif-item">
                  <img 
                    src={selectedGif.images.original.url} 
                    alt={selectedGif.title}
                    className="comment-preview-gif"
                  />
                  <button 
                    className="comment-remove-gif-btn"
                    onClick={removeGif}
                    aria-label="Remove GIF"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="comment-actions">
          <div className="comment-action-icons">
            <label className="comment-action-icon" title="Media">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
                style={{ display: 'none' }}
                disabled={selectedMedia.length >= 4}
              />
              <svg viewBox="0 0 24 24">
                <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"/>
              </svg>
            </label>
            
            <button 
              className="comment-action-icon" 
              onClick={() => setShowGifPicker(true)}
              disabled={selectedMedia.length > 0}
              title="GIF"
            >
              <svg viewBox="0 0 24 24">
                <path d="M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13zM18 10.711V9.25h-3.74v5.5h1.44v-1.719h1.7V11.57h-1.7v-.859H18zM11.79 9.25h1.44v5.5h-1.44v-5.5zm-3.07 1.375c.34 0 .77.172 1.02.43l1.03-.86c-.51-.601-1.28-.945-2.05-.945C7.19 9.25 6 10.453 6 12s1.19 2.75 2.72 2.75c.77 0 1.54-.344 2.05-.945l-1.03-.86c-.25.258-.68.43-1.02.43-.76 0-1.29-.546-1.29-1.375S8.03 10.625 8.79 10.625z"/>
              </svg>
            </button>
            
            <button 
              className="comment-action-icon" 
              title="Emoji"
              onClick={() => setShowEmojiPicker(prev => !prev)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 18c-2.137 0-3.998-1.157-4.9-2.889-.126-.242.06-.535.332-.535h9.136c.272 0 .458.293.332.535C15.998 16.843 14.137 18 12 18z"/>
              </svg>
            </button>
            
            <button className="comment-action-icon" disabled title="Schedule">
              <svg viewBox="0 0 24 24">
                <path d="M6.5 1c0-.276.224-.5.5-.5s.5.224.5.5v1h9V1c0-.276.224-.5.5-.5s.5.224.5.5v1H19c1.105 0 2 .895 2 2v16c0 1.105-.895 2-2 2H5c-1.105 0-2-.895-2-2V4c0-1.105.895-2 2-2h1.5V1zM19 3H5c-.552 0-1 .448-1 1v3h16V4c0-.552-.448-1-1-1zM4 8v12c0 .552.448 1 1 1h14c.552 0 1-.448 1-1V8H4z"/>
              </svg>
            </button>
            
            <button className="comment-action-icon" disabled title="Location">
              <svg viewBox="0 0 24 24">
                <path d="M12 7c-1.93 0-3.5 1.57-3.5 3.5S10.07 14 12 14s3.5-1.57 3.5-3.5S13.93 7 12 7zm0 5c-1.38 0-2.5-1.12-2.5-2.5S10.62 8 12 8s2.5 1.12 2.5 2.5S13.38 12 12 12zM12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 18.88c-2.54-2.76-6-7.17-6-11.88 0-3.31 2.69-6 6-6s6 2.69 6 6c0 4.71-3.46 9.12-6 11.88z"/>
              </svg>
            </button>
          </div>
          
          <div className="comment-post-controls">
            {getCharacterCount() > 0 && (
              <div className="comment-character-count-container">
                <svg className="comment-character-progress" viewBox="0 0 20 20">
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
                  <span className="comment-character-count" style={{ color: getCharacterCountColor() }}>
                    {280 - getCharacterCount()}
                  </span>
                )}
              </div>
            )}
            
            <button 
              className={`comment-reply-btn ${canPost() ? 'active' : ''}`}
              onClick={handleComment}
              disabled={!canPost()}
            >
              {isPosting ? (
                <>
                  <div className="comment-posting-spinner"></div>
                  Replying
                </>
              ) : 'Reply'}
            </button>
          </div>
        </div>
      </div>

      {/* GIF Picker Modal */}
      <GifPicker 
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleGifSelect}
      />

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-popover" ref={emojiPickerRef}>
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
    </div>
  );
};

export default CommentModal;

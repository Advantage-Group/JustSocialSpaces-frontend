import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import GifPicker from './GifPicker';
import PollCreator from './PollCreator';
import Picker from '@emoji-mart/react';
import emojiData from '@emoji-mart/data';
import './ComposeModal.css';

const ComposeModal = ({ isOpen, onClose, onPostCreated }) => {
  const navigate = useNavigate();
  const { showNotification } = useApp();
  const [user, setUser] = useState(null);
  const [postText, setPostText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [selectedGif, setSelectedGif] = useState(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollData, setPollData] = useState(null);
  const emojiPickerRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

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

  const handlePost = async () => {
    if ((!postText.trim() && selectedMedia.length === 0 && !selectedGif && !pollData) || isPosting) return;

    setIsPosting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('content', postText.trim());
      
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
      
      // Add poll if exists
      if (pollData) {
        const pollDataWithQuestion = {
          question: postText.trim() || 'Poll Question',
          ...pollData
        };
        formData.append('poll', JSON.stringify(pollDataWithQuestion));
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
        
        // Reset form
        setPostText('');
        setSelectedMedia([]);
        setSelectedGif(null);
        setPollData(null);
        setShowPollCreator(false);
        
        // Call callback
        if (onPostCreated) {
          onPostCreated(data.post);
        }
        
        // Close modal
        onClose();
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
    setPostText(prev => `${prev}${native}`);
  };

  const handlePollCreate = (poll) => {
    setPollData(poll);
    setShowPollCreator(false);
  };

  const handlePollCancel = () => {
    setPollData(null);
    setShowPollCreator(false);
  };

  const getCharacterCount = () => {
    return postText.length;
  };

  const getCharacterCountColor = () => {
    const count = getCharacterCount();
    if (count > 260) return '#f4245e';
    if (count > 240) return '#ffd400';
    return '#71767b';
  };

  const canPost = () => {
    return (postText.trim() || selectedMedia.length > 0 || selectedGif || pollData) && !isPosting && getCharacterCount() <= 280;
  };

  if (!isOpen) return null;

  return (
    <div className="compose-modal-overlay" onClick={onClose}>
      <div className="compose-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="compose-modal-header">
          <button 
            className="compose-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M10.59 12L4.54 5.96l1.42-1.42L12 10.59l6.04-6.05 1.42 1.42L13.41 12l6.05 6.04-1.42 1.42L12 13.41l-6.04 6.05-1.42-1.42L10.59 12z"/>
            </svg>
          </button>
          <button className="compose-modal-drafts" disabled>
            Drafts
          </button>
        </div>

        {/* Compose Area */}
        <div className="compose-modal-body">
          <div className="compose-modal-content">
            <img 
              src={user?.photo ? `${user.photo}${user.photo.includes('?') ? '&' : '?'}v=${Date.now()}` : 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User')} 
              alt="Profile" 
              className="compose-modal-profile-pic"
              onError={(e) => {
                e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'User');
              }}
            />
            <div className="compose-modal-input-container">
              <textarea
                ref={textareaRef}
                className="compose-modal-input"
                placeholder="What's happening?"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                disabled={isPosting}
                maxLength={280}
                rows={4}
              />
              
              {/* Media Preview */}
              {selectedMedia.length > 0 && (
                <div className="compose-modal-media-preview">
                  <div className={`compose-modal-media-grid ${selectedMedia.length === 1 ? 'single' : selectedMedia.length === 2 ? 'double' : 'multiple'}`}>
                    {selectedMedia.map((media, index) => (
                      <div key={index} className="compose-modal-media-item">
                        {media.type.startsWith('video/') ? (
                          <video 
                            src={URL.createObjectURL(media)} 
                            className="compose-modal-preview-media"
                            controls
                          />
                        ) : (
                          <img 
                            src={URL.createObjectURL(media)} 
                            alt={`Upload ${index + 1}`}
                            className="compose-modal-preview-media"
                          />
                        )}
                        <button 
                          className="compose-modal-remove-media"
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
                <div className="compose-modal-gif-preview">
                  <div className="compose-modal-gif-item">
                    <img 
                      src={selectedGif.images.original.url} 
                      alt={selectedGif.title}
                      className="compose-modal-preview-gif"
                    />
                    <button 
                      className="compose-modal-remove-gif"
                      onClick={removeGif}
                      aria-label="Remove GIF"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Poll Creator */}
              {showPollCreator && (
                <div className="compose-modal-poll-creator">
                  <PollCreator
                    onPollCreate={handlePollCreate}
                    onCancel={handlePollCancel}
                  />
                </div>
              )}

              {/* Audience Selector */}
              <div className="compose-modal-audience">
                <button className="compose-modal-audience-btn">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75zM12 20.25c-4.56 0-8.25-3.69-8.25-8.25S7.44 3.75 12 3.75s8.25 3.69 8.25 8.25-3.69 8.25-8.25 8.25zM8.5 12c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5-3.5-1.57-3.5-3.5z"/>
                  </svg>
                  <span>Everyone can reply</span>
                </button>
              </div>

              {/* Action Icons */}
              <div className="compose-modal-actions">
                <div className="compose-modal-icons" style={{ position: 'relative' }}>
                  <label className="compose-modal-icon" title="Media">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaUpload}
                      style={{ display: 'none' }}
                      disabled={selectedMedia.length >= 4 || showPollCreator || selectedGif}
                    />
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z"/>
                    </svg>
                  </label>
                  
                  <button 
                    className="compose-modal-icon" 
                    onClick={() => setShowGifPicker(true)}
                    disabled={selectedMedia.length > 0 || showPollCreator}
                    title="GIF"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M3 5.5C3 4.119 4.12 3 5.5 3h13C19.88 3 21 4.119 21 5.5v13c0 1.381-1.12 2.5-2.5 2.5h-13C4.12 21 3 19.881 3 18.5v-13zM5.5 5c-.28 0-.5.224-.5.5v13c0 .276.22.5.5.5h13c.28 0 .5-.224.5-.5v-13c0-.276-.22-.5-.5-.5h-13zM18 10.711V9.25h-3.74v5.5h1.44v-1.719h1.7V11.57h-1.7v-.859H18zM11.79 9.25h1.44v5.5h-1.44v-5.5zm-3.07 1.375c.34 0 .77.172 1.02.43l1.03-.86c-.51-.601-1.28-.945-2.05-.945C7.19 9.25 6 10.453 6 12s1.19 2.75 2.72 2.75c.77 0 1.54-.344 2.05-.945l-1.03-.86c-.25.258-.68.43-1.02.43-.76 0-1.29-.546-1.29-1.375S8.03 10.625 8.79 10.625z"/>
                    </svg>
                  </button>
                  
                  <button 
                    className="compose-modal-icon" 
                    title="Poll"
                    onClick={() => setShowPollCreator(!showPollCreator)}
                    disabled={selectedMedia.length > 0 || selectedGif}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M6 5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-8c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0-2c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-6 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm6-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                    </svg>
                  </button>
                  
                  <button 
                    className="compose-modal-icon" 
                    title="Emoji"
                    onClick={() => setShowEmojiPicker(prev => !prev)}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-3 7a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm6 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 18c-2.137 0-3.998-1.157-4.9-2.889-.126-.242.06-.535.332-.535h9.136c.272 0 .458.293.332.535C15.998 16.843 14.137 18 12 18z"/>
                    </svg>
                  </button>
                  {showEmojiPicker && (
                    <div 
                      className="compose-modal-emoji-picker"
                      ref={emojiPickerRef}
                    >
                      <Picker 
                        data={emojiData} 
                        theme="dark" 
                        onEmojiSelect={handleEmojiSelect}
                        previewPosition="none"
                        perLine={8}
                      />
                    </div>
                  )}
                </div>
                
                <div className="compose-modal-post-controls">
                  {getCharacterCount() > 0 && (
                    <div className="compose-modal-character-count-container">
                      <svg className="compose-modal-character-progress" viewBox="0 0 20 20">
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
                        <span className="compose-modal-character-count" style={{ color: getCharacterCountColor() }}>
                          {280 - getCharacterCount()}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <button 
                    className={`compose-modal-post-btn ${canPost() ? 'active' : ''}`}
                    onClick={handlePost}
                    disabled={!canPost()}
                  >
                    {isPosting ? (
                      <>
                        <div className="compose-modal-posting-spinner"></div>
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

      {/* GIF Picker Modal */}
      <GifPicker 
        isOpen={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onSelectGif={handleGifSelect}
      />
    </div>
  );
};

export default ComposeModal;


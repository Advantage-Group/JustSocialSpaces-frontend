import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import './SpacesModal.css';

const SpacesModal = ({ isOpen, onClose, onSpaceCreated }) => {
  const { state, showNotification } = useApp();
  const [title, setTitle] = useState('');
  const [whoCanSpeak, setWhoCanSpeak] = useState('invited');
  const [recordSpace, setRecordSpace] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateSpace = async () => {
    if (isCreating) return;

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token || !state.user) {
      showNotification('Please login to create spaces', 'error');
      return;
    }

    // Verify user is registered
    try {
      const verifyRes = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!verifyRes.ok) {
        showNotification('Please register to create spaces', 'error');
        return;
      }
    } catch (error) {
      showNotification('Failed to verify user. Please try again.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('http://localhost:5000/api/spaces/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim() || 'Untitled Space',
          whoCanSpeak,
          recordSpace
        })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification('Space created successfully!', 'success');
        console.log('Space created:', data.space);
        
        // Reset form
        setTitle('');
        setWhoCanSpeak('invited');
        setRecordSpace(false);
        
        // Close modal and trigger Jitsi meeting
        onClose();
        if (onSpaceCreated) {
          onSpaceCreated(data.space);
        }
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to create space', 'error');
      }
    } catch (error) {
      console.error('Error creating space:', error);
      showNotification('Something went wrong. Please try again.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="spaces-modal-overlay" onClick={onClose}>
      <div className="spaces-modal" onClick={(e) => e.stopPropagation()}>
        <div className="spaces-modal-header">
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24">
              <path d="M18.36 6.64c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L12 10.18 7.05 5.23c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.18 12l-4.95 4.95c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.82l4.95 4.95c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.82 12l4.95-4.95z"/>
            </svg>
          </button>
        </div>

        <div className="spaces-modal-content">
          <div className="spaces-icon">
            <svg viewBox="0 0 24 24" className="spaces-logo">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>

          <h2 className="spaces-title">Create your Space</h2>

          <div className="spaces-form">
            <div className="form-group">
              <label className="form-label">Who can speak?</label>
              <div className="dropdown-container">
                <select 
                  value={whoCanSpeak} 
                  onChange={(e) => setWhoCanSpeak(e.target.value)}
                  className="spaces-dropdown"
                >
                  <option value="invited">Only people you invite to speak</option>
                  <option value="followers">People you follow</option>
                  <option value="everyone">Everyone</option>
                </select>
                <svg className="dropdown-arrow" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </div>
            </div>

            <div className="form-group">
              <input
                type="text"
                placeholder="What do you want to talk about?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="spaces-input"
                maxLength={100}
              />
            </div>

            <div className="form-group record-toggle">
              <div className="toggle-info">
                <span className="toggle-label">Record Space</span>
                <svg className="info-icon" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={recordSpace}
                  onChange={(e) => setRecordSpace(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="spaces-actions">
            <button 
              className="start-space-btn"
              onClick={handleCreateSpace}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="creating-spinner"></div>
                  Creating...
                </>
              ) : (
                'Start now'
              )}
            </button>

            <button className="schedule-btn" disabled>
              <svg viewBox="0 0 24 24">
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
              </svg>
            </button>
          </div>

          <div className="spaces-footer">
            <button className="learn-more-btn">
              Get to know Spaces
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpacesModal;
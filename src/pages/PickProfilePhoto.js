import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ImageEditor from '../components/ImageEditor';
import { useApp } from '../context/AppContext';
import { ActionTypes } from '../context/AppContext';
import '../login.css';

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function PickProfilePhoto() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, dispatch, showNotification } = useApp();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(state.user?.photo || null);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const returnTo = location.state?.returnTo || '/dashboard';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleSkip = () => {
    navigate(returnTo);
  };

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showNotification('Please choose a JPG, PNG, or WEBP image.', 'error');
      return false;
    }
    if (file.size > MAX_SIZE_BYTES) {
      showNotification('Image must be smaller than 5MB.', 'error');
      return false;
    }
    return true;
  };

  const preparePreview = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setShowEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFiles = (file) => {
    if (file && validateFile(file)) {
      setSelectedFile(file);
      preparePreview(file);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    handleFiles(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFiles(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleSaveEditedImage = (editedBlob) => {
    setSelectedFile(editedBlob);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(editedBlob);
    setShowEditor(false);
  };

  const handleCancelEdit = () => {
    setShowEditor(false);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreview(state.user?.photo || null);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      handleSkip();
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      const fallbackName = selectedFile.name || 'avatar.jpg';
      formData.append('profilePhoto', selectedFile, fallbackName);

      const response = await fetch('http://localhost:5000/api/auth/upload-profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload profile photo');
      }

      const data = await response.json();
      console.log('Profile photo upload response:', data);
      console.log('Photo URL from server:', data.photoUrl);
      
      // Use the photoUrl directly from server
      const photoUrl = data.photoUrl;
      const updatedUser = { ...state.user, photo: photoUrl };
      dispatch({ type: ActionTypes.SET_USER, payload: updatedUser });
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Dispatch custom event to refresh posts in other components
      const userId = state.user?._id || state.user?.id;
      if (userId) {
        window.dispatchEvent(new CustomEvent('profilePhotoUpdated', { 
          detail: { userId, photoUrl: photoUrl } 
        }));
      }
      
      showNotification('Profile photo updated', 'success');
      navigate(returnTo);
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(error.message || 'Failed to upload photo', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (showEditor && preview) {
    return (
      <ImageEditor
        imageSrc={preview}
        onSave={handleSaveEditedImage}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <div className="login-overlay">
      <div className="login-modal" style={{ maxHeight: '620px', minHeight: '520px' }}>
        <div className="login-logo">X</div>
        <h2 className="login-title" style={{ textAlign: 'left', marginBottom: '8px' }}>
          Pick a profile picture
        </h2>
        <p style={{ 
          color: '#71767b', 
          fontSize: '16px', 
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          Upload, crop, and reposition your new look—just like on Twitter.
        </p>

        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '2px solid #333',
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            margin: '0 auto'
          }}>
            {preview ? (
              <img 
                src={preview} 
                alt="Profile preview" 
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#333',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                color: '#71767b'
              }}>
                👤
              </div>
            )}
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: `2px dashed ${dragActive ? '#1d9bf0' : '#333'}`,
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(29, 155, 240, 0.1)' : '#111',
              transition: 'background-color 0.2s, border-color 0.2s'
            }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="profile-photo-input"
            />
            <label 
              htmlFor="profile-photo-input"
              style={{
                color: '#1da1f2',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Upload photo
            </label>
            <p style={{ color: '#71767b', fontSize: '14px', marginTop: '8px' }}>
              or drag & drop (JPG, PNG, WEBP — up to 5 MB)
            </p>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: '12px',
          marginBottom: '12px'
        }}>
          <button
            className="login-btn secondary"
            onClick={handleRemovePhoto}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Clear selection
          </button>
          <button
            className="login-btn"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            style={{ flex: 1 }}
          >
            {loading ? 'Saving...' : 'Apply'}
          </button>
        </div>

        <button
          className="login-btn forgot"
          onClick={handleSkip}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'Please wait...' : 'Maybe later'}
        </button>
      </div>
    </div>
  );
}

export default PickProfilePhoto;
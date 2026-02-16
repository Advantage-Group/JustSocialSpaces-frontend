import React, { useState, useEffect } from 'react';
import './EditProfileModal.css';

const EditProfileModal = ({ isOpen, onClose, user, onSave }) => {
    const [name, setName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setBio(user.bio || '');
            setLocation(user.location || '');
        }
    }, [user, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name,
                    bio,
                    location
                })
            });

            if (response.ok) {
                const data = await response.json();
                onSave(data.user);
                onClose();
            } else {
                const error = await response.json();
                alert(error.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="edit-profile-modal-overlay">
            <div className="edit-profile-modal">
                <div className="edit-profile-header">
                    <div className="header-left">
                        <button className="close-button" onClick={onClose}>×</button>
                        <h2>Edit Profile</h2>
                    </div>
                    <button
                        className="save-button"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>

                <div className="edit-profile-form">
                    {/* Banner and Avatar placeholders could go here if we want to merge functionality, but for now specific inputs */}

                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name"
                            maxLength={50}
                        />
                        <div className="char-count">{name.length} / 50</div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="bio">Bio</label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Bio"
                            maxLength={160}
                        />
                        <div className="char-count">{bio.length} / 160</div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="location">Location</label>
                        <input
                            type="text"
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Location"
                            maxLength={30}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;

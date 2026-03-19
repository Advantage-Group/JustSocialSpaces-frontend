import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const userParam = searchParams.get('user');
    
    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', userData.token);
        
        // Check if user has a profile photo (not a placeholder)
        const hasProfilePhoto = userData.photo && 
          !userData.photo.includes('ui-avatars.com');
        
        // Only redirect to photo picker if user doesn't have a photo
        if (hasProfilePhoto) {
          navigate('/dashboard');
        } else {
          navigate('/pick-profile-photo');
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login?error=auth_failed');
      }
    } else {
      // No user data, redirect to login
      navigate('/login?error=no_user_data');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#000',
      color: '#fff',
      fontSize: '18px'
    }}>
      Completing sign in...
    </div>
  );
};

export default AuthCallback; 
import React from 'react';
import './GoogleLoginButton.css'; // Assuming you have a CSS file for the button

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    try {
      // Redirect to the backend Google authentication route
      // This will redirect to Google's OAuth consent screen
      window.location.href = 'http://localhost:5000/auth/google';
    } catch (error) {
      console.error('Google login error:', error);
      // You could show a user-friendly error message here
    }
  };

  return (
    <button className="google-login-button" onClick={handleGoogleLogin}>
      <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton; 
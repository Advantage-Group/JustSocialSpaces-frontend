import React from 'react';
import './AppleLoginButton.css';

const AppleLoginButton = () => {
  const handleAppleLogin = () => {
    window.location.href = 'http://localhost:5000/auth/apple';
  };

  return (
    <button className="apple-login-button" onClick={handleAppleLogin}>
      <span className="apple-icon" />
      Sign in with Apple
    </button>
  );
};

export default AppleLoginButton;

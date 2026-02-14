import React, { useState } from "react";
import "./Signup.css";
import GoogleLoginButton from '../components/GoogleLoginButton';
import AppleLoginButton from '../components/AppleLoginButton';
import SignupForm from '../components/SignupForm/SignupForm';

const Signup = () => {
  const [activeScreen, setActiveScreen] = useState('main');

  const handleGoogleSignup = () => {
    setActiveScreen('google');
  };
  const handleAppleSignup = () => {
    setActiveScreen('apple');
  };
  const handleXSignup = () => {
    setActiveScreen('create');
  };
  const handleBack = () => {
    setActiveScreen('main');
  };

  return (
    <div className="signup-bg">
      {activeScreen === 'create' ? (
        <SignupForm onClose={handleBack} />
      ) : (
      <div className="signup-modal">
          {activeScreen === 'main' && (
            <>
        <button className="signup-close" aria-label="Close">×</button>
        <div className="signup-x-logo">X</div>
        <h2 className="signup-title">Join X today</h2>
        <button className="signup-btn google" onClick={handleGoogleSignup}>
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
          Sign in with Google
        </button>
              <button className="signup-btn apple" onClick={handleAppleSignup}>
          <span className="apple-icon" /> Sign up with Apple
        </button>
        <div className="signup-divider">
          <span className="line" /> or <span className="line" />
        </div>
        <button className="signup-btn create-account" onClick={handleXSignup}>
          Create account
        </button>
        <div className="signup-terms">
          By signing up, you agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>, including <a href="#">Cookie Use</a>.
        </div>
        <div className="signup-login-link">
          Have an account already? <a href="/login">Log in</a>
        </div>
            </>
          )}
          {activeScreen === 'google' && (
            <>
              <button className="signup-close" aria-label="Close" onClick={handleBack}>×</button>
              <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <GoogleLoginButton />
              </div>
            </>
          )}
          {activeScreen === 'apple' && (
            <>
              <button className="signup-close" aria-label="Close" onClick={handleBack}>×</button>
              <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <AppleLoginButton />
              </div>
            </>
          )}
      </div>
      )}
    </div>
  );
};

export default Signup; 

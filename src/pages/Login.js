// src/login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import AppleLoginButton from '../components/AppleLoginButton';
import '../login.css';

function Login() {
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleClose = () => {
    navigate('/');
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Email not found');
      }

      // Check if it's an OAuth account that can set a password
      if (data.canSetPassword) {
        // Redirect to password setup page for OAuth accounts
        window.location.href = `/login/password?email=${encodeURIComponent(email.trim())}&type=oauth`;
      } else {
        // Regular email login
        window.location.href = `/login/password?email=${encodeURIComponent(email.trim())}`;
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-overlay">
        <div className="login-modal">
          <button className="login-close" onClick={handleClose} aria-label="Close">×</button>
          <div className="login-logo">X</div>
          <h2 className="login-title">Sign in to X</h2>

          {/* Social login section */}
          <div className="social-login-section">
            <a href="http://localhost:5000/auth/google" style={{ textDecoration: 'none', width: '100%' }}>
              <button className="login-btn google" type="button">
                <svg className="google-svg" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" style={{marginRight: '8px'}}>
                  <g>
                    <path fill="#4285F4" d="M24 9.5c3.54 0 6.07 1.53 7.47 2.81l5.52-5.36C33.64 4.09 29.28 2 24 2 14.82 2 6.98 7.98 3.69 16.09l6.91 5.36C12.18 15.09 17.62 9.5 24 9.5z"/>
                    <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.21-.42-4.73H24v9.18h12.42c-.54 2.9-2.18 5.36-4.66 7.02l7.18 5.59C43.98 37.09 46.1 31.36 46.1 24.55z"/>
                    <path fill="#FBBC05" d="M10.6 28.45c-1.09-3.21-1.09-6.68 0-9.89l-6.91-5.36C1.09 17.09 0 20.45 0 24c0 3.55 1.09 6.91 3.69 9.8l6.91-5.35z"/>
                    <path fill="#EA4335" d="M24 44c5.28 0 9.7-1.75 12.93-4.77l-7.18-5.59c-2.01 1.36-4.59 2.18-7.75 2.18-6.38 0-11.82-5.59-13.4-12.91l-6.91 5.36C6.98 40.02 14.82 46 24 46z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </g>
                </svg>
                Sign in with Google
              </button>
            </a>
            <AppleLoginButton />
            <div className="login-divider">
              <span className="line" /> or <span className="line" />
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <input
              className="login-input"
              type="email"
              placeholder="Phone, email, or username"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
            />
            {error && (
              <div style={{ color: '#e0245e', fontSize: '14px', marginTop: '8px', textAlign: 'center', marginBottom: '8px' }}>
                {error}
              </div>
            )}
            <button
              className="login-btn next"
              type="submit"
              disabled={!email.trim() || loading}
            >
              {loading ? 'Checking...' : 'Next'}
            </button>
          </form>

          <button className="login-btn forgot" onClick={() => setShowForgot(true)}>
            Forgot password?
          </button>

          <div className="login-bottom-text">
            Don't have an account? <a href="/signup" className="login-signup-link">Sign up</a>
          </div>
        </div>
      </div>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </>
  );
}

export default Login;
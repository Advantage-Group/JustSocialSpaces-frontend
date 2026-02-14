import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import '../login.css';

function LoginPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOAuthAccount, setIsOAuthAccount] = useState(false);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const typeParam = searchParams.get('type');
    if (emailParam) {
      setEmail(emailParam);
    }
    if (typeParam === 'oauth') {
      setIsOAuthAccount(true);
      setIsSettingPassword(true);
    }
  }, [searchParams]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isSettingPassword ? '/api/auth/set-password-oauth' : '/api/auth/login';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim() 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed');
      }

      // Save token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to pick profile photo page
      window.location.href = '/pick-profile-photo';

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <button className="login-close" aria-label="Close" onClick={handleBack}>×</button>
        <div className="login-logo">X</div>
        <h2 className="login-title">
          {isSettingPassword ? 'Create a password' : 'Enter your password'}
        </h2>
        
        {isSettingPassword && (
          <p style={{ textAlign: 'center', color: '#71767b', fontSize: '14px', marginBottom: '16px' }}>
            Set a password to sign in with your email and password
          </p>
        )}
        
        <form onSubmit={handlePasswordSubmit}>
          {/* Email field එක ඉහළින් - original order */}
          <div style={{ marginBottom: '16px' }}>
            <input
              className="login-input"
              type="email"
              value={email}
              disabled
              style={{ 
                backgroundColor: '#1a1a1a', 
                color: '#71767b',
                cursor: 'not-allowed',
                textAlign: 'center'
              }}
            />
          </div>
          
          {/* Password field එක පහළින් - original order */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <input
              className="login-input"
              type={showPassword ? 'text' : 'password'}
              placeholder={isSettingPassword ? 'Create password (min 8 chars)' : 'Password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              style={{ 
                paddingRight: '16px',
                textAlign: 'center'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '15px',
                top: '36%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#71767b',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          {error && (
            <div style={{ color: '#e0245e', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button
            className="login-btn next"
            type="submit"
            disabled={!password.trim() || loading}
            style={{ width: '100%' }}
          >
            {loading ? (isSettingPassword ? 'Creating...' : 'Signing in...') : (isSettingPassword ? 'Create password' : 'Log in')}
          </button>
        </form>

        {!isSettingPassword && (
          <button className="login-btn forgot" style={{ marginTop: '8px' }}>
            Forgot password?
          </button>
        )}
        
        <div className="login-bottom-text">
          Don't have an account? <Link to="/signup" className="login-signup-link">Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPassword;
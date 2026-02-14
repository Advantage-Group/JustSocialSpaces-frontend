import React, { useState } from 'react';
import axios from 'axios';
import '../login.css';

// Set axios base URL
axios.defaults.baseURL = 'http://localhost:5000';

function ForgotPasswordModal({ onClose }) {
  const [value, setValue] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'code' | 'newPassword'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Handle email submit
  const handleNext = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: value });
      setMaskedEmail(res.data.maskedEmail);
      setStep('code');
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  // Handle code verification
  const handleCodeSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/verify-confirmation-code', { 
        email: value, 
        code: code 
      });
      setResetToken(res.data.resetToken);
      setStep('newPassword');
    } catch (err) {
      console.error('Code verification error:', err);
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    }
    setLoading(false);
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/reset-password', {
        resetToken: resetToken,
        newPassword: newPassword
      });
      
      // Success - redirect to login
      alert('Password reset successfully! Please log in with your new password.');
      onClose();
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <button className="login-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="login-logo">
          <svg className="x-logo-img" width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g>
              <path d="M32.5 7.5H28.75L20 18.75L11.25 7.5H7.5L18.75 22.5L7.5 37.5H11.25L20 26.25L28.75 37.5H32.5L21.25 22.5L32.5 7.5Z" fill="white"/>
            </g>
          </svg>
        </div>
        
        {step === 'email' && (
          <>
            <h2 className="login-title">Find your X account</h2>
            <div className="login-desc">Enter the email, phone number, or username associated with your account to change your password.</div>
            <input
              className="login-input forgot-input"
              type="text"
              placeholder="Email, phone number, or username"
              value={value}
              onChange={e => setValue(e.target.value)}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn next forgot-next" disabled={!value || loading} onClick={handleNext}>
              {loading ? 'Sending...' : 'Next'}
            </button>
          </>
        )}
        
        {step === 'code' && (
          <>
            <h2 className="login-title">Check your email</h2>
            <div className="login-desc">
              We sent a confirmation code to <b>{maskedEmail}</b>. Enter it below to continue.
            </div>
            <input
              className="login-input"
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={e => setCode(e.target.value)}
              maxLength={6}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn next" disabled={!code || loading} onClick={handleCodeSubmit}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button className="login-btn forgot" onClick={() => setStep('email')}>
              Back to email
            </button>
          </>
        )}
        
        {step === 'newPassword' && (
          <>
            <h2 className="login-title">Create new password</h2>
            <div className="login-desc">
              Your password must be at least 8 characters long.
            </div>
            <input
              className="login-input"
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <input
              className="login-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
            {error && <div className="login-error">{error}</div>}
            <button className="login-btn next" disabled={!newPassword || !confirmPassword || loading} onClick={handlePasswordReset}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            <button className="login-btn forgot" onClick={() => setStep('code')}>
              Back to code
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordModal; 
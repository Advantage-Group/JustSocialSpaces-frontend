import React, { useState } from 'react';

function getEmailFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('email') || '';
}

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const email = getEmailFromQuery();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Password set failed');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return <div style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>Invalid or missing email.</div>;
  }

  return (
    <div className="signup-modal-centered">
      <div className="signup-x-logo">X</div>
      <h2 className="signup-title">You'll need a password</h2>
      <div style={{ marginBottom: 16, color: '#aaa', textAlign: 'center' }}>
        Make sure it's 8 characters or more.
      </div>
      <form className="signup-form-modern" onSubmit={handleSubmit}>
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="signup-input-modern"
          autoComplete="new-password"
          minLength={8}
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="signup-input-modern"
          autoComplete="new-password"
          minLength={8}
        />
        {error && (
          <div className="signup-error" style={{ color: 'red', fontSize: '14px', marginTop: '8px' }}>
            {error}
          </div>
        )}
        <button type="submit" className="signup-next-btn" disabled={!password || !confirmPassword || loading}>
          {loading ? 'Setting password...' : 'Sign up'}
        </button>
      </form>
    </div>
  );
};

export default SetPassword; 
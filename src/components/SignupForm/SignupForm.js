import React, { useState } from 'react';
import './SignupForm.css';

const months = [
  'Month', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
const years = Array.from({ length: 100 }, (_, i) => (new Date().getFullYear() - i).toString());

const SignupForm = ({ onClose }) => {
  const [step, setStep] = useState(1); // 1: info, 2: code, 3: password
  const [form, setForm] = useState({ name: '', email: '', month: '', day: '', year: '' });
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Step 1: Info submit
  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setError('');
    // Debug: log form values
    console.log('Form values:', form);
    if (!form.name || !form.email || !form.month || !form.day || !form.year) {
      let missing = [];
      if (!form.name) missing.push('Name');
      if (!form.email) missing.push('Email');
      if (!form.month) missing.push('Month');
      if (!form.day) missing.push('Day');
      if (!form.year) missing.push('Year');
      setError('Please fill: ' + missing.join(', '));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}: Signup failed`);
      }
      
      const data = await response.json();
      setStep(2);
    } catch (err) {
      console.error('Signup error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please check if backend is running.');
      } else {
        setError(err.message || 'Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Code verify
  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Verification failed');
      setStep(3); // Go to password step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Password set failed');
      // Store token and user
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onClose();
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Info
  if (step === 1) {
    const isDisabled = !form.name || !form.email || !form.month || !form.day || !form.year;
    return (
      <div className="signup-modal-centered">
        <button className="signup-close" aria-label="Close" onClick={onClose} >×</button>
        <div className="signup-x-logo">X</div>
        <h2 className="signup-title">Create your account</h2>
        <form className="signup-form-modern" onSubmit={handleInfoSubmit}>
          <div className="signup-input-group">
            <input
              type="text"
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setError(''); setSubmitAttempted(false); }}
              className="signup-input-modern"
              autoComplete="off"
            />
          </div>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={e => { setForm({ ...form, email: e.target.value }); setError(''); setSubmitAttempted(false); }}
            className="signup-input-modern"
            autoComplete="off"
          />
          {(error && submitAttempted) && (
            <div className="signup-error" style={{ color: 'red', fontSize: '14px', marginTop: '8px' }}>
              {error}
            </div>
          )}
          <div className="signup-dob-section">
            <label className="signup-dob-label">Date of birth</label>
            <div className="signup-dob-desc">
              This will not be shown publicly. Confirm your own age, even if this account is for a business, a pet, or something else.
            </div>
            <div className="signup-dob-dropdowns">
              <select name="month" value={form.month} onChange={e => { setForm({ ...form, month: e.target.value }); setError(''); setSubmitAttempted(false); }} className="signup-dob-dropdown">
                <option value="">Month</option>
                {months.slice(1).map((m, i) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select name="day" value={form.day} onChange={e => { setForm({ ...form, day: e.target.value }); setError(''); setSubmitAttempted(false); }} className="signup-dob-dropdown">
                <option value="">Day</option>
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select name="year" value={form.year} onChange={e => { setForm({ ...form, year: e.target.value }); setError(''); setSubmitAttempted(false); }} className="signup-dob-dropdown">
                <option value="">Year</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="signup-next-btn" disabled={isDisabled || loading}>
            {loading ? 'Sending code...' : 'Next'}
          </button>
        </form>
      </div>
    );
  }

  // Step 2: Code
  if (step === 2) {
    return (
      <div className="signup-modal-centered">
        <button className="signup-close" aria-label="Close" onClick={onClose} >×</button>
        <div className="signup-x-logo">X</div>
        <h2 className="signup-title">Enter Verification Code</h2>
        <form className="signup-form-modern" onSubmit={handleCodeSubmit}>
          <input
            type="text"
            name="code"
            placeholder="Enter the 6-digit code sent to your email"
            value={code}
            onChange={e => { setCode(e.target.value); setError(''); }}
            className="signup-input-modern"
            autoComplete="off"
            maxLength={6}
          />
          {error && (
            <div className="signup-error" style={{ color: 'red', fontSize: '14px', marginTop: '8px' }}>
              {error}
            </div>
          )}
          <button type="submit" className="signup-next-btn" disabled={!code || loading}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>
    );
  }

  // Step 3: Password
  if (step === 3) {
    return (
      <div className="signup-modal-centered">
        <button className="signup-close" aria-label="Close" onClick={onClose} >×</button>
        <div className="signup-x-logo">X</div>
        <h2 className="signup-title">You'll need a password</h2>
        <div style={{ marginBottom: 16, color: '#aaa', textAlign: 'center' }}>
          Make sure it's 8 characters or more.
        </div>
        <form className="signup-form-modern" onSubmit={handlePasswordSubmit}>
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            className="signup-input-modern"
            autoComplete="new-password"
            minLength={8}
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
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
  }

  return null;
};

export default SignupForm; 
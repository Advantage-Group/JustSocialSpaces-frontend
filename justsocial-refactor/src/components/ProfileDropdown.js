import React, { useState, useRef, useEffect } from 'react';
import './ProfileDropdown.css';

const ProfileDropdown = ({ username, handleLabel, onAddAccount, onLogout, compact = true }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="profile-dropdown" ref={ref}>
      <button className={`profile-btn${compact ? ' compact' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        {!compact && <span className="profile-icon" />}
        {!compact && <span>{username}</span>}
        <span className="dots">⋯</span>
      </button>
      {open && (
        <div className="dropdown-menu" role="menu">
          <div className="dropdown-item" role="menuitem" onClick={() => { setOpen(false); onAddAccount && onAddAccount(); }}>
            Add an existing account
          </div>
          <div className="dropdown-item" role="menuitem" onClick={() => { setOpen(false); onLogout && onLogout(); }}>
            {`Log out @${handleLabel || username}`}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
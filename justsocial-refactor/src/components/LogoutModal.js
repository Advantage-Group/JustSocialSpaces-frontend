import React from 'react';
import './LogoutModal.css';

function LogoutModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="logout-overlay" onClick={onCancel}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="logout-logo">X</div>
        <h2 className="logout-title">Log out of X?</h2>
        <p className="logout-desc">
          You can always log back in at any time. If you just want to switch
          accounts, you can do that by adding an existing account.
        </p>
        <button className="logout-primary" onClick={onConfirm}>Log out</button>
        <button className="logout-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default LogoutModal;




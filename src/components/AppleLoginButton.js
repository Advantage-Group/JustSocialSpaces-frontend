import React from "react";
import "./AppleLoginButton.css";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const AppleLoginButton = () => {
  const handleAppleLogin = () => {
    window.location.href = `${BACKEND_URL}/auth/apple`;
  };

  return (
    <button className="apple-login-button" onClick={handleAppleLogin}>
      <span className="apple-icon" />
      Sign in with Apple
    </button>
  );
};

export default AppleLoginButton;

import React from "react";
import "./AppleLoginButton.css";

const REACT_APP_BASE_URL =
  process.env.REACT_APP_BASE_URL || "http://localhost:5000";

const AppleLoginButton = () => {
  const handleAppleLogin = () => {
    window.location.href = `${REACT_APP_BASE_URL}/auth/apple`;
  };

  return (
    <button className="apple-login-button" onClick={handleAppleLogin}>
      <span className="apple-icon" />
      Sign in with Apple
    </button>
  );
};

export default AppleLoginButton;

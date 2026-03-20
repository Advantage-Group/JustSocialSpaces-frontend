import React from "react";
import "./GoogleLoginButton.css"; // Assuming you have a CSS file for the button

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const GoogleLoginButton = () => {
  const handleGoogleLogin = () => {
    try {
      console.log("🚀 Initiating Google OAuth...");
      console.log("🔗 Backend URL:", BACKEND_URL);
      console.log("🔗 Redirecting to:", `${BACKEND_URL}/auth/google`);

      // Redirect to the backend Google authentication route
      // This will redirect to Google's OAuth consent screen
      window.location.href = `${BACKEND_URL}/auth/google`;
    } catch (error) {
      console.error("Google login error:", error);
      // You could show a user-friendly error message here
    }
  };

  return (
    <button className="google-login-button" onClick={handleGoogleLogin}>
      <img
        src="https://developers.google.com/identity/images/g-logo.png"
        alt="Google logo"
      />
      Sign in with Google
    </button>
  );
};

export default GoogleLoginButton;

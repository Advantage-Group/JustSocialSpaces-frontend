import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoadingScreen.css";

const LoadingScreen = () => {
  const navigate = useNavigate();
  const [showX, setShowX] = useState(true);

  useEffect(() => {
    const xTimer = setTimeout(() => {
      setShowX(false);
    }, 1000); // Show X for 1 second
    const spinnerTimer = setTimeout(() => {
      navigate("/login");
    }, 2000); // Show spinner for 1 second, then redirect
    return () => {
      clearTimeout(xTimer);
      clearTimeout(spinnerTimer);
    };
  }, [navigate]);

  return (
    <div className="loading-screen">
      {showX ? (
        <div className="x-logo">X</div>
      ) : (
        <div className="twitter-spinner"></div>
      )}
    </div>
  );
};

export default LoadingScreen;
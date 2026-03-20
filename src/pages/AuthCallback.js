import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log("🔍 AuthCallback - Full URL:", window.location.href);
    console.log(
      "🔍 AuthCallback - All Query Params:",
      Object.fromEntries(searchParams),
    );

    const userParam = searchParams.get("user");
    const tokenParam = searchParams.get("token");
    const errorParam = searchParams.get("error");

    console.log("🔍 AuthCallback - user param:", userParam);
    console.log("🔍 AuthCallback - token param:", tokenParam);
    console.log("🔍 AuthCallback - error param:", errorParam);

    if (errorParam) {
      console.error("❌ Auth error:", errorParam);
      navigate(`/login?error=${errorParam}`);
      return;
    }

    if (userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log("✅ Parsed user data:", userData);

        // Store user data in localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", userData.token || tokenParam);

        console.log("✅ Stored in localStorage:", {
          user: localStorage.getItem("user"),
          token: localStorage.getItem("token"),
        });

        // Check if user has a profile photo (not a placeholder)
        const hasProfilePhoto =
          userData.photo && !userData.photo.includes("ui-avatars.com");

        // Only redirect to photo picker if user doesn't have a photo
        if (hasProfilePhoto) {
          console.log("✅ Redirecting to dashboard");
          navigate("/dashboard");
        } else {
          console.log("✅ Redirecting to photo picker");
          navigate("/pick-profile-photo");
        }
      } catch (error) {
        console.error("❌ Error parsing user data:", error);
        navigate("/login?error=auth_failed");
      }
    } else if (tokenParam) {
      // Handle token-only callback (alternative backend implementation)
      console.log("📝 Token-only callback detected");
      localStorage.setItem("token", tokenParam);

      // Fetch user data from backend
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${tokenParam}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("✅ Fetched user data:", data);
          localStorage.setItem("user", JSON.stringify(data.user || data));
          navigate("/dashboard");
        })
        .catch((error) => {
          console.error("❌ Error fetching user data:", error);
          navigate("/login?error=fetch_user_failed");
        });
    } else {
      // No user data, redirect to login
      console.warn("⚠️ No user data or token in URL");
      navigate("/login?error=no_user_data");
    }
  }, [searchParams, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff",
        fontSize: "18px",
      }}
    >
      Completing sign in...
    </div>
  );
};

export default AuthCallback;

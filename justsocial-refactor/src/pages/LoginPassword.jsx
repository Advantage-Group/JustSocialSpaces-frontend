import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import "../login.css";
import config from "../config.js";

function LoginPassword() {
	const [searchParams] = useSearchParams();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [isOAuthAccount, setIsOAuthAccount] = useState(false);
	const [isSettingPassword, setIsSettingPassword] = useState(false);

	useEffect(() => {
		const emailParam = searchParams.get("email");
		const typeParam = searchParams.get("type");
		if (emailParam) {
			setEmail(emailParam);
		}
		if (typeParam === "oauth") {
			setIsOAuthAccount(true);
			setIsSettingPassword(true);
		}
	}, [searchParams]);

	// ...rest of LoginPassword.js code...
}

export default LoginPassword;
// ...existing code...
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import "./Notifications.css";
import config from "../config.js";

const Notifications = () => {
  const navigate = useNavigate();
  const { state } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      if (page === 1) {
        fetchNotifications(true); // Refresh first page
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async (refresh = false) => {
    try {
      const currentPage = refresh ? 1 : page;
      const response = await fetch(
        `${config.API_BASE_URL}/notifications?page=${currentPage}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
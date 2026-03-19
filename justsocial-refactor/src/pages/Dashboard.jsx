// ...existing code...
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import PollCreator from "../components/PollCreator";
import PollDisplay from "../components/PollDisplay";
import CommentModal from "../components/CommentModal.jsx";
import ShareModal from "../components/ShareModal.jsx";
import ComposeModal from "../components/ComposeModal";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import config from "../config.js";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("for-you");
  const [notification, setNotification] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollData, setPollData] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [showReactionPickerPostId, setShowReactionPickerPostId] =
    useState(null);
  const [reactionLoadingPostId, setReactionLoadingPostId] = useState(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [followLoading, setFollowLoading] = useState({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [followingList, setFollowingList] = useState([]);

  useEffect(() => {
    // Get user data from localStorage
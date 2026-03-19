import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PostDetailModal from "../components/PostDetailModal";
import ShareModal from "../components/ShareModal";
import LikeButton from "../components/LikeButton";
import PollDisplay from "../components/PollDisplay";
import CommentModal from "../components/CommentModal";
import "./Explore.css";
import config from "../config.js";

// ...rest of Explore.js code...
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import "./Profile.css";
import CommentModal from "../components/CommentModal";
import PostDetailModal from "../components/PostDetailModal";
import ShareModal from "../components/ShareModal";
import ImageEditor from "../components/ImageEditor";
import LikeButton from "../components/LikeButton";
import EditProfileModal from "../components/EditProfileModal";
import config from "../config.js";

// ...rest of Profile.js code...
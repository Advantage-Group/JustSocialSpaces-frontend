import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import GifPicker from "./GifPicker";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";
import "./CommentModal.css";
import config from "../config.js";

const CommentModal = ({ isOpen, onClose, post, onCommentPosted }) => {
	const navigate = useNavigate();
	const { state, showNotification } = useApp();
	const [commentText, setCommentText] = useState("");
	const [isPosting, setIsPosting] = useState(false);
	const [selectedMedia, setSelectedMedia] = useState([]);
	const [selectedGif, setSelectedGif] = useState(null);
	const [showGifPicker, setShowGifPicker] = useState(false);
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const emojiPickerRef = useRef(null);
	const textareaRef = useRef(null);

	useEffect(() => {
		if (isOpen && textareaRef.current) {
			textareaRef.current.focus();
		}
	}, [isOpen]);

	useEffect(() => {
		const onClickOutside = (e) => {
			if (
				showEmojiPicker &&
				emojiPickerRef.current &&
				!emojiPickerRef.current.contains(e.target)
			) {
				setShowEmojiPicker(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [showEmojiPicker]);

	const handleComment = async () => {
		if (
			(!commentText.trim() && selectedMedia.length === 0 && !selectedGif) ||
			isPosting
		)
			return;

		setIsPosting(true);
		try {
			const token = localStorage.getItem("token");

			const formData = new FormData();
			formData.append("content", commentText.trim());
			formData.append("parentPostId", post._id);

			// Add media files if any
			selectedMedia.forEach((media) => {
				formData.append("media", media);
			});

			// Add GIF if selected
			if (selectedGif) {
				formData.append(
					"gif",
					JSON.stringify({
						url: selectedGif.images.original.url,
						title: selectedGif.title,
						id: selectedGif.id,
						source: "giphy",
					}),
				);
			}

			const response = await fetch(`${config.API_BASE_URL}/posts/comments`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
import React, { useState, useEffect } from 'react';
import './ShareModal.css';

const ShareModal = ({ isOpen, onClose, post }) => {
	const [postUrl, setPostUrl] = useState('');
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (isOpen && post) {
			// Generate post URL
			const url = `${window.location.origin}/post/${post._id}`;
			setPostUrl(url);
		}
	}, [isOpen, post]);

	const handleCopyLink = async () => {
		try {
			await navigator.clipboard.writeText(postUrl);
			setCopied(true);
			setTimeout(() => {
				setCopied(false);
			}, 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	};

	const handleShareTwitter = () => {
		const text = post?.content ? `${post.content.substring(0, 100)}...` : 'Check out this post!';
		const url = encodeURIComponent(postUrl);
		const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`;
		window.open(twitterUrl, '_blank', 'width=550,height=420');
	};

	const handleShareFacebook = () => {
		const url = encodeURIComponent(postUrl);
		const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
		window.open(facebookUrl, '_blank', 'width=550,height=420');
	};

	const handleShareWhatsApp = () => {
		const text = post?.content ? `${post.content.substring(0, 100)}...` : 'Check out this post!';
		const url = encodeURIComponent(postUrl);
		const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + postUrl)}`;
		window.open(whatsappUrl, '_blank');
	};

	const handleNativeShare = async () => {
		if (navigator.share) {
			try {
				const shareData = {
					title: post?.content ? post.content.substring(0, 50) : 'Post',
					text: post?.content || 'Check out this post!',
					url: postUrl,
				};
				await navigator.share(shareData);
			} catch (err) {
				if (err.name !== 'AbortError') {
					console.error('Error sharing:', err);
				}
			}
		} else {
			// Fallback to copy link if native share is not available
			handleCopyLink();
		}
	};

	if (!isOpen) return null;

	return (
		<div className="share-modal-overlay" onClick={onClose}>
			<div className="share-modal" onClick={(e) => e.stopPropagation()}>
				<div className="share-modal-header">
					<h2>Share Post</h2>
					<button className="share-modal-close" onClick={onClose}>
						<svg viewBox="0 0 24 24" width="20" height="20">
							<path fill="currentColor" d="M10.59 12L5.54 6.96l1.42-1.42L12 10.59l5.04-5.05 1.42 1.42L13.41 12l5.05 5.04-1.42 1.42L12 13.41l-5.04 5.05-1.42-1.42L10.59 12z"/>
						</svg>
					</button>
				</div>
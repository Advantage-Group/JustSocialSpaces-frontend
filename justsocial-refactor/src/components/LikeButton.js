import React, { useState, useEffect } from 'react';
import './LikeButton.css';

const LikeButton = ({ post, userId, onLike, onUnlike, isLoading = false }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState([]);

  // Check if user has liked this post
  useEffect(() => {
    if (post?.reactions && userId) {
      const userReaction = post.reactions.find(r => 
        r.userId === userId || r.userId?._id === userId || r.userId?.toString() === userId?.toString()
      );
      // Check if user reacted with ❤️ (red heart) or any heart emoji
      const heartEmojis = ['❤️', '❤', '💕', '💖', '💗', '💓', '💝', '🧡'];
      setIsLiked(userReaction && heartEmojis.includes(userReaction.emoji));
    }
  }, [post?.reactions, userId]);

  const getLikeCount = () => {
    if (!post?.reactions) return 0;
    const heartEmojis = ['❤️', '❤', '💕', '💖', '💗', '💓', '💝', '🧡'];
    return post.reactions.filter(r => heartEmojis.includes(r.emoji)).length;
  };

  const handleClick = async (e) => {
    e.stopPropagation();
    
    if (isLoading) return;

    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setIsAnimating(true);

    // Create particle effect
    if (!wasLiked) {
      createParticles(e);
    }

    // Call the appropriate handler
    try {
      if (wasLiked) {
        await onUnlike();
      } else {
        await onLike();
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
    }

    // Reset animation state
    setTimeout(() => {
      setIsAnimating(false);
    }, 600);
  };

  const createParticles = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const newParticles = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * 60) * (Math.PI / 180);
      const distance = 30 + Math.random() * 20;
      const endX = centerX + Math.cos(angle) * distance;
      const endY = centerY + Math.sin(angle) * distance;
      
      return {
        id: Date.now() + i,
        startX: centerX,
        startY: centerY,
        endX: endX,
        endY: endY,
      };
    });

    setParticles(newParticles);

    // Remove particles after animation
    setTimeout(() => {
      setParticles([]);
    }, 1000);
  };

  const likeCount = getLikeCount();

  return (
    <button
      className={`like-button ${isLiked ? 'liked' : ''} ${isAnimating ? 'animating' : ''}`}
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <div className="like-button-content">
        <svg 
          className="like-icon" 
          viewBox="0 0 24 24" 
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/>
        </svg>
        {likeCount > 0 && (
          <span className="like-count">{likeCount}</span>
        )}
      </div>
      
      {/* Particle effects */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="like-particle"
          style={{
            left: `${particle.startX}px`,
            top: `${particle.startY}px`,
            '--end-x': `${particle.endX - particle.startX}px`,
            '--end-y': `${particle.endY - particle.startY}px`,
          }}
        >
          ❤️
        </div>
      ))}
    </button>
  );
};

export default LikeButton;


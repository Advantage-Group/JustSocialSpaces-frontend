import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import PostDetailModal from '../components/PostDetailModal';
import ShareModal from '../components/ShareModal';
import LikeButton from '../components/LikeButton';
import PollDisplay from '../components/PollDisplay';
import CommentModal from '../components/CommentModal';
import './Explore.css';

const Explore = () => {
  const navigate = useNavigate();
  const { state, dispatch, showNotification } = useApp();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [showPostDetailModal, setShowPostDetailModal] = useState(false);
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPostForComment, setSelectedPostForComment] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPostForShare, setSelectedPostForShare] = useState(null);
  const [reactionLoadingPostId, setReactionLoadingPostId] = useState(null);

  useEffect(() => {
    fetchExplorePosts(currentPage);
  }, [currentPage]);

  const fetchExplorePosts = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/explore?page=${page}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setHasNextPage(data.pagination?.hasNextPage || false);
        setHasPrevPage(data.pagination?.hasPrevPage || false);
      } else {
        showNotification('Failed to load posts', 'error');
      }
    } catch (error) {
      console.error('Error fetching explore posts:', error);
      showNotification('Failed to load posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLike = async (postId) => {
    setReactionLoadingPostId(postId);
    
    const currentPost = posts.find(p => p._id === postId);
    if (!currentPost) return;
    
    const userId = state.user?._id || state.user?.id;
    const currentReactions = currentPost.reactions || [];
    
    const optimisticReactions = [...currentReactions.filter(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      return rUserId !== userId?.toString();
    }), { emoji: '❤️', userId }];
    
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p._id === postId ? { ...p, reactions: optimisticReactions } : p
      )
    );
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ emoji: '❤️' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? { ...p, reactions: data.reactions } : p
          )
        );
        // Refresh to update sorting
        fetchExplorePosts(currentPage);
      } else {
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? currentPost : p
          )
        );
      }
    } catch (e) {
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p._id === postId ? currentPost : p
        )
      );
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const handleUnlike = async (postId) => {
    setReactionLoadingPostId(postId);
    
    const currentPost = posts.find(p => p._id === postId);
    if (!currentPost) return;
    
    const userId = state.user?._id || state.user?.id;
    const currentReactions = currentPost.reactions || [];
    
    const optimisticReactions = currentReactions.filter(r => {
      const rUserId = r.userId?._id || r.userId?.toString();
      return rUserId !== userId?.toString();
    });
    
    setPosts(prevPosts => 
      prevPosts.map(p => 
        p._id === postId ? { ...p, reactions: optimisticReactions } : p
      )
    );
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/posts/${postId}/react`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? { ...p, reactions: data.reactions } : p
          )
        );
        // Refresh to update sorting
        fetchExplorePosts(currentPage);
      } else {
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p._id === postId ? currentPost : p
          )
        );
      }
    } catch (e) {
      setPosts(prevPosts => 
        prevPosts.map(p => 
          p._id === postId ? currentPost : p
        )
      );
    } finally {
      setReactionLoadingPostId(null);
    }
  };

  const handleCommentClick = (post) => {
    setSelectedPostForComment(post);
    setShowCommentModal(true);
  };

  const handlePostClick = (post) => {
    setSelectedPostForDetail(post);
    setShowPostDetailModal(true);
  };

  if (loading && posts.length === 0) {
    return (
      <div className="explore-page">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="explore-page">
      <div className="explore-header">
        <h2>Explore</h2>
      </div>

      <div className="explore-posts">
        {posts.length === 0 ? (
          <div className="no-posts">
            <h3>No posts found</h3>
            <p>There are no posts to explore yet.</p>
          </div>
        ) : (
          posts.map((post) => {
            const isOwnPost = (post.author?.email && state.user?.email && post.author.email === state.user.email) ||
              (post.author?._id && state.user?._id && post.author._id === state.user._id);
            
            return (
              <article 
                key={post._id} 
                className="post-card"
                onClick={() => handlePostClick(post)}
                style={{ cursor: 'pointer' }}
              >
                <div className="post-header">
                  <img 
                    key={`explore-avatar-${post._id}-${post.author?._id || post.author?.id}-${post.author?.photo || 'default'}`}
                    src={post.author?.photo ? `${post.author.photo}${post.author.photo.includes('?') ? '&' : '?'}v=${post.author?._id || post.author?.id || 'default'}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}`} 
                    alt="Profile" 
                    className="post-profile-pic"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${post.author?._id || post.author?.id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'User')}`;
                    }}
                  />
                  <div className="post-user-info">
                    <span 
                      className="post-user-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${post.author?._id || post.author?.id}`);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {post.author?.name || 'User'}
                    </span>
                    <span className="post-user-handle"> @{post.author?.email?.split('@')[0] || 'user'}</span>
                    <span className="post-timestamp"> · {formatTimeAgo(post.createdAt)}</span>
                  </div>
                </div>

                {post.parentAuthor && (
                  <div className="replying-to-label">
                    Replying to <span className="replying-to-email">{post.parentAuthor.email}</span>
                  </div>
                )}

                {post.content && (
                  <div className="post-content">{post.content}</div>
                )}

                {post.poll && (
                  <PollDisplay
                    poll={{
                      ...post.poll,
                      author: post.author
                    }}
                    currentUserId={state.user?._id || state.user?.id}
                    onVote={() => fetchExplorePosts(currentPage)}
                  />
                )}

                {post.images && post.images.length > 0 && (
                  <div className={`post-images grid-${Math.min(post.images.length, 4)}`}>
                    {post.images.slice(0, 4).map((img, idx) => (
                      <img key={idx} src={img} alt="" />
                    ))}
                  </div>
                )}

                {post.gif && (
                  <div className="post-gif">
                    <img 
                      src={typeof post.gif === 'string' ? post.gif : post.gif.url} 
                      alt={post.gif.title || 'GIF'}
                      className="post-gif-image"
                    />
                  </div>
                )}

                <div className="post-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="action-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCommentClick(post);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/>
                    </svg>
                    <span>{post.replies || 0}</span>
                  </button>
                  
                  <button className="action-button">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/>
                    </svg>
                    <span>{post.retweets || 0}</span>
                  </button>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <LikeButton
                      post={post}
                      userId={state.user?._id || state.user?.id}
                      onLike={() => handleLike(post._id)}
                      onUnlike={() => handleUnlike(post._id)}
                      isLoading={reactionLoadingPostId === post._id}
                    />
                  </div>
                  
                  <button className="action-button">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/>
                    </svg>
                    <span>{post.views || 0}</span>
                  </button>
                  
                  <button 
                    className="action-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPostForShare(post);
                      setShowShareModal(true);
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z"/>
                    </svg>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={!hasPrevPage || loading}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={!hasNextPage || loading}
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showPostDetailModal && selectedPostForDetail && (
        <PostDetailModal
          isOpen={showPostDetailModal}
          post={selectedPostForDetail}
          onClose={() => {
            setShowPostDetailModal(false);
            setSelectedPostForDetail(null);
          }}
        />
      )}

      {showCommentModal && selectedPostForComment && (
        <CommentModal
          isOpen={showCommentModal}
          post={selectedPostForComment}
          onClose={() => {
            setShowCommentModal(false);
            setSelectedPostForComment(null);
          }}
          onCommentPosted={() => fetchExplorePosts(currentPage)}
        />
      )}

      {showShareModal && selectedPostForShare && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedPostForShare(null);
          }}
          post={selectedPostForShare}
        />
      )}
    </div>
  );
};

export default Explore;


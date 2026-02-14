import React, { useState, useEffect } from 'react';
import { GIPHY_CONFIG } from '../config/giphy';
import './GifPicker.css';

const GifPicker = ({ isOpen, onClose, onSelectGif }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('trending');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Giphy categories for the picker
  const categories = [
    { id: 'trending', name: 'Trending', icon: '🔥' },
    { id: 'funny', name: 'Funny', icon: '😂' },
    { id: 'reactions', name: 'Reactions', icon: '😮' },
    { id: 'animals', name: 'Animals', icon: '🐱' },
    { id: 'dance', name: 'Dance', icon: '💃' },
    { id: 'meme', name: 'Meme', icon: '🤣' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Load trending GIFs by default
      loadGifs('trending');
    }
  }, [isOpen]);

  const loadGifs = async (category, searchQuery = '') => {
    setLoading(true);
    setError(null);
    
    try {
      let url;
      
      if (category === 'trending') {
        // Fetch trending GIFs
        url = `${GIPHY_CONFIG.BASE_URL}/trending?api_key=${GIPHY_CONFIG.API_KEY}&limit=${GIPHY_CONFIG.LIMIT}&rating=g`;
      } else if (searchQuery.trim()) {
        // Search GIFs
        url = `${GIPHY_CONFIG.BASE_URL}/search?api_key=${GIPHY_CONFIG.API_KEY}&q=${encodeURIComponent(searchQuery)}&limit=${GIPHY_CONFIG.LIMIT}&rating=g`;
      } else {
        // Search by category
        url = `${GIPHY_CONFIG.BASE_URL}/search?api_key=${GIPHY_CONFIG.API_KEY}&q=${encodeURIComponent(category)}&limit=${GIPHY_CONFIG.LIMIT}&rating=g`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.data && Array.isArray(data.data)) {
        setGifs(data.data);
      } else {
        setError('No GIFs found');
        setGifs([]);
      }
    } catch (err) {
      console.error('Error fetching GIFs:', err);
      setError('Failed to load GIFs. Please try again.');
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.trim()) {
      setSelectedCategory('search');
      loadGifs('search', value);
    } else {
      setSelectedCategory('trending');
      loadGifs('trending');
    }
  };

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId);
    setSearchTerm('');
    loadGifs(categoryId);
  };

  const handleGifSelect = (gif) => {
    onSelectGif(gif);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="gif-picker-overlay" onClick={onClose}>
      <div className="gif-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gif-picker-header">
          <h3>Search for GIFs</h3>
          <button className="gif-picker-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="gif-picker-search">
          <input
            type="text"
            placeholder="Q Search for GIFs"
            value={searchTerm}
            onChange={handleSearch}
            className="gif-search-input"
          />
        </div>

        {/* Categories */}
        <div className="gif-categories">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`gif-category ${selectedCategory === category.id ? 'active' : ''}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>

        <div className="gif-picker-content">
          {loading && (
            <div className="gif-picker-loading">
              <p>Loading GIFs...</p>
            </div>
          )}
          
          {error && (
            <div className="gif-picker-error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="gif-grid">
              {gifs.map((gif) => (
                <div
                  key={gif.id}
                  className="gif-item"
                  onClick={() => handleGifSelect(gif)}
                >
                  <img
                    src={gif.images.fixed_height.url}
                    alt={gif.title || 'GIF'}
                    loading="lazy"
                    onError={(e) => {
                      // Fallback for broken images
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && gifs.length === 0 && (
            <div className="gif-picker-empty">
              <p>No GIFs found. Try a different search term.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GifPicker;
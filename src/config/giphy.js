// Giphy API Configuration

export const GIPHY_CONFIG = {
  // API key from environment variable
  // Default to demo key if not set
  API_KEY: process.env.REACT_APP_GIPHY_API_KEY || '6c0kkcBcVi6uBQeuxd6kv0euqOsdquBo',
  BASE_URL: 'https://api.giphy.com/v1/gifs',
  LIMIT: 20
};



// Backend configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export default {
  BACKEND_URL,
  API_BASE_URL: `${BACKEND_URL}/api`,
  AUTH_BASE_URL: BACKEND_URL
}; 
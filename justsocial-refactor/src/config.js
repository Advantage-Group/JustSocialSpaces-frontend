// Check the variable exists, else throw an error
if (!process.env.REACT_APP_BACKEND_URL) {
  console.error("REACT_APP_BACKEND_URL is not set");
}

if (!process.env.REACT_APP_BASE_URL) {
  console.error("REACT_APP_BASE_URL is not set");
}

// Backend configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const REACT_APP_BASE_URL = process.env.REACT_APP_BASE_URL;

export default {
  BACKEND_URL,
  API_BASE_URL: `${BACKEND_URL}/api`,
  AUTH_BASE_URL: BACKEND_URL,
  REACT_APP_BASE_URL,
};

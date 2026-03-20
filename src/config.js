// Check the variable exists, else throw an error
if (!import.meta.env.VITE_BACKEND_URL) {
  console.error("VITE_BACKEND_URL is not set");
}

if (!import.meta.env.VITE_BASE_URL) {
  console.error("VITE_BASE_URL is not set");
}

// Backend configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const REACT_APP_BASE_URL = import.meta.env.VITE_BASE_URL;

// Display the configuration for debugging
console.log("🚀 Configuration:");
console.log("BACKEND_URL:", BACKEND_URL);
console.log("REACT_APP_BASE_URL:", REACT_APP_BASE_URL);

export default {
  BACKEND_URL,
  API_BASE_URL: `${BACKEND_URL}/api`,
  AUTH_BASE_URL: BACKEND_URL,
  REACT_APP_BASE_URL,
};

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl, getDefaultServerUrl } from '../utils/serverConfig';

// ========================================
// DYNAMIC API CONFIGURATION
// ========================================
// The API base URL is configurable through the Server Settings screen
// Users can change the server IP without rebuilding the app
//
// To change DEFAULT server (for all new installs):
// Edit mobile/src/utils/serverConfig.js -> DEFAULT_CONFIG
//
// To change server at runtime:
// Go to Login Screen → Server Settings

let cachedBaseURL = null;

// Get API base URL (cached for performance)
const getApiBaseUrl = async () => {
  if (!cachedBaseURL) {
    cachedBaseURL = await getServerUrl();
  }
  return cachedBaseURL;
};

// Reset cached URL (call when server config changes)
export const resetApiBaseUrl = () => {
  cachedBaseURL = null;
};

// Initialize base URL from DEFAULT_CONFIG (single source of truth)
const api = axios.create({
  baseURL: getDefaultServerUrl(), // Start with default, update in interceptor
  timeout: 30000, // 30 second timeout for order sync (backend can be slow)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update cached URL in background (non-blocking)
getApiBaseUrl().then(url => {
  cachedBaseURL = url;
  api.defaults.baseURL = url;
  console.log('✅ [API] Server URL loaded:', url);
}).catch(error => {
  console.warn('⚠️ Could not load saved server config, using default:', error.message);
});

// Log requests for debugging
api.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log('🌐 [API] Request:', config.method?.toUpperCase(), fullUrl);
    return config;
  },
  (error) => {
    console.error('❌ [API] Request setup error:', error.message);
    return Promise.reject(error);
  }
);

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Enhanced error logging
    if (error.response) {
      // Server responded with error status
      console.error('❌ [API] Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error('❌ [API] Network error - no response received');
      console.error('❌ [API] Request config:', {
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        method: error.config?.method
      });
    } else {
      // Error in request setup
      console.error('❌ [API] Request setup error:', error.message);
    }
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

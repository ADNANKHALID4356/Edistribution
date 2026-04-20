import axios from 'axios';
import { getServerUrl } from '../utils/serverConfig';

// Get initial URL from serverConfig (single source of truth)
const initialUrl = getServerUrl();

// Create axios instance with dynamic backend URL from serverConfig
const api = axios.create({
  baseURL: initialUrl,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Update baseURL before each request (in case config changed)
api.interceptors.request.use(
  (config) => {
    config.baseURL = getServerUrl();
    return config;
  },
  (error) => Promise.reject(error)
);

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use hash routing for Electron compatibility
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

export default api;

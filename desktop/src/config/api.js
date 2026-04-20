// ============================================
// CENTRAL API CONFIGURATION
// ============================================
// This file is kept for backward compatibility
// The actual server configuration is managed by serverConfig.js
// Users can change server settings through the Server Settings dialog
//
// To change the DEFAULT server (for new installations):
// Edit desktop/src/utils/serverConfig.js -> DEFAULT_CONFIG

import { getServerUrl } from '../utils/serverConfig';

// Dynamic URL from serverConfig (single source of truth)
export const BACKEND_URL = getServerUrl();
export const API_BASE_URL = BACKEND_URL;

// Environment detection
const environment = process.env.NODE_ENV || 'development';

const config = {
  API_BASE_URL: BACKEND_URL,
  BACKEND_URL,
  environment,
  getServerUrl
};

export default config;

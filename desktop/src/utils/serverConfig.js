/**
 * @file serverConfig.js
 * @description Server Configuration Utility for Desktop App.
 * Stores and retrieves the central server connection details using localStorage.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_CONFIG_KEY = 'serverConfig';
const CONFIG_VERSION_KEY = 'serverConfigVersion';

/**
 * Increment this value to force-reset all clients to the new default config.
 * Useful when switching environments (e.g. local → production).
 */
const CURRENT_CONFIG_VERSION = 1776635000002; // post-fix deployment

/** Timeout in milliseconds for server connection tests. */
const CONNECTION_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------
// IMPORTANT: Update DEFAULT_CONFIG before building for production distribution.
//   - Option 1: Set your production server below to pre-configure all clients.
//   - Option 2: Keep localhost so users configure the server on first launch.

/** @type {{ host: string, port: string, protocol: 'http' | 'https' }} */
const DEFAULT_CONFIG = {
  host: '147.93.108.205', // VPS Production Server
  port: '5005',           // Real backend port
  protocol: 'http',
};

// Local dev fallback:
// const DEFAULT_CONFIG = {
//   host: 'localhost',
//   port: '5000',
//   protocol: 'http',
// };

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Normalizes and validates a raw config object.
 * Returns a clean config or `null` if the input is invalid.
 *
 * @param {unknown} config
 * @returns {{ host: string, port: string, protocol: 'http' | 'https' } | null}
 */
const normalizeConfig = (config) => {
  if (!config || typeof config !== 'object') return null;

  const host = String(config.host ?? '').trim();
  const port = String(config.port ?? '').trim();
  const protocol = config.protocol === 'https' ? 'https' : 'http';

  if (!host || !port) return null;

  return { host, port, protocol };
};

/**
 * Returns `true` if the given config points to a local machine.
 *
 * @param {{ host: string } | null | undefined} config
 * @returns {boolean}
 */
const isLocalHostConfig = (config) => {
  const host = String(config?.host ?? '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1';
};

/**
 * Checks the stored config version and resets stale or incompatible configs.
 * Also auto-heals a stored localhost config when the app default is a remote server.
 * Should be called once at application startup, not on every module import.
 */
export const initServerConfig = () => {
  try {
    const storedVersion = parseInt(localStorage.getItem(CONFIG_VERSION_KEY) ?? '0', 10);

    if (storedVersion < CURRENT_CONFIG_VERSION) {
      localStorage.removeItem(SERVER_CONFIG_KEY);
      localStorage.setItem(CONFIG_VERSION_KEY, String(CURRENT_CONFIG_VERSION));
      console.log('[serverConfig] Config reset to defaults (version upgrade).');
      return;
    }

    // Auto-heal: if the app now targets a remote server but a localhost config
    // is still stored (e.g. a developer leftover), wipe it.
    const stored = localStorage.getItem(SERVER_CONFIG_KEY);
    if (stored) {
      const parsed = normalizeConfig(JSON.parse(stored));
      const defaultIsRemote = !isLocalHostConfig(DEFAULT_CONFIG);

      if (!parsed || (defaultIsRemote && isLocalHostConfig(parsed))) {
        localStorage.removeItem(SERVER_CONFIG_KEY);
        console.log('[serverConfig] Stale localhost config replaced with production defaults.');
      }
    }
  } catch (error) {
    console.error('[serverConfig] Error during initialization:', error);
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieves the active server configuration.
 * Falls back to DEFAULT_CONFIG if nothing is stored or the stored value is invalid.
 *
 * @returns {{ host: string, port: string, protocol: 'http' | 'https' }}
 */
export const getServerConfig = () => {
  try {
    const stored = localStorage.getItem(SERVER_CONFIG_KEY);
    if (stored) {
      const parsed = normalizeConfig(JSON.parse(stored));
      if (parsed) return parsed;
    }
  } catch (error) {
    console.error('[serverConfig] Error reading config:', error);
  }
  return normalizeConfig(DEFAULT_CONFIG) ?? DEFAULT_CONFIG;
};

/**
 * Persists a new server configuration to localStorage.
 *
 * @param {{ host: string, port: string, protocol?: 'http' | 'https' }} config
 * @returns {boolean} `true` on success, `false` on validation failure or storage error.
 */
export const setServerConfig = (config) => {
  try {
    const normalized = normalizeConfig(config);
    if (!normalized) {
      console.warn('[serverConfig] Attempted to save an invalid config:', config);
      return false;
    }
    localStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(normalized));
    return true;
  } catch (error) {
    console.error('[serverConfig] Error saving config:', error);
    return false;
  }
};

/**
 * Returns the fully-qualified base API URL for the active server.
 * Example: `"http://localhost:5000/api"`
 *
 * @returns {string}
 */
export const getServerUrl = () => {
  const { protocol, host, port } = getServerConfig();
  return `${protocol}://${host}:${port}/api`;
};

/**
 * Returns `true` if the server has been explicitly configured by the user
 * (i.e. a non-default value is saved in localStorage).
 *
 * @returns {boolean}
 */
export const isServerConfigured = () => {
  return localStorage.getItem(SERVER_CONFIG_KEY) !== null;
};

/**
 * Clears the stored server configuration, reverting to DEFAULT_CONFIG.
 *
 * @returns {boolean} `true` on success, `false` on storage error.
 */
export const resetServerConfig = () => {
  try {
    localStorage.removeItem(SERVER_CONFIG_KEY);
    return true;
  } catch (error) {
    console.error('[serverConfig] Error resetting config:', error);
    return false;
  }
};

/**
 * Tests connectivity to a server by hitting its `/api/health` endpoint.
 * Uses AbortController to enforce a timeout.
 *
 * @param {string} host
 * @param {string | number} port
 * @param {'http' | 'https'} [protocol='http']
 * @returns {Promise<{ success: boolean, message: string, data?: unknown }>}
 */
export const testServerConnection = async (host, port, protocol = 'http') => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${protocol}://${host}:${port}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: 'Connection successful', data };
    }

    return { success: false, message: `Server returned status ${response.status}` };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return {
      success: false,
      message: isTimeout
        ? `Connection timed out after ${CONNECTION_TIMEOUT_MS}ms`
        : (error.message || 'Connection failed'),
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
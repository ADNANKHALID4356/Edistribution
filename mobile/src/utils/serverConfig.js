import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SERVER_CONFIG_KEY = '@distribution_server_config';
const CONFIG_VERSION_KEY = '@distribution_server_config_version';

/**
 * Bump when defaults change (local ↔ VPS) to clear stale AsyncStorage.
 */
const CURRENT_CONFIG_VERSION = 2;

// ---------------------------------------------------------------------------
// Environment defaults
// ---------------------------------------------------------------------------

/** VPS — used for production APK builds only */
const PRODUCTION_DEFAULT_CONFIG = {
  host: '147.93.108.205',
  port: '5005',
  protocol: 'http',
};

/**
 * Local backend on your PC (same as desktop app).
 * Physical phone: use PC LAN IP (NOT localhost).
 * Android emulator: set EXPO_PUBLIC_API_HOST=10.0.2.2
 */
const LOCAL_DEV_DEFAULT_CONFIG = {
  host: process.env.EXPO_PUBLIC_API_HOST || '10.8.128.217',
  port: process.env.EXPO_PUBLIC_API_PORT || '5000',
  protocol: 'http',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isLocalHost = (host) => {
  const h = String(host ?? '').toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '10.0.2.2';
};

const isRemoteVpsHost = (host) => {
  return String(host ?? '').trim() === '147.93.108.205';
};

const parseApiUrl = (url) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      protocol: parsed.protocol === 'https:' ? 'https' : 'http',
    };
  } catch (error) {
    console.warn('[serverConfig] Invalid EXPO_PUBLIC_API_URL:', url);
    return null;
  }
};

/**
 * Runtime default: local backend when running via npm/Expo Go (__DEV__).
 * VPS when building a release APK (production).
 */
export const getRuntimeDefaultConfig = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    const parsed = parseApiUrl(process.env.EXPO_PUBLIC_API_URL);
    if (parsed) return parsed;
  }

  if (process.env.EXPO_PUBLIC_USE_VPS === 'true') {
    return { ...PRODUCTION_DEFAULT_CONFIG };
  }

  // npm start / Expo Go = development → localhost backend on LAN
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return { ...LOCAL_DEV_DEFAULT_CONFIG };
  }

  return { ...PRODUCTION_DEFAULT_CONFIG };
};

const normalizeConfig = (config) => {
  if (!config || typeof config !== 'object') return null;
  const host = String(config.host ?? '').trim();
  const port = String(config.port ?? '').trim();
  const protocol = config.protocol === 'https' ? 'https' : 'http';
  if (!host || !port) return null;
  return { host, port, protocol };
};

/**
 * Call once at app startup. Clears stale VPS config when running in dev mode.
 */
export const initServerConfig = async () => {
  try {
    const runtimeDefault = getRuntimeDefaultConfig();
    const storedVersion = parseInt(
      (await AsyncStorage.getItem(CONFIG_VERSION_KEY)) ?? '0',
      10
    );

    if (storedVersion < CURRENT_CONFIG_VERSION) {
      await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
      await AsyncStorage.setItem(CONFIG_VERSION_KEY, String(CURRENT_CONFIG_VERSION));
      console.log('[serverConfig] Config reset (version upgrade).');
      return;
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const stored = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
      if (stored) {
        const parsed = normalizeConfig(JSON.parse(stored));
        // In dev, ignore saved VPS settings so npm start always hits local backend
        if (parsed && isRemoteVpsHost(parsed.host) && process.env.EXPO_PUBLIC_USE_VPS !== 'true') {
          await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
          console.log('[serverConfig] Removed stale VPS config for local dev.');
        }
      }
    }

    console.log(
      `[serverConfig] Mode: ${__DEV__ ? 'development' : 'production'}, ` +
        `API: ${runtimeDefault.protocol}://${runtimeDefault.host}:${runtimeDefault.port}/api`
    );
  } catch (error) {
    console.error('[serverConfig] init error:', error);
  }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const getDefaultServerUrl = () => {
  const cfg = getRuntimeDefaultConfig();
  return `${cfg.protocol}://${cfg.host}:${cfg.port}/api`;
};

export const getDefaultConfig = () => ({ ...getRuntimeDefaultConfig() });

export const getServerConfig = async () => {
  const runtimeDefault = getRuntimeDefaultConfig();

  try {
    const stored = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    if (stored) {
      const parsed = normalizeConfig(JSON.parse(stored));
      if (parsed) {
        // Dev mode: never use saved VPS unless explicitly forced
        if (
          typeof __DEV__ !== 'undefined' &&
          __DEV__ &&
          isRemoteVpsHost(parsed.host) &&
          process.env.EXPO_PUBLIC_USE_VPS !== 'true'
        ) {
          return runtimeDefault;
        }
        return parsed;
      }
    }
  } catch (error) {
    console.warn('⚠️ Error reading server config, using default:', error.message);
  }

  return runtimeDefault;
};

export const setServerConfig = async (config) => {
  try {
    const normalized = normalizeConfig(config);
    if (!normalized) {
      return { success: false, error: 'Invalid server configuration' };
    }
    await AsyncStorage.setItem(SERVER_CONFIG_KEY, JSON.stringify(normalized));
    return { success: true };
  } catch (error) {
    console.error('Error saving server config:', error);
    return { success: false, error: error.message };
  }
};

export const getServerUrl = async () => {
  const config = await getServerConfig();
  return `${config.protocol}://${config.host}:${config.port}/api`;
};

export const isServerConfigured = async () => {
  try {
    const stored = await AsyncStorage.getItem(SERVER_CONFIG_KEY);
    return stored !== null;
  } catch (error) {
    return false;
  }
};

export const resetServerConfig = async () => {
  try {
    await AsyncStorage.removeItem(SERVER_CONFIG_KEY);
    return { success: true };
  } catch (error) {
    console.error('Error resetting server config:', error);
    return { success: false, error: error.message };
  }
};

export const testServerConnection = async (host, port, protocol = 'http') => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${protocol}://${host}:${port}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { success: true, message: 'Connection successful', data };
    }

    return { success: false, message: `Server returned status ${response.status}` };
  } catch (error) {
    let message = 'Connection failed';
    if (error.name === 'AbortError') {
      message = 'Connection timeout - Server not responding';
    } else if (error.message?.includes('Network request failed')) {
      message =
        Platform.OS === 'android'
          ? 'Cannot reach server — use your PC LAN IP (ipconfig), same WiFi, backend running'
          : 'Cannot reach server — check IP and that backend is running';
    }

    return { success: false, message, error: error.message };
  } finally {
    clearTimeout(timeoutId);
  }
};

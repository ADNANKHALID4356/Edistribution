/**
 * Custom Logger Utility
 * Provides controlled logging that can be toggled in production
 */

const IS_DEV = __DEV__;

const logger = {
  /**
   * Log info messages (only in dev mode)
   */
  info: (...args) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  /**
   * Log debug messages (only in dev mode)
   */
  debug: (...args) => {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in dev mode)
   */
  warn: (...args) => {
    if (IS_DEV) {
      console.warn(...args);
    }
  },

  /**
   * Log errors silently - never shows red box to user
   * Errors are only logged to console in dev mode
   */
  error: (...args) => {
    if (IS_DEV) {
      console.log('[ERROR]', ...args); // Use console.log to avoid red box
    }
  },

  /**
   * Log critical errors that need user attention
   * These are silent but can be tracked by error monitoring services
   */
  critical: (error, context = '') => {
    if (IS_DEV) {
      console.error(`[CRITICAL] ${context}:`, error);
    }
    // In production, send to error monitoring service (e.g., Sentry)
    // Sentry.captureException(error, { tags: { context } });
  },
};

export default logger;

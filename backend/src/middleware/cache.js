/**
 * API Response Caching Middleware
 * Implements in-memory caching for API responses
 * 
 * Features:
 * - Configurable TTL (Time To Live)
 * - Cache invalidation by route patterns
 * - Memory-efficient LRU (Least Recently Used) eviction
 * - Selective caching based on HTTP methods and status codes
 */

class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access times for LRU
    this.maxSize = options.maxSize || 100; // Maximum cache entries
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes default
    this.enabled = options.enabled !== false;
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Generate cache key from request
   */
  generateKey(req) {
    const { method, originalUrl, query, user } = req;
    const userId = user?.id || 'anonymous';
    const queryString = JSON.stringify(query);
    return `${method}:${originalUrl}:${queryString}:${userId}`;
  }

  /**
   * Get cached response
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      return null;
    }

    // Update access time for LRU
    this.accessOrder.set(key, Date.now());
    
    return entry.data;
  }

  /**
   * Set cache entry
   */
  set(key, data, ttl = this.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry = {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidate(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessOrder.delete(key);
    });

    return keysToDelete.length;
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntryAge(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Calculate cache hit rate (simplified)
   */
  calculateHitRate() {
    // In production, you'd track hits and misses
    return 0;
  }

  /**
   * Get age of oldest entry
   */
  getOldestEntryAge() {
    let oldest = 0;
    const now = Date.now();

    for (const entry of this.cache.values()) {
      const age = now - entry.createdAt;
      if (age > oldest) {
        oldest = age;
      }
    }

    return oldest;
  }

  /**
   * Estimate memory usage (rough estimate)
   */
  estimateMemoryUsage() {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += JSON.stringify(entry.data).length;
    }
    return size;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this.cache.delete(key);
        this.accessOrder.delete(key);
      });

      if (keysToDelete.length > 0) {
        console.log(`🧹 Cache cleanup: Removed ${keysToDelete.length} expired entries`);
      }
    }, 60000); // Run every minute
  }
}

// Global cache manager instance
const cacheManager = new CacheManager({
  maxSize: 100,
  defaultTTL: 300000, // 5 minutes
  enabled: process.env.ENABLE_CACHE !== 'false'
});

/**
 * Cache middleware factory
 * @param {Object} options - Cache options
 * @param {Number} options.ttl - Time to live in milliseconds
 * @param {Array} options.excludePatterns - Patterns to exclude from caching
 * @param {Boolean} options.invalidateOnMutation - Auto-invalidate on POST/PUT/DELETE
 */
const cache = (options = {}) => {
  const {
    ttl = 300000, // 5 minutes
    excludePatterns = [],
    invalidateOnMutation = true
  } = options;

  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      // Invalidate related cache on mutations
      if (invalidateOnMutation && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const pattern = req.originalUrl.split('?')[0].replace(/\/\d+$/, '');
        const invalidated = cacheManager.invalidate(pattern);
        if (invalidated > 0) {
          console.log(`🗑️  Cache invalidated: ${invalidated} entries for ${pattern}`);
        }
      }
      return next();
    }

    // Check if route should be excluded
    const shouldExclude = excludePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(req.originalUrl);
    });

    if (shouldExclude) {
      return next();
    }

    // Generate cache key
    const cacheKey = cacheManager.generateKey(req);

    // Try to get from cache
    const cachedResponse = cacheManager.get(cacheKey);

    if (cachedResponse) {
      console.log(`✅ Cache HIT: ${req.originalUrl}`);
      return res.json(cachedResponse);
    }

    console.log(`❌ Cache MISS: ${req.originalUrl}`);

    // Capture original json function
    const originalJson = res.json.bind(res);

    // Override json function to cache the response
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheManager.set(cacheKey, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache manually
 */
const invalidateCache = (pattern) => {
  return cacheManager.invalidate(pattern);
};

/**
 * Clear all cache
 */
const clearCache = () => {
  cacheManager.clear();
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  return cacheManager.getStats();
};

module.exports = {
  cache,
  invalidateCache,
  clearCache,
  getCacheStats,
  cacheManager
};

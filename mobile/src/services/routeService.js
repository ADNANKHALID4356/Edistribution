/**
 * Route Service - Hybrid Mode (Online + Offline)
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Manage route data with online/offline support
 * - Online: Fetch from server, cache to SQLite
 * - Offline: Read from SQLite cache
 */

import api from './api';
import dbHelper from '../database/dbHelper';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class RouteService {
  constructor() {
    this.lastFetchTime = null;
    this.CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (routes change less frequently)
  }

  /**
   * Check if network is available
   */
  async isOnline() {
    try {
      const netInfo = await NetInfo.fetch();
      return netInfo.isConnected && netInfo.isInternetReachable;
    } catch (error) {
      console.log('Network check failed, assuming offline');
      return false;
    }
  }

  /**
   * Check if cache is still fresh
   */
  async isCacheFresh() {
    try {
      const lastFetch = await AsyncStorage.getItem('routes_last_fetch');
      if (!lastFetch) return false;
      
      const timeSinceLastFetch = Date.now() - parseInt(lastFetch);
      return timeSinceLastFetch < this.CACHE_DURATION;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all active routes (hybrid mode)
   */
  async getRoutes() {
    try {
      const online = await this.isOnline();
      const cacheFresh = await this.isCacheFresh();

      // Try to fetch from server if online and cache is stale
      if (online && !cacheFresh) {
        try {
          console.log('🌐 Fetching routes from server...');
          const response = await api.get('/shared/routes/active', {
            timeout: 5000
          });

          if (response.data.success && response.data.data) {
            const routes = response.data.data;
            console.log(`✅ Fetched ${routes.length} routes from server`);

            // Cache to SQLite in background
            this.cacheRoutes(routes).catch(err => 
              console.log('⚠️ Failed to cache routes:', err.message)
            );

            // Update last fetch time
            await AsyncStorage.setItem('routes_last_fetch', Date.now().toString());

            return routes;
          }
        } catch (serverError) {
          console.log('⚠️ Server fetch failed, falling back to cache:', serverError.message);
        }
      }

      // Fallback to SQLite cache
      console.log('📂 Reading routes from SQLite cache...');
      const cachedRoutes = await dbHelper.getAllRoutes();
      console.log(`✅ Loaded ${cachedRoutes.length} routes from cache`);
      return cachedRoutes;

    } catch (error) {
      console.error('❌ Error getting routes:', error);
      return [];
    }
  }

  /**
   * Get route by ID
   */
  async getRouteById(routeId) {
    try {
      const online = await this.isOnline();

      if (online) {
        try {
          console.log(`🌐 Fetching route ${routeId} from server...`);
          const response = await api.get(`/shared/routes/${routeId}`, {
            timeout: 5000
          });

          if (response.data.success && response.data.data) {
            return response.data.data;
          }
        } catch (serverError) {
          console.log('⚠️ Server fetch failed, falling back to cache');
        }
      }

      // Fallback to SQLite
      console.log('📂 Reading route from SQLite cache...');
      return await dbHelper.getRouteById(routeId);
    } catch (error) {
      console.error('❌ Error getting route by ID:', error);
      return null;
    }
  }

  /**
   * Cache routes to SQLite (background operation)
   */
  async cacheRoutes(routes) {
    try {
      console.log('💾 Caching routes to SQLite...');
      
      // Clear old data
      await dbHelper.clearRoutes();
      
      // Insert fresh data
      const result = await dbHelper.upsertRoutes(routes);
      console.log(`✅ Cached ${result.inserted + result.updated} routes to SQLite`);
      
      return true;
    } catch (error) {
      console.error('❌ Error caching routes:', error);
      throw error;
    }
  }

  /**
   * Force refresh from server
   */
  async forceRefresh() {
    try {
      const online = await this.isOnline();
      
      if (!online) {
        return {
          success: false,
          message: 'No internet connection. Showing cached data.',
          fromCache: true
        };
      }

      console.log('🔄 Force refreshing routes from server...');
      const response = await api.get('/shared/routes/active', {
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        const routes = response.data.data;
        
        // Cache to SQLite
        await this.cacheRoutes(routes);
        
        // Update last fetch time
        await AsyncStorage.setItem('routes_last_fetch', Date.now().toString());

        return {
          success: true,
          count: routes.length,
          message: `Synced ${routes.length} routes from server`
        };
      }

      return {
        success: false,
        message: 'Failed to refresh routes from server'
      };
    } catch (error) {
      console.error('❌ Force refresh error:', error);
      return {
        success: false,
        message: error.message || 'Failed to refresh routes',
        error: error
      };
    }
  }

  /**
   * Clear cache
   */
  async clearCache() {
    try {
      await dbHelper.clearRoutes();
      await AsyncStorage.removeItem('routes_last_fetch');
      console.log('✅ Route cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }
}

export default new RouteService();

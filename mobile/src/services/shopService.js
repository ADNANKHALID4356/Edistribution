/**
 * Shop Service - Hybrid Mode (Online + Offline)
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Manage shop data with online/offline support
 * - Online: Fetch from server, cache to SQLite
 * - Offline: Read from SQLite cache
 */

import api from './api';
import dbHelper from '../database/dbHelper';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ShopService {
  constructor() {
    this.lastFetchTime = null;
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
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
      const lastFetch = await AsyncStorage.getItem('shops_last_fetch');
      if (!lastFetch) return false;
      
      const timeSinceLastFetch = Date.now() - parseInt(lastFetch);
      return timeSinceLastFetch < this.CACHE_DURATION;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all active shops (hybrid mode)
   * - Try server first if online and cache is stale
   * - Fall back to SQLite cache
   * - Update SQLite cache when fetching from server
   */
  async getShops(filters = {}) {
    try {
      const online = await this.isOnline();
      const cacheFresh = await this.isCacheFresh();

      // Try to fetch from server if online and cache is stale
      if (online && !cacheFresh) {
        try {
          console.log('🌐 Fetching shops from server...');
          const response = await api.get('/shared/shops', {
            params: { limit: 1000 },
            timeout: 5000 // 5 second timeout
          });

          if (response.data.success && response.data.data) {
            const shops = response.data.data;
            console.log(`✅ Fetched ${shops.length} shops from server`);

            // Cache to SQLite in background (don't wait)
            this.cacheShops(shops).catch(err => 
              console.log('⚠️ Failed to cache shops:', err.message)
            );

            // Update last fetch time
            await AsyncStorage.setItem('shops_last_fetch', Date.now().toString());

            // Apply filters
            return this.applyFilters(shops, filters);
          }
        } catch (serverError) {
          console.log('⚠️ Server fetch failed, falling back to cache:', serverError.message);
        }
      }

      // Fallback to SQLite cache (offline or server failed)
      console.log('📂 Reading shops from SQLite cache...');
      const cachedShops = await dbHelper.getAllShops(filters);
      console.log(`✅ Loaded ${cachedShops.length} shops from cache`);
      return cachedShops;

    } catch (error) {
      console.error('❌ Error getting shops:', error);
      // Last resort: return empty array
      return [];
    }
  }

  /**
   * Get shops by route ID
   */
  async getShopsByRoute(routeId) {
    try {
      const online = await this.isOnline();

      if (online) {
        try {
          console.log(`🌐 Fetching shops for route ${routeId} from server...`);
          const response = await api.get(`/shared/shops/by-route/${routeId}`, {
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
      console.log('📂 Reading shops from SQLite cache...');
      return await dbHelper.getShopsByRoute(routeId);
    } catch (error) {
      console.error('❌ Error getting shops by route:', error);
      return [];
    }
  }

  /**
   * Get shop by ID
   */
  async getShopById(shopId) {
    try {
      const online = await this.isOnline();

      if (online) {
        try {
          console.log(`🌐 Fetching shop ${shopId} from server...`);
          const response = await api.get(`/shared/shops/${shopId}`, {
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
      console.log('📂 Reading shop from SQLite cache...');
      return await dbHelper.getShopById(shopId);
    } catch (error) {
      console.error('❌ Error getting shop by ID:', error);
      return null;
    }
  }

  /**
   * Get shops count
   */
  async getShopsCount(routeId = null) {
    try {
      // Always read count from SQLite (fast)
      return await dbHelper.getShopsCount(routeId);
    } catch (error) {
      console.error('❌ Error getting shops count:', error);
      return 0;
    }
  }

  /**
   * Cache shops to SQLite (background operation)
   */
  async cacheShops(shops) {
    try {
      console.log('💾 Caching shops to SQLite...');
      
      // Clear old data
      await dbHelper.clearShops();
      
      // Insert fresh data
      const result = await dbHelper.upsertShops(shops);
      console.log(`✅ Cached ${result.inserted + result.updated} shops to SQLite`);
      
      return true;
    } catch (error) {
      console.error('❌ Error caching shops:', error);
      throw error;
    }
  }

  /**
   * Apply filters to shops array
   */
  applyFilters(shops, filters = {}) {
    let filtered = [...shops];

    // Filter by active status
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(shop => shop.is_active === (filters.isActive ? 1 : 0));
    } else {
      // Default: only active shops
      filtered = filtered.filter(shop => shop.is_active === 1);
    }

    // Filter by route
    if (filters.routeId) {
      filtered = filtered.filter(shop => shop.route_id === parseInt(filters.routeId));
    }

    // Filter by city
    if (filters.city) {
      filtered = filtered.filter(shop => 
        shop.city && shop.city.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(shop =>
        shop.shop_name?.toLowerCase().includes(searchLower) ||
        shop.owner_name?.toLowerCase().includes(searchLower) ||
        shop.phone?.includes(filters.search) ||
        shop.shop_code?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Force refresh from server (for pull-to-refresh)
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

      console.log('🔄 Force refreshing shops from server...');
      const response = await api.get('/shared/shops', {
        params: { limit: 1000 },
        timeout: 10000
      });

      if (response.data.success && response.data.data) {
        const shops = response.data.data;
        
        // Cache to SQLite
        await this.cacheShops(shops);
        
        // Update last fetch time
        await AsyncStorage.setItem('shops_last_fetch', Date.now().toString());

        return {
          success: true,
          count: shops.length,
          message: `Synced ${shops.length} shops from server`
        };
      }

      return {
        success: false,
        message: 'Failed to refresh shops from server'
      };
    } catch (error) {
      console.error('❌ Force refresh error:', error);
      return {
        success: false,
        message: error.message || 'Failed to refresh shops',
        error: error
      };
    }
  }

  /**
   * Clear cache (for troubleshooting)
   */
  async clearCache() {
    try {
      await dbHelper.clearShops();
      await AsyncStorage.removeItem('shops_last_fetch');
      console.log('✅ Shop cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      return false;
    }
  }
}

export default new ShopService();

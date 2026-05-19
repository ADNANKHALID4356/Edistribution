/**
 * Sync Service - Data Synchronization
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Sync data from backend API to local SQLite database
 * Used by: React Native Mobile Application
 */

import api from './api';
import dbHelper from '../database/dbHelper';
import { TABLES, SYNC_STATUS } from '../database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sprint 9: Retry configuration with exponential backoff
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_FACTOR: 2, // Exponential: 1s, 2s, 4s, 8s (capped at 10s)
};

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = [];
    this.retryQueue = []; // Sprint 9: Queue for failed syncs
  }

  /**
   * Add sync status listener
   */
  addListener(listener) {
    this.syncListeners.push(listener);
  }

  /**
   * Remove sync status listener
   */
  removeListener(listener) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(status) {
    this.syncListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  /**
   * Check if sync is needed (check last sync time)
   */
  async shouldSync(tableName) {
    try {
      const metadata = await dbHelper.getSyncMetadata(tableName);
      
      if (!metadata || !metadata.last_sync_at) {
        return true; // Never synced
      }

      // Sync if last sync was more than 1 hour ago
      const lastSync = new Date(metadata.last_sync_at);
      const now = new Date();
      const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

      return hoursSinceSync >= 1;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return true; // Sync on error
    }
  }

  /**
   * Sync products from API to SQLite
   */
  async syncProducts(force = false) {
    try {
      console.log('🔄 Starting products sync...');

      if (!force) {
        const needsSync = await this.shouldSync(TABLES.PRODUCTS);
        if (!needsSync) {
          console.log('⏭️  Products sync skipped (synced recently)');
          return { success: true, message: 'Products already synced recently', skipped: true };
        }
      }

      // Update sync status to in_progress
      await dbHelper.updateSyncMetadata(
        TABLES.PRODUCTS,
        SYNC_STATUS.IN_PROGRESS,
        0,
        0
      );

      this.notifyListeners({
        table: TABLES.PRODUCTS,
        status: SYNC_STATUS.IN_PROGRESS,
        progress: 0,
      });

      // Fetch products from API
      const response = await api.get('/shared/products/active');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch products');
      }

      const products = response.data.data || [];
      console.log(`📦 Fetched ${products.length} products from API`);

      // CRITICAL: Clear old products before syncing to handle deletions
      // This ensures SQLite exactly matches backend (active products only)
      console.log('🗑️  Clearing old products from SQLite...');
      await dbHelper.clearProducts();
      console.log('✅ Old products cleared');

      // Insert fresh products to SQLite
      const inserted = await dbHelper.upsertProducts(products);
      console.log(`✅ Inserted ${inserted} fresh products`);

      // Update sync metadata
      await dbHelper.updateSyncMetadata(
        TABLES.PRODUCTS,
        SYNC_STATUS.COMPLETED,
        products.length,
        inserted
      );

      // Store last sync timestamp in AsyncStorage
      await AsyncStorage.setItem(
        'last_products_sync',
        new Date().toISOString()
      );

      this.notifyListeners({
        table: TABLES.PRODUCTS,
        status: SYNC_STATUS.COMPLETED,
        progress: 100,
        total: products.length,
        synced: inserted,
      });

      console.log('✅ Products sync completed');
      return {
        success: true,
        total: products.length,
        synced: inserted,
        message: `Synced ${inserted} products`,
      };
    } catch (error) {
      console.error('❌ Products sync failed:', error);

      // Update sync metadata with error
      await dbHelper.updateSyncMetadata(
        TABLES.PRODUCTS,
        SYNC_STATUS.FAILED,
        0,
        0,
        error.message
      );

      this.notifyListeners({
        table: TABLES.PRODUCTS,
        status: SYNC_STATUS.FAILED,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Products sync failed',
      };
    }
  }

  /**
   * Sync suppliers from API to SQLite
   */
  async syncSuppliers(force = false) {
    try {
      console.log('🔄 Starting suppliers sync...');

      if (!force) {
        const needsSync = await this.shouldSync(TABLES.SUPPLIERS);
        if (!needsSync) {
          console.log('⏭️  Suppliers sync skipped (synced recently)');
          return { success: true, message: 'Suppliers already synced recently', skipped: true };
        }
      }

      // Update sync status
      await dbHelper.updateSyncMetadata(
        TABLES.SUPPLIERS,
        SYNC_STATUS.IN_PROGRESS,
        0,
        0
      );

      this.notifyListeners({
        table: TABLES.SUPPLIERS,
        status: SYNC_STATUS.IN_PROGRESS,
        progress: 0,
      });

      // Fetch suppliers from API
      const response = await api.get('/shared/suppliers/active');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch suppliers');
      }

      const suppliers = response.data.data || [];
      console.log(`🏢 Fetched ${suppliers.length} suppliers from API`);

      // Upsert suppliers to SQLite
      const inserted = await dbHelper.upsertSuppliers(suppliers);

      // Update sync metadata
      await dbHelper.updateSyncMetadata(
        TABLES.SUPPLIERS,
        SYNC_STATUS.COMPLETED,
        suppliers.length,
        inserted
      );

      // Store last sync timestamp
      await AsyncStorage.setItem(
        'last_suppliers_sync',
        new Date().toISOString()
      );

      this.notifyListeners({
        table: TABLES.SUPPLIERS,
        status: SYNC_STATUS.COMPLETED,
        progress: 100,
        total: suppliers.length,
        synced: inserted,
      });

      console.log('✅ Suppliers sync completed');
      return {
        success: true,
        total: suppliers.length,
        synced: inserted,
        message: `Synced ${inserted} suppliers`,
      };
    } catch (error) {
      console.error('❌ Suppliers sync failed:', error);

      // Update sync metadata with error
      await dbHelper.updateSyncMetadata(
        TABLES.SUPPLIERS,
        SYNC_STATUS.FAILED,
        0,
        0,
        error.message
      );

      this.notifyListeners({
        table: TABLES.SUPPLIERS,
        status: SYNC_STATUS.FAILED,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Suppliers sync failed',
      };
    }
  }

  /**
   * Sync routes from API to SQLite
   */
  async syncRoutes(force = false) {
    try {
      console.log('🔄 Starting routes sync...');

      if (!force) {
        const needsSync = await this.shouldSync(TABLES.ROUTES);
        if (!needsSync) {
          console.log('⏭️  Routes sync skipped (synced recently)');
          return { success: true, message: 'Routes already synced recently', skipped: true };
        }
      }

      // Update sync status to in_progress
      await dbHelper.updateSyncMetadata(
        TABLES.ROUTES,
        SYNC_STATUS.IN_PROGRESS,
        0,
        0
      );

      this.notifyListeners({
        table: TABLES.ROUTES,
        status: SYNC_STATUS.IN_PROGRESS,
        progress: 0,
      });

      // Fetch routes from API
      const response = await api.get('/shared/routes/active');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch routes');
      }

      const routes = response.data.data || [];
      console.log(`🗺️  Fetched ${routes.length} routes from API`);

      // CRITICAL: Clear old routes before syncing to handle deletions
      console.log('🗑️  Clearing old routes from SQLite...');
      await dbHelper.clearRoutes();
      console.log('✅ Old routes cleared');

      // Upsert routes to SQLite
      const result = await dbHelper.upsertRoutes(routes);

      // Update sync metadata
      await dbHelper.updateSyncMetadata(
        TABLES.ROUTES,
        SYNC_STATUS.COMPLETED,
        routes.length,
        result.inserted + result.updated
      );

      // Store last sync timestamp in AsyncStorage
      await AsyncStorage.setItem(
        'last_routes_sync',
        new Date().toISOString()
      );

      this.notifyListeners({
        table: TABLES.ROUTES,
        status: SYNC_STATUS.COMPLETED,
        progress: 100,
        total: routes.length,
        synced: result.inserted + result.updated,
      });

      console.log('✅ Routes sync completed');
      return {
        success: true,
        total: routes.length,
        synced: result.inserted + result.updated,
        message: `Synced ${routes.length} routes`,
      };
    } catch (error) {
      console.error('❌ Routes sync failed:', error);

      // Update sync metadata with error
      await dbHelper.updateSyncMetadata(
        TABLES.ROUTES,
        SYNC_STATUS.FAILED,
        0,
        0,
        error.message
      );

      this.notifyListeners({
        table: TABLES.ROUTES,
        status: SYNC_STATUS.FAILED,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Routes sync failed',
      };
    }
  }

  /**
   * Sync shops from API to SQLite
   */
  async syncShops(force = false) {
    try {
      console.log('🔄 Starting shops sync...');

      if (!force) {
        const needsSync = await this.shouldSync(TABLES.SHOPS);
        if (!needsSync) {
          console.log('⏭️  Shops sync skipped (synced recently)');
          return { success: true, message: 'Shops already synced recently', skipped: true };
        }
      }

      // Update sync status to in_progress
      await dbHelper.updateSyncMetadata(
        TABLES.SHOPS,
        SYNC_STATUS.IN_PROGRESS,
        0,
        0
      );

      this.notifyListeners({
        table: TABLES.SHOPS,
        status: SYNC_STATUS.IN_PROGRESS,
        progress: 0,
      });

      // Fetch shops from API
      const response = await api.get('/shared/shops', {
        params: { limit: 1000 } // Get all shops
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch shops');
      }

      const shops = response.data.data || [];
      console.log(`🏪 Fetched ${shops.length} shops from API`);

      // CRITICAL: Clear old shops before syncing to handle deletions
      console.log('🗑️  Clearing old shops from SQLite...');
      await dbHelper.clearShops();
      console.log('✅ Old shops cleared');

      // Enrich shops with route names
      const routes = await dbHelper.getAllRoutes();
      const routeMap = {};
      routes.forEach(route => {
        routeMap[route.id] = route.route_name;
      });

      shops.forEach(shop => {
        if (shop.route_id && routeMap[shop.route_id]) {
          shop.route_name = routeMap[shop.route_id];
        }
      });

      // Upsert shops to SQLite
      const result = await dbHelper.upsertShops(shops);

      // Update sync metadata
      await dbHelper.updateSyncMetadata(
        TABLES.SHOPS,
        SYNC_STATUS.COMPLETED,
        shops.length,
        result.inserted + result.updated
      );

      // Store last sync timestamp in AsyncStorage
      await AsyncStorage.setItem(
        'last_shops_sync',
        new Date().toISOString()
      );

      this.notifyListeners({
        table: TABLES.SHOPS,
        status: SYNC_STATUS.COMPLETED,
        progress: 100,
        total: shops.length,
        synced: result.inserted + result.updated,
      });

      console.log('✅ Shops sync completed');
      return {
        success: true,
        total: shops.length,
        synced: result.inserted + result.updated,
        message: `Synced ${shops.length} shops`,
      };
    } catch (error) {
      console.error('❌ Shops sync failed:', error);

      // Update sync metadata with error
      await dbHelper.updateSyncMetadata(
        TABLES.SHOPS,
        SYNC_STATUS.FAILED,
        0,
        0,
        error.message
      );

      this.notifyListeners({
        table: TABLES.SHOPS,
        status: SYNC_STATUS.FAILED,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Shops sync failed',
      };
    }
  }

  /**
   * Sync salesmen from API to SQLite
   * Sprint 4: Salesman Management
   */
  async syncSalesmen(force = false) {
    try {
      console.log('🔄 Starting salesmen sync...');

      if (!force) {
        const needsSync = await this.shouldSync(TABLES.SALESMEN);
        if (!needsSync) {
          console.log('⏭️  Salesmen sync skipped (synced recently)');
          return { success: true, message: 'Salesmen already synced recently', skipped: true };
        }
      }

      // Update sync status to in_progress
      await dbHelper.updateSyncMetadata(
        TABLES.SALESMEN,
        SYNC_STATUS.IN_PROGRESS,
        0,
        0
      );

      this.notifyListeners({
        table: TABLES.SALESMEN,
        status: SYNC_STATUS.IN_PROGRESS,
        progress: 0,
      });

      // Fetch salesmen from API
      const response = await api.get('/shared/salesmen', {
        params: { limit: 1000 } // Get all salesmen
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch salesmen');
      }

      const salesmen = response.data.data || [];
      console.log(`👨‍💼 Fetched ${salesmen.length} salesmen from API`);

      // Enrich salesmen with route names
      const routes = await dbHelper.getAllRoutes();
      const routeMap = {};
      routes.forEach(route => {
        routeMap[route.id] = route.route_name;
      });

      salesmen.forEach(salesman => {
        if (salesman.route_id && routeMap[salesman.route_id]) {
          salesman.route_name = routeMap[salesman.route_id];
        }
      });

      // Upsert salesmen to SQLite
      const syncedCount = await dbHelper.upsertSalesmen(salesmen);

      // Update sync metadata
      await dbHelper.updateSyncMetadata(
        TABLES.SALESMEN,
        SYNC_STATUS.COMPLETED,
        salesmen.length,
        syncedCount
      );

      // Store last sync timestamp in AsyncStorage
      await AsyncStorage.setItem(
        'last_salesmen_sync',
        new Date().toISOString()
      );

      this.notifyListeners({
        table: TABLES.SALESMEN,
        status: SYNC_STATUS.COMPLETED,
        progress: 100,
        total: salesmen.length,
        synced: syncedCount,
      });

      console.log('✅ Salesmen sync completed');
      return {
        success: true,
        total: salesmen.length,
        synced: syncedCount,
        message: `Synced ${salesmen.length} salesmen`,
      };
    } catch (error) {
      console.error('❌ Salesmen sync failed:', error);

      // Update sync metadata with error
      await dbHelper.updateSyncMetadata(
        TABLES.SALESMEN,
        SYNC_STATUS.FAILED,
        0,
        0,
        error.message
      );

      this.notifyListeners({
        table: TABLES.SALESMEN,
        status: SYNC_STATUS.FAILED,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Salesmen sync failed',
      };
    }
  }

  /**
   * Sprint 9: Upload orders to backend (sync orders from mobile to server)
   * Batch processing with max 50 orders per request
   */
  async syncOrders(salesmanId, deviceInfo = {}) {
    try {
      console.log('🔄 Starting orders upload (sync to backend)...');
      console.log('🔍 Salesman ID:', salesmanId);

      // CRITICAL: Validate salesmanId is provided
      if (!salesmanId) {
        console.error('❌ salesmanId is required for syncOrders');
        return {
          success: false,
          error: 'salesmanId is required',
          total: 0,
          synced: 0,
          failed: 0
        };
      }

      // Get all unsynced orders from SQLite (filtered by salesmanId)
      const unsyncedOrders = await dbHelper.getUnsyncedOrders(salesmanId);
      
      if (!unsyncedOrders || unsyncedOrders.length === 0) {
        console.log('✅ No orders to sync');
        return {
          success: true,
          message: 'No orders to sync',
          total: 0,
          synced: 0,
        };
      }

      console.log(`📦 Found ${unsyncedOrders.length} unsynced orders`);

      // Prepare device info
      const device = {
        device_id: deviceInfo.deviceId || 'unknown',
        os: deviceInfo.os || 'unknown',
        app_version: deviceInfo.appVersion || '1.0.0',
      };

      // Process orders in batches of 50
      const BATCH_SIZE = 50;
      let totalSynced = 0;
      let totalFailed = 0;
      const errors = [];

      for (let i = 0; i < unsyncedOrders.length; i += BATCH_SIZE) {
        const batch = unsyncedOrders.slice(i, i + BATCH_SIZE);
        console.log(`📤 Uploading batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} orders)...`);

        // Format orders for backend API
        const formattedOrders = await Promise.all(
          batch.map(async (order) => {
            // Get order details (items)
            const items = await dbHelper.getOrderDetails(order.id);
            
            return {
              mobile_order_id: order.order_number, // Use order_number as mobile_order_id
              shop_id: order.shop_id,
              route_id: order.route_id,
              order_date: order.order_date,
              total_amount: order.subtotal || order.total_amount,
              discount: order.discount_amount || 0,
              net_amount: order.total_amount,
              notes: order.notes || '',
              items: items.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                discount: item.discount_amount || 0,
                net_price: item.total_price - (item.discount_amount || 0),
              })),
            };
          })
        );

        // Upload batch to backend
        try {
          console.log(`🌐 Sending ${formattedOrders.length} orders to backend...`);
          console.log(`🌐 Endpoint: POST /mobile/sync/orders`);
          console.log(`🌐 Salesman ID: ${salesmanId}`);
          
          const response = await api.post('/mobile/sync/orders', {
            salesman_id: salesmanId,
            device_info: device,
            orders: formattedOrders,
          });

          console.log(`📡 Response received:`, response.data);

          if (response.data.success) {
            const { results } = response.data;
            const syncedOrders = results?.synced_orders || [];
            
            console.log(`🔍 Batch response: ${results.success}/${results.total} synced`);
            console.log(`🔍 Synced orders array:`, JSON.stringify(syncedOrders, null, 2));
            
            // Update synced orders in SQLite
            for (let j = 0; j < batch.length; j++) {
              const order = batch[j];
              const orderData = formattedOrders[j];
              
              // Check if this order was successfully synced
              const error = results.errors?.find(e => e.mobile_order_id === orderData.mobile_order_id);
              
              if (!error) {
                // Find the backend_id from synced_orders response
                const syncedOrder = syncedOrders.find(s => s.mobile_order_id === orderData.mobile_order_id);
                const backendId = syncedOrder?.backend_id || null;
                
                // Successfully synced - mark with backend_id
                console.log(`✅ Marking order ${order.id} (${order.order_number}) as synced. Backend ID: ${backendId}`);
                await dbHelper.markOrderAsSynced(order.id, backendId);
                totalSynced++;
              } else {
                // Sync failed for this order
                await dbHelper.updateOrderSyncError(order.id, error.error);
                totalFailed++;
                errors.push(error);
              }
            }

            console.log(`✅ Batch uploaded: ${results.success}/${results.total} succeeded`);
          } else {
            // Entire batch failed
            console.error(`❌ Batch upload failed: ${response.data.message}`);
            batch.forEach(order => errors.push({ 
              mobile_order_id: order.order_number, 
              error: response.data.message 
            }));
            totalFailed += batch.length;
          }
        } catch (batchError) {
          console.error(`❌ Batch upload error:`, batchError);
          console.error(`❌ Error details:`, {
            message: batchError.message,
            response: batchError.response?.data,
            status: batchError.response?.status,
            config: {
              url: batchError.config?.url,
              baseURL: batchError.config?.baseURL,
              method: batchError.config?.method,
            }
          });
          
          // Mark all orders in batch as failed
          for (const order of batch) {
            const errorMessage = batchError.response?.data?.message || batchError.message;
            await dbHelper.updateOrderSyncError(order.id, errorMessage);
            errors.push({ 
              mobile_order_id: order.order_number, 
              error: errorMessage
            });
          }
          totalFailed += batch.length;
        }
      }

      // Store last sync timestamp
      await AsyncStorage.setItem(
        'last_orders_sync',
        new Date().toISOString()
      );

      // Sprint 9: Add failed orders to retry queue
      if (totalFailed > 0 && errors.length > 0) {
        const failedOrderIds = errors.map(e => {
          const order = unsyncedOrders.find(o => o.order_number === e.mobile_order_id);
          return order?.id;
        }).filter(id => id !== undefined);

        if (failedOrderIds.length > 0) {
          await this.addToRetryQueue(
            failedOrderIds,
            `Sync failed: ${errors[0]?.error || 'Unknown error'}`,
            salesmanId
          );
        }
      }

      // Notify listeners
      this.notifyListeners({
        table: 'orders',
        status: totalFailed === 0 ? SYNC_STATUS.COMPLETED : SYNC_STATUS.FAILED,
        progress: 100,
        total: unsyncedOrders.length,
        synced: totalSynced,
        failed: totalFailed,
      });

      console.log(`✅ Orders sync completed: ${totalSynced} synced, ${totalFailed} failed`);

      return {
        success: totalFailed === 0,
        total: unsyncedOrders.length,
        synced: totalSynced,
        failed: totalFailed,
        errors: errors.length > 0 ? errors : undefined,
        message: `Synced ${totalSynced}/${unsyncedOrders.length} orders`,
      };
    } catch (error) {
      console.error('❌ Orders sync failed:', error);

      this.notifyListeners({
        table: 'orders',
        status: SYNC_STATUS.FAILED,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Orders sync failed',
        total: 0,
        synced: 0,
        failed: 0,
      };
    }
  }

  /**
   * Sync all data (products, suppliers, routes, shops)
   */
  async syncAll(force = false) {
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress');
      return { success: false, message: 'Sync already in progress' };
    }

    try {
      this.isSyncing = true;
      console.log('🔄 Starting full data sync...');

      const results = {
        products: await this.syncProducts(force),
        suppliers: await this.syncSuppliers(force),
        routes: await this.syncRoutes(force),
        shops: await this.syncShops(force),
        salesmen: await this.syncSalesmen(force), // Sprint 4
      };

      const allSuccess = results.products.success && 
                        results.suppliers.success &&
                        results.routes.success &&
                        results.shops.success &&
                        results.salesmen.success; // Sprint 4
      
      if (allSuccess) {
        // Store last full sync timestamp
        await AsyncStorage.setItem(
          'last_full_sync',
          new Date().toISOString()
        );
        console.log('✅ Full sync completed successfully');
      } else {
        console.log('⚠️  Full sync completed with errors');
        console.log('📊 Sync Results:');
        console.log('   Products:', results.products.success ? '✅' : '❌', results.products.error || results.products.message);
        console.log('   Suppliers:', results.suppliers.success ? '✅' : '❌', results.suppliers.error || results.suppliers.message);
        console.log('   Routes:', results.routes.success ? '✅' : '❌', results.routes.error || results.routes.message);
        console.log('   Shops:', results.shops.success ? '✅' : '❌', results.shops.error || results.shops.message);
        console.log('   Salesmen:', results.salesmen.success ? '✅' : '❌', results.salesmen.error || results.salesmen.message);
      }

      return {
        success: allSuccess,
        results,
        message: allSuccess ? 'All data synced successfully' : 'Sync completed with some errors',
      };
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      return {
        success: false,
        error: error.message || 'Full sync failed',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get last sync timestamp for a table
   */
  async getLastSyncTime(tableName) {
    try {
      const metadata = await dbHelper.getSyncMetadata(tableName);
      return metadata?.last_sync_at || null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Get sync status for all tables
   */
  async getSyncStatus() {
    try {
      const metadata = await dbHelper.getAllSyncMetadata();
      const stats = await dbHelper.getStats();

      return {
        metadata,
        stats,
        isSyncing: this.isSyncing,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        metadata: [],
        stats: {},
        isSyncing: false,
      };
    }
  }

  /**
   * Clear all local data and reset sync
   */
  async clearAllData() {
    try {
      console.log('🗑️  Clearing all local data...');
      
      await dbHelper.clearAllProducts();
      await dbHelper.clearTable(TABLES.SUPPLIERS);
      await dbHelper.clearTable(TABLES.ROUTES);
      await dbHelper.clearTable(TABLES.SHOPS);
      
      await AsyncStorage.removeItem('last_products_sync');
      await AsyncStorage.removeItem('last_suppliers_sync');
      await AsyncStorage.removeItem('last_routes_sync');
      await AsyncStorage.removeItem('last_shops_sync');
      await AsyncStorage.removeItem('last_full_sync');

      console.log('✅ All local data cleared');
      return { success: true, message: 'All local data cleared' };
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format last sync time for display
   */
  formatSyncTime(timestamp) {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  // ============================================
  // SPRINT 9: RETRY LOGIC WITH EXPONENTIAL BACKOFF
  // ============================================

  /**
   * Add failed sync to retry queue
   */
  async addToRetryQueue(orderIds, reason, salesmanId) {
    try {
      const retryItem = {
        id: Date.now().toString(),
        orderIds,
        salesmanId,
        reason,
        attempts: 0,
        maxAttempts: RETRY_CONFIG.MAX_RETRIES,
        timestamp: new Date().toISOString(),
        nextRetryAt: new Date(Date.now() + RETRY_CONFIG.INITIAL_DELAY).toISOString(),
      };

      this.retryQueue.push(retryItem);
      
      // Persist retry queue to AsyncStorage
      await AsyncStorage.setItem('sync_retry_queue', JSON.stringify(this.retryQueue));
      
      console.log(`📝 Added to retry queue: ${orderIds.length} orders (reason: ${reason})`);
      return retryItem;
    } catch (error) {
      console.error('Error adding to retry queue:', error);
      return null;
    }
  }

  /**
   * Load retry queue from storage
   */
  async loadRetryQueue() {
    try {
      const queueStr = await AsyncStorage.getItem('sync_retry_queue');
      if (queueStr) {
        this.retryQueue = JSON.parse(queueStr);
        console.log(`📥 Loaded ${this.retryQueue.length} items from retry queue`);
      }
    } catch (error) {
      console.error('Error loading retry queue:', error);
      this.retryQueue = [];
    }
  }

  /**
   * Save retry queue to storage
   */
  async saveRetryQueue() {
    try {
      await AsyncStorage.setItem('sync_retry_queue', JSON.stringify(this.retryQueue));
    } catch (error) {
      console.error('Error saving retry queue:', error);
    }
  }

  /**
   * Calculate delay with exponential backoff
   */
  calculateRetryDelay(attempts) {
    const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, attempts);
    return Math.min(delay, RETRY_CONFIG.MAX_DELAY);
  }

  /**
   * Retry failed syncs with exponential backoff
   */
  async retryFailedSyncs() {
    await this.loadRetryQueue();

    if (this.retryQueue.length === 0) {
      console.log('✅ No failed syncs to retry');
      return { success: true, succeeded: 0, failed: 0, skipped: 0 };
    }

    console.log(`🔄 Retrying ${this.retryQueue.length} failed syncs...`);

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const now = new Date();

    // Process each retry item
    for (let i = this.retryQueue.length - 1; i >= 0; i--) {
      const item = this.retryQueue[i];
      const nextRetry = new Date(item.nextRetryAt);

      // Check if it's time to retry
      if (now < nextRetry) {
        console.log(`⏳ Skipping retry (next attempt at ${nextRetry.toLocaleTimeString()})`);
        skipped++;
        continue;
      }

      // Check if max attempts reached
      if (item.attempts >= item.maxAttempts) {
        console.log(`❌ Max retry attempts reached for ${item.orderIds.length} orders`);
        this.retryQueue.splice(i, 1); // Remove from queue
        failed++;
        continue;
      }

      try {
        console.log(`🔄 Retry attempt ${item.attempts + 1}/${item.maxAttempts} for ${item.orderIds.length} orders`);

        // Attempt to sync these specific orders
        const result = await this.syncOrdersByIds(item.orderIds, item.salesmanId);

        if (result.success) {
          console.log(`✅ Retry succeeded for ${item.orderIds.length} orders`);
          this.retryQueue.splice(i, 1); // Remove from queue
          succeeded++;
        } else {
          // Retry failed, increment attempts
          item.attempts++;
          const delay = this.calculateRetryDelay(item.attempts);
          item.nextRetryAt = new Date(Date.now() + delay).toISOString();
          
          console.log(`⏰ Retry failed, next attempt in ${delay}ms (attempt ${item.attempts}/${item.maxAttempts})`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Retry error:`, error);
        item.attempts++;
        const delay = this.calculateRetryDelay(item.attempts);
        item.nextRetryAt = new Date(Date.now() + delay).toISOString();
        failed++;
      }
    }

    // Save updated retry queue
    await this.saveRetryQueue();

    console.log(`✅ Retry complete: ${succeeded} succeeded, ${failed} failed, ${skipped} skipped`);

    return { success: true, succeeded, failed, skipped };
  }

  /**
   * Sync specific orders by their IDs
   */
  async syncOrdersByIds(orderIds, salesmanId) {
    try {
      if (!orderIds || orderIds.length === 0) {
        return { success: true, message: 'No orders to sync', synced: 0 };
      }

      console.log(`🔄 Syncing ${orderIds.length} specific orders...`);

      // Get orders from database
      const orders = await Promise.all(
        orderIds.map(id => dbHelper.getOrderById(id))
      );

      // Filter out null orders
      const validOrders = orders.filter(o => o !== null);

      if (validOrders.length === 0) {
        return { success: false, error: 'No valid orders found', synced: 0 };
      }

      // Format orders for backend
      const formattedOrders = await Promise.all(
        validOrders.map(async (order) => {
          const items = await dbHelper.getOrderDetails(order.id);
          
          return {
            mobile_order_id: order.order_number,
            shop_id: order.shop_id,
            route_id: order.route_id,
            order_date: order.order_date,
            total_amount: order.subtotal || order.total_amount,
            discount: order.discount_amount || 0,
            net_amount: order.total_amount,
            notes: order.notes || '',
            items: items.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
              discount: item.discount_amount || 0,
              net_price: item.total_price - (item.discount_amount || 0),
            })),
          };
        })
      );

      // Upload to backend
      const response = await api.post('/mobile/sync/orders', {
        salesman_id: salesmanId,
        device_info: {
          device_id: 'retry-service',
          os: 'mobile',
          app_version: '1.0.0',
        },
        orders: formattedOrders,
      });

      if (response.data.success) {
        // Mark orders as synced with backend IDs
        // Backend returns: { success, message, results: { synced_orders: [...] } }
        const syncResults = response.data.results?.synced_orders || response.data.data || response.data.orders || [];
        
        console.log('🔍 Sync response synced_orders:', JSON.stringify(syncResults, null, 2));
        
        for (let i = 0; i < validOrders.length; i++) {
          const order = validOrders[i];
          // Find matching backend result by mobile_order_id
          const backendOrder = syncResults.find(r => r.mobile_order_id === order.order_number);
          
          if (backendOrder && backendOrder.backend_id) {
            console.log(`✅ Marking order ${order.id} as synced with backend_id: ${backendOrder.backend_id}`);
            await dbHelper.markOrderAsSynced(order.id, backendOrder.backend_id);
          } else {
            // Even if no specific backend_id found, mark as synced if overall sync was successful
            console.log(`⚠️ No specific backend_id for order ${order.id}, marking synced without backend_id`);
            await dbHelper.markOrderAsSynced(order.id, null);
          }
        }

        return {
          success: true,
          synced: validOrders.length,
          message: `Synced ${validOrders.length} orders`,
        };
      } else {
        return {
          success: false,
          error: response.data.message || 'Sync failed',
          synced: 0,
        };
      }
    } catch (error) {
      console.error('Error syncing orders by IDs:', error);
      return {
        success: false,
        error: error.message || 'Sync failed',
        synced: 0,
      };
    }
  }

  /**
   * Clear retry queue
   */
  async clearRetryQueue() {
    this.retryQueue = [];
    await AsyncStorage.removeItem('sync_retry_queue');
    console.log('🗑️  Retry queue cleared');
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus() {
    return {
      totalItems: this.retryQueue.length,
      items: this.retryQueue.map(item => ({
        id: item.id,
        orderCount: item.orderIds.length,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
        reason: item.reason,
        timestamp: item.timestamp,
        nextRetryAt: item.nextRetryAt,
      })),
    };
  }
}

// Export singleton instance
const syncService = new SyncService();
export default syncService;

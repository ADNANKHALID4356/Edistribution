/**
 * Database Helper - SQLite Operations
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Handle all SQLite database operations for offline data storage
 * Used by: React Native Mobile Application
 * 
 * HYBRID MODE: SQLite for offline, sync with VPS backend when online
 */

import * as SQLite from 'expo-sqlite';
import {
  ALL_TABLES,
  CREATE_INDEXES,
  INIT_SYNC_METADATA,
  DATABASE_NAME,
  DATABASE_VERSION,
  TABLES,
  SYNC_STATUS,
  ORDER_STATUS,
} from './schema';

class DatabaseHelper {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize database and create tables
   */
  async init() {
    try {
      if (this.isInitialized) {
        return true;
      }

      console.log('📂 Initializing SQLite database...');
      
      // Open database
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      console.log('✅ Database opened');

      // Create tables
      for (const table of ALL_TABLES) {
        await this.db.execAsync(table);
      }
      console.log('✅ Tables created');

      // Create indexes
      for (const index of CREATE_INDEXES) {
        await this.db.execAsync(index);
      }
      console.log('✅ Indexes created');

      // Initialize sync metadata
      await this.db.execAsync(INIT_SYNC_METADATA);
      console.log('✅ Sync metadata initialized');

      this.isInitialized = true;
      console.log('🎉 Database initialization complete');
      return true;
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query (INSERT, UPDATE, DELETE)
   */
  async executeQuery(query, params = []) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      const result = await this.db.runAsync(query, params);
      return result;
    } catch (error) {
      console.error('❌ Execute query error:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Execute a SELECT query
   */
  async selectQuery(query, params = []) {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      const result = await this.db.getAllAsync(query, params);
      return result || [];
    } catch (error) {
      console.error('❌ Select query error:', error);
      console.error('Query:', query);
      console.error('Params:', params);
      throw error;
    }
  }

  // ========================================
  // PRODUCTS OPERATIONS
  // ========================================

  /**
   * Clear all products (for fresh sync)
   * This ensures SQLite exactly matches backend by removing old/deleted products
   */
  async clearProducts() {
    try {
      await this.executeQuery('DELETE FROM products');
      console.log('✅ All products cleared from SQLite');
      return true;
    } catch (error) {
      console.error('❌ Error clearing products:', error);
      throw error;
    }
  }

  /**
   * Insert or replace products (for sync)
   */
  async upsertProducts(products) {
    try {
      const timestamp = new Date().toISOString();
      let inserted = 0;

      for (const product of products) {
        const query = `
          INSERT OR REPLACE INTO products (
            id, product_code, product_name, category, brand, pack_size,
            unit_price, carton_price, pieces_per_carton, purchase_price,
            stock_quantity, reorder_level, supplier_id, supplier_name,
            barcode, description, is_active, created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          product.id,
          product.product_code,
          product.product_name,
          product.category || null,
          product.brand || null,
          product.pack_size || null,
          product.unit_price || 0,
          product.carton_price || 0,
          product.pieces_per_carton || 1,
          product.purchase_price || 0,
          product.stock_quantity || 0,
          product.reorder_level || 10,
          product.supplier_id || null,
          product.supplier_name || null,
          product.barcode || null,
          product.description || null,
          product.is_active ? 1 : 0,
          product.created_at || timestamp,
          product.updated_at || timestamp,
          timestamp,
        ];

        await this.executeQuery(query, params);
        inserted++;
      }

      console.log(`✅ Upserted ${inserted} products`);
      return inserted;
    } catch (error) {
      console.error('Error upserting products:', error);
      throw error;
    }
  }

  /**
   * Get all active products
   */
  async getAllProducts() {
    const query = `
      SELECT * FROM products 
      WHERE is_active = 1 
      ORDER BY product_name ASC
    `;
    return await this.selectQuery(query);
  }

  /**
   * Search products by name, code, or barcode
   */
  async searchProducts(searchTerm) {
    const query = `
      SELECT * FROM products 
      WHERE is_active = 1 
      AND (
        product_name LIKE ? 
        OR product_code LIKE ? 
        OR barcode LIKE ?
      )
      ORDER BY product_name ASC
    `;
    const term = `%${searchTerm}%`;
    return await this.selectQuery(query, [term, term, term]);
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category) {
    const query = `
      SELECT * FROM products 
      WHERE is_active = 1 AND category = ?
      ORDER BY product_name ASC
    `;
    return await this.selectQuery(query, [category]);
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(brand) {
    const query = `
      SELECT * FROM products 
      WHERE is_active = 1 AND brand = ?
      ORDER BY product_name ASC
    `;
    return await this.selectQuery(query, [brand]);
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    const query = 'SELECT * FROM products WHERE id = ?';
    const results = await this.selectQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode) {
    const query = 'SELECT * FROM products WHERE barcode = ? AND is_active = 1';
    const results = await this.selectQuery(query, [barcode]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all distinct categories
   */
  async getCategories() {
    const query = `
      SELECT DISTINCT category 
      FROM products 
      WHERE category IS NOT NULL AND is_active = 1
      ORDER BY category ASC
    `;
    const results = await this.selectQuery(query);
    return results.map(row => row.category);
  }

  /**
   * Get all distinct brands
   */
  async getBrands() {
    const query = `
      SELECT DISTINCT brand 
      FROM products 
      WHERE brand IS NOT NULL AND is_active = 1
      ORDER BY brand ASC
    `;
    const results = await this.selectQuery(query);
    return results.map(row => row.brand);
  }

  /**
   * Get products count
   */
  async getProductsCount() {
    const query = 'SELECT COUNT(*) as count FROM products WHERE is_active = 1';
    const results = await this.selectQuery(query);
    return results[0]?.count || 0;
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts() {
    const query = `
      SELECT * FROM products 
      WHERE is_active = 1 AND stock_quantity <= reorder_level
      ORDER BY stock_quantity ASC
    `;
    return await this.selectQuery(query);
  }

  // ========================================
  // SUPPLIERS OPERATIONS
  // ========================================

  /**
   * Insert or replace suppliers (for sync)
   */
  async upsertSuppliers(suppliers) {
    try {
      const timestamp = new Date().toISOString();
      let inserted = 0;

      for (const supplier of suppliers) {
        const query = `
          INSERT OR REPLACE INTO suppliers (
            id, supplier_code, supplier_name, contact_person, phone, email,
            address, city, opening_balance, current_balance, is_active,
            created_at, updated_at, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          supplier.id,
          supplier.supplier_code,
          supplier.supplier_name,
          supplier.contact_person || null,
          supplier.phone || null,
          supplier.email || null,
          supplier.address || null,
          supplier.city || null,
          supplier.opening_balance || 0,
          supplier.current_balance || 0,
          supplier.is_active ? 1 : 0,
          supplier.created_at || timestamp,
          supplier.updated_at || timestamp,
          timestamp,
        ];

        await this.executeQuery(query, params);
        inserted++;
      }

      console.log(`✅ Upserted ${inserted} suppliers`);
      return inserted;
    } catch (error) {
      console.error('Error upserting suppliers:', error);
      throw error;
    }
  }

  /**
   * Get all active suppliers
   */
  async getAllSuppliers() {
    const query = `
      SELECT * FROM suppliers 
      WHERE is_active = 1 
      ORDER BY supplier_name ASC
    `;
    return await this.selectQuery(query);
  }

  // ========================================
  // SYNC METADATA OPERATIONS
  // ========================================

  /**
   * Update sync metadata
   */
  async updateSyncMetadata(tableName, status, totalRecords = 0, syncedRecords = 0, errorMessage = null) {
    const query = `
      UPDATE sync_metadata 
      SET last_sync_at = ?, 
          sync_status = ?, 
          total_records = ?,
          synced_records = ?,
          error_message = ?
      WHERE table_name = ?
    `;
    const timestamp = new Date().toISOString();
    await this.executeQuery(query, [
      timestamp,
      status,
      totalRecords,
      syncedRecords,
      errorMessage,
      tableName,
    ]);
  }

  /**
   * Get sync metadata for a table
   */
  async getSyncMetadata(tableName) {
    const query = 'SELECT * FROM sync_metadata WHERE table_name = ?';
    const results = await this.selectQuery(query, [tableName]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all sync metadata
   */
  async getAllSyncMetadata() {
    const query = 'SELECT * FROM sync_metadata ORDER BY table_name';
    return await this.selectQuery(query);
  }

  // ========================================
  // ROUTES OPERATIONS
  // ========================================

  /**
   * Clear all routes (for fresh sync)
   */
  async clearRoutes() {
    try {
      await this.executeQuery('DELETE FROM routes');
      console.log('✅ All routes cleared from SQLite');
      return true;
    } catch (error) {
      console.error('❌ Error clearing routes:', error);
      throw error;
    }
  }

  /**
   * Insert or update routes
   */
  async upsertRoutes(routes) {
    try {
      let inserted = 0;
      let updated = 0;

      for (const route of routes) {
        const existing = await this.selectQuery(
          'SELECT id FROM routes WHERE id = ?',
          [route.id]
        );

        const query = existing.length > 0
          ? `UPDATE routes SET 
              route_code = ?, route_name = ?, description = ?,
              is_active = ?, synced_at = ?
             WHERE id = ?`
          : `INSERT INTO routes (id, route_code, route_name, description, is_active, synced_at)
             VALUES (?, ?, ?, ?, ?, ?)`;

        const params = existing.length > 0
          ? [route.route_code, route.route_name, route.description || '', 
             route.is_active ? 1 : 0, new Date().toISOString(), route.id]
          : [route.id, route.route_code, route.route_name, route.description || '',
             route.is_active ? 1 : 0, new Date().toISOString()];

        await this.executeQuery(query, params);
        existing.length > 0 ? updated++ : inserted++;
      }

      console.log(`✅ Routes synced: ${inserted} inserted, ${updated} updated`);
      return { inserted, updated };
    } catch (error) {
      console.error('❌ Error upserting routes:', error);
      throw error;
    }
  }

  /**
   * Get all active routes
   */
  async getAllRoutes() {
    const query = `
      SELECT * FROM routes 
      WHERE is_active = 1 
      ORDER BY route_name ASC
    `;
    return await this.selectQuery(query);
  }

  /**
   * Get route by ID
   */
  async getRouteById(id) {
    const query = 'SELECT * FROM routes WHERE id = ?';
    const results = await this.selectQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get routes count
   */
  async getRoutesCount() {
    const query = 'SELECT COUNT(*) as count FROM routes WHERE is_active = 1';
    const results = await this.selectQuery(query);
    return results[0]?.count || 0;
  }

  // ========================================
  // SHOPS OPERATIONS
  // ========================================

  /**
   * Clear all shops (for fresh sync)
   */
  async clearShops() {
    try {
      await this.executeQuery('DELETE FROM shops');
      console.log('✅ All shops cleared from SQLite');
      return true;
    } catch (error) {
      console.error('❌ Error clearing shops:', error);
      throw error;
    }
  }

  /**
   * Insert or update shops
   */
  async upsertShops(shops) {
    try {
      let inserted = 0;
      let updated = 0;

      for (const shop of shops) {
        const existing = await this.selectQuery(
          'SELECT id FROM shops WHERE id = ?',
          [shop.id]
        );

        const query = existing.length > 0
          ? `UPDATE shops SET 
              shop_code = ?, shop_name = ?, owner_name = ?,
              phone = ?, address = ?, city = ?,
              route_id = ?, route_name = ?,
              credit_limit = ?, opening_balance = ?, current_balance = ?,
              is_active = ?, updated_at = ?, synced_at = ?
             WHERE id = ?`
          : `INSERT INTO shops (id, shop_code, shop_name, owner_name, phone, address, city,
              route_id, route_name, credit_limit, opening_balance, current_balance,
              is_active, created_at, updated_at, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const timestamp = new Date().toISOString();
        
        const params = existing.length > 0
          ? [shop.shop_code, shop.shop_name, shop.owner_name || '',
             shop.phone || '', shop.address || '', shop.city || '',
             shop.route_id || null, shop.route_name || '',
             shop.credit_limit || 0, shop.opening_balance || 0, shop.current_balance || 0,
             shop.is_active ? 1 : 0, timestamp, timestamp, shop.id]
          : [shop.id, shop.shop_code, shop.shop_name, shop.owner_name || '',
             shop.phone || '', shop.address || '', shop.city || '',
             shop.route_id || null, shop.route_name || '',
             shop.credit_limit || 0, shop.opening_balance || 0, shop.current_balance || 0,
             shop.is_active ? 1 : 0, timestamp, timestamp, timestamp];

        await this.executeQuery(query, params);
        existing.length > 0 ? updated++ : inserted++;
      }

      console.log(`✅ Shops synced: ${inserted} inserted, ${updated} updated`);
      return { inserted, updated };
    } catch (error) {
      console.error('❌ Error upserting shops:', error);
      throw error;
    }
  }

  /**
   * Get all active shops
   */
  async getAllShops(filters = {}) {
    let query = `
      SELECT s.*, r.route_name 
      FROM shops s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.is_active = 1
    `;
    const params = [];

    if (filters.routeId) {
      query += ' AND s.route_id = ?';
      params.push(filters.routeId);
    }

    if (filters.city) {
      query += ' AND s.city LIKE ?';
      params.push(`%${filters.city}%`);
    }

    if (filters.search) {
      query += ' AND (s.shop_name LIKE ? OR s.owner_name LIKE ? OR s.phone LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY s.shop_name ASC';

    return await this.selectQuery(query, params);
  }

  /**
   * Get shops by route
   */
  async getShopsByRoute(routeId) {
    const query = `
      SELECT s.*, r.route_name 
      FROM shops s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.route_id = ? AND s.is_active = 1
      ORDER BY s.shop_name ASC
    `;
    return await this.selectQuery(query, [routeId]);
  }

  /**
   * Get shop by ID
   */
  async getShopById(id) {
    const query = `
      SELECT s.*, r.route_name 
      FROM shops s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.id = ?
    `;
    const results = await this.selectQuery(query, [id]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get shops count
   */
  async getShopsCount(routeId = null) {
    let query = 'SELECT COUNT(*) as count FROM shops WHERE is_active = 1';
    const params = [];
    
    if (routeId) {
      query += ' AND route_id = ?';
      params.push(routeId);
    }
    
    const results = await this.selectQuery(query, params);
    return results[0]?.count || 0;
  }

  /**
   * Search shops
   */
  async searchShops(searchTerm) {
    const query = `
      SELECT s.*, r.route_name 
      FROM shops s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.is_active = 1
        AND (s.shop_name LIKE ? OR s.owner_name LIKE ? OR s.phone LIKE ? OR s.shop_code LIKE ?)
      ORDER BY s.shop_name ASC
      LIMIT 50
    `;
    const term = `%${searchTerm}%`;
    return await this.selectQuery(query, [term, term, term, term]);
  }

  // ========================================
  // SALESMEN OPERATIONS - Sprint 4
  // ========================================

  /**
   * Insert or update multiple salesmen
   */
  async upsertSalesmen(salesmen) {
    if (!Array.isArray(salesmen) || salesmen.length === 0) return 0;

    let count = 0;
    for (const salesman of salesmen) {
      const query = `
        INSERT OR REPLACE INTO salesmen (
          id, salesman_code, full_name, phone, email, cnic, city, address,
          username, route_id, route_name, monthly_target, achieved_sales,
          is_active, created_at, updated_at, synced_at, last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.executeQuery(query, [
        salesman.id,
        salesman.salesman_code,
        salesman.full_name,
        salesman.phone,
        salesman.email,
        salesman.cnic,
        salesman.city,
        salesman.address,
        salesman.username,
        salesman.route_id,
        salesman.route_name || null,
        salesman.monthly_target || 0.00,
        salesman.achieved_sales || 0.00,
        salesman.is_active,
        salesman.created_at,
        salesman.updated_at,
        new Date().toISOString(),
        salesman.updated_at,
      ]);
      count++;
    }
    
    console.log(`✅ Upserted ${count} salesmen`);
    return count;
  }

  /**
   * Get salesman by ID
   */
  async getSalesmanById(id) {
    const query = `
      SELECT s.*, r.route_name 
      FROM salesmen s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.id = ?
    `;
    const results = await this.selectQuery(query, [id]);
    return results[0] || null;
  }

  /**
   * Get salesman by username
   */
  async getSalesmanByUsername(username) {
    const query = `
      SELECT s.*, r.route_name 
      FROM salesmen s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.username = ? AND s.is_active = 1
    `;
    const results = await this.selectQuery(query, [username]);
    return results[0] || null;
  }

  /**
   * Get all active salesmen
   */
  async getActiveSalesmen() {
    const query = `
      SELECT s.*, r.route_name 
      FROM salesmen s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.is_active = 1
      ORDER BY s.full_name ASC
    `;
    return await this.selectQuery(query);
  }

  /**
   * Update salesman achieved sales
   */
  async updateSalesmanAchievedSales(salesmanId, amount) {
    const query = `
      UPDATE salesmen 
      SET achieved_sales = achieved_sales + ?,
          last_modified = ?
      WHERE id = ?
    `;
    await this.executeQuery(query, [amount, new Date().toISOString(), salesmanId]);
  }

  /**
   * Get salesman statistics
   */
  async getSalesmanStats(salesmanId) {
    const salesman = await this.getSalesmanById(salesmanId);
    if (!salesman) return null;

    // Get shop count for salesman's route
    const shopCount = await this.getShopsCount(salesman.route_id);

    // Calculate target progress
    const targetProgress = salesman.monthly_target > 0 
      ? ((salesman.achieved_sales / salesman.monthly_target) * 100).toFixed(2)
      : 0;

    return {
      salesman_id: salesman.id,
      salesman_name: salesman.full_name,
      salesman_code: salesman.salesman_code,
      route_id: salesman.route_id,
      route_name: salesman.route_name,
      monthly_target: salesman.monthly_target,
      achieved_sales: salesman.achieved_sales,
      remaining_target: salesman.monthly_target - salesman.achieved_sales,
      target_progress: targetProgress,
      shop_count: shopCount,
    };
  }

  // ========================================
  // UTILITY OPERATIONS
  // ========================================

  /**
   * Clear all data from a table
   */
  async clearTable(tableName) {
    const query = `DELETE FROM ${tableName}`;
    await this.executeQuery(query);
    console.log(`✅ Cleared table: ${tableName}`);
  }

  /**
   * Clear all products
   */
  async clearAllProducts() {
    await this.clearTable(TABLES.PRODUCTS);
    await this.updateSyncMetadata(TABLES.PRODUCTS, SYNC_STATUS.PENDING, 0, 0);
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats = {};
    
    const productCount = await this.getProductsCount();
    const supplierQuery = 'SELECT COUNT(*) as count FROM suppliers WHERE is_active = 1';
    const supplierResults = await this.selectQuery(supplierQuery);
    const routeCount = await this.getRoutesCount();
    const shopCount = await this.getShopsCount();
    
    stats.products = productCount;
    stats.suppliers = supplierResults[0]?.count || 0;
    stats.routes = routeCount;
    stats.shops = shopCount;
    
    return stats;
  }

  // ==================== ORDER METHODS - SPRINT 5 ====================

  /**
   * Generate unique order number
   * Format: ORD-YYYYMMDD-XXXXX
   */
  async generateOrderNumber() {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get today's order count
    const query = `
      SELECT COUNT(*) as count 
      FROM orders 
      WHERE order_number LIKE 'ORD-${dateStr}-%'
    `;
    const result = await this.selectQuery(query);
    const count = result[0]?.count || 0;
    const nextNum = (count + 1).toString().padStart(5, '0');
    
    return `ORD-${dateStr}-${nextNum}`;
  }

  /**
   * Create a new order (draft)
   */
  async createOrder(orderData) {
    try {
      const orderNumber = await this.generateOrderNumber();
      
      // Get local date in YYYY-MM-DD format
      const localDate = orderData.order_date || (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      
      const query = `
        INSERT INTO orders (
          order_number, salesman_id, salesman_name, shop_id, shop_name,
          route_id, route_name, order_date, status, subtotal,
          discount_amount, discount_percentage, tax_amount, total_amount, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        orderNumber,
        orderData.salesman_id,
        orderData.salesman_name || '',
        orderData.shop_id,
        orderData.shop_name || '',
        orderData.route_id || null,
        orderData.route_name || '',
        localDate,
        orderData.status || 'draft',
        orderData.subtotal || 0,
        orderData.discount_amount || 0,
        orderData.discount_percentage || 0,
        orderData.tax_amount || 0,
        orderData.total_amount || 0,
        orderData.notes || ''
      ];
      
      const result = await this.executeQuery(query, params);
      console.log('✅ Order created:', orderNumber);
      
      return {
        id: result.lastInsertRowId,
        order_number: orderNumber
      };
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  }

  /**
   * Add order details (items)
   */
  async addOrderDetails(orderId, items) {
    try {
      for (const item of items) {
        const query = `
          INSERT INTO order_details (
            order_id, product_id, product_code, product_name,
            quantity, unit_price, total_price, discount_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const params = [
          orderId,
          item.product_id,
          item.product_code || '',
          item.product_name,
          item.quantity,
          item.unit_price,
          item.total_price,
          item.discount_amount || 0
        ];
        
        await this.executeQuery(query, params);
      }
      console.log(`✅ Added ${items.length} items to order ${orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Error adding order details:', error);
      throw error;
    }
  }

  /**
   * Get order by ID with details
   */
  async getOrderById(orderId) {
    try {
      // Get order
      const orderQuery = 'SELECT * FROM orders WHERE id = ?';
      const orders = await this.selectQuery(orderQuery, [orderId]);
      
      if (orders.length === 0) {
        return null;
      }
      
      const order = orders[0];
      
      // Get order details
      const detailsQuery = 'SELECT * FROM order_details WHERE order_id = ?';
      const details = await this.selectQuery(detailsQuery, [orderId]);
      
      order.items = details;
      return order;
    } catch (error) {
      console.error('❌ Error getting order:', error);
      throw error;
    }
  }

  /**
   * Get all orders with sync status
   * Used by OrdersListScreen to display all orders
   * CRITICAL: salesmanId is REQUIRED for multi-tenancy
   */
  async getAllOrders(salesmanId = null) {
    try {
      // CRITICAL: Prevent fetching all orders from all salesmen
      if (!salesmanId) {
        console.error('❌ getAllOrders called without salesmanId - SECURITY VIOLATION');
        throw new Error('salesmanId is required for getAllOrders');
      }
      
      let query = 'SELECT * FROM orders WHERE salesman_id = ?';
      const params = [salesmanId];
      
      query += ' ORDER BY order_date DESC, created_at DESC';
      
      const orders = await this.selectQuery(query, params);
      
      // Get details for each order
      for (const order of orders) {
        const detailsQuery = 'SELECT * FROM order_details WHERE order_id = ?';
        const details = await this.selectQuery(detailsQuery, [order.id]);
        order.items = details;
      }
      
      return orders;
    } catch (error) {
      console.error('❌ Error getting all orders:', error);
      throw error;
    }
  }


  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber) {
    try {
      const orderQuery = 'SELECT * FROM orders WHERE order_number = ?';
      const orders = await this.selectQuery(orderQuery, [orderNumber]);
      
      if (orders.length === 0) {
        return null;
      }
      
      const order = orders[0];
      
      // Get order details
      const detailsQuery = 'SELECT * FROM order_details WHERE order_id = ?';
      const details = await this.selectQuery(detailsQuery, [order.id]);
      
      order.items = details;
      return order;
    } catch (error) {
      console.error('❌ Error getting order by number:', error);
      throw error;
    }
  }

  /**
   * Get orders by shop
   * CRITICAL: salesmanId is REQUIRED for multi-tenancy
   */
  async getOrdersByShop(shopId, status = null, salesmanId = null) {
    try {
      // CRITICAL: Prevent fetching orders from other salesmen
      if (!salesmanId) {
        console.error('❌ getOrdersByShop called without salesmanId - SECURITY VIOLATION');
        throw new Error('salesmanId is required for getOrdersByShop');
      }
      
      let query = 'SELECT * FROM orders WHERE shop_id = ? AND salesman_id = ?';
      const params = [shopId, salesmanId];
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY order_date DESC, created_at DESC';
      
      const orders = await this.selectQuery(query, params);
      return orders;
    } catch (error) {
      console.error('❌ Error getting orders by shop:', error);
      throw error;
    }
  }

  /**
   * Get draft orders
   * CRITICAL: salesmanId is REQUIRED for multi-tenancy
   */
  async getDraftOrders(salesmanId = null) {
    try {
      // CRITICAL: Prevent fetching drafts from other salesmen
      if (!salesmanId) {
        console.error('❌ getDraftOrders called without salesmanId - SECURITY VIOLATION');
        throw new Error('salesmanId is required for getDraftOrders');
      }
      
      let query = 'SELECT * FROM orders WHERE status = \'draft\' AND salesman_id = ?';
      const params = [salesmanId];
      
      query += ' ORDER BY created_at DESC';
      
      const orders = await this.selectQuery(query, params);
      return orders;
    } catch (error) {
      console.error('❌ Error getting draft orders:', error);
      throw error;
    }
  }

  /**
   * Get unsynced orders (ready to sync)
   * CRITICAL: salesmanId is REQUIRED for multi-tenancy
   */
  async getUnsyncedOrders(salesmanId = null) {
    try {
      // CRITICAL: Prevent syncing orders from other salesmen
      if (!salesmanId) {
        console.error('❌ getUnsyncedOrders called without salesmanId - SECURITY VIOLATION');
        throw new Error('salesmanId is required for getUnsyncedOrders');
      }
      
      let query = 'SELECT * FROM orders WHERE synced = 0 AND status != \'draft\' AND salesman_id = ?';
      const params = [salesmanId];
      
      query += ' ORDER BY order_date ASC, created_at ASC';
      
      const orders = await this.selectQuery(query, params);
      
      // Get details for each order
      for (const order of orders) {
        const detailsQuery = 'SELECT * FROM order_details WHERE order_id = ?';
        const details = await this.selectQuery(detailsQuery, [order.id]);
        order.items = details;
      }
      
      return orders;
    } catch (error) {
      console.error('❌ Error getting unsynced orders:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, notes = null) {
    try {
      let query = 'UPDATE orders SET status = ?, updated_at = datetime("now", "localtime")';
      const params = [status];
      
      if (notes) {
        query += ', notes = ?';
        params.push(notes);
      }
      
      query += ' WHERE id = ?';
      params.push(orderId);
      
      await this.executeQuery(query, params);
      console.log(`✅ Order ${orderId} status updated to: ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Update order totals
   */
  async updateOrderTotals(orderId, totals) {
    try {
      const query = `
        UPDATE orders 
        SET subtotal = ?, discount_amount = ?, discount_percentage = ?,
            tax_amount = ?, total_amount = ?, 
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `;
      
      const params = [
        totals.subtotal,
        totals.discount_amount || 0,
        totals.discount_percentage || 0,
        totals.tax_amount || 0,
        totals.total_amount,
        orderId
      ];
      
      await this.executeQuery(query, params);
      console.log(`✅ Order ${orderId} totals updated`);
      return true;
    } catch (error) {
      console.error('❌ Error updating order totals:', error);
      throw error;
    }
  }

  /**
   * Mark order as synced
   */
  async markOrderSynced(orderId, backendId) {
    try {
      const query = `
        UPDATE orders 
        SET synced = 1, backend_id = ?, synced_at = datetime('now', 'localtime')
        WHERE id = ?
      `;
      
      await this.executeQuery(query, [backendId, orderId]);
      console.log(`✅ Order ${orderId} marked as synced (backend ID: ${backendId})`);
      return true;
    } catch (error) {
      console.error('❌ Error marking order as synced:', error);
      throw error;
    }
  }

  /**
   * Delete order (and its details via CASCADE)
   */
  async deleteOrder(orderId) {
    try {
      const query = 'DELETE FROM orders WHERE id = ?';
      await this.executeQuery(query, [orderId]);
      console.log(`✅ Order ${orderId} deleted`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting order:', error);
      throw error;
    }
  }

  /**
   * Delete order detail item
   */
  async deleteOrderDetail(detailId) {
    try {
      const query = 'DELETE FROM order_details WHERE id = ?';
      await this.executeQuery(query, [detailId]);
      console.log(`✅ Order detail ${detailId} deleted`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting order detail:', error);
      throw error;
    }
  }

  /**
   * Delete all order details for a specific order
   * Used when updating draft orders
   */
  async deleteOrderDetails(orderId) {
    try {
      const query = 'DELETE FROM order_details WHERE order_id = ?';
      await this.executeQuery(query, [orderId]);
      console.log(`✅ All order details deleted for order ${orderId}`);
      return true;
    } catch (error) {
      console.error('❌ Error deleting order details:', error);
      throw error;
    }
  }

  /**
   * Clear all orders and order details (for testing/cleanup)
   */
  async clearAllOrders() {
    try {
      // Delete all order details first (child records)
      await this.executeQuery('DELETE FROM order_details');
      console.log('✅ All order details cleared');
      
      // Delete all orders (parent records)
      await this.executeQuery('DELETE FROM orders');
      console.log('✅ All orders cleared');
      
      // Reset auto-increment counters
      await this.executeQuery('DELETE FROM sqlite_sequence WHERE name IN (?, ?)', ['orders', 'order_details']);
      console.log('✅ Auto-increment counters reset');
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing all orders:', error);
      throw error;
    }
  }

  /**
   * Clear unsynced orders for a specific salesman (for logout cleanup)
   * This prevents one salesman from seeing another salesman's unsynced orders
   */
  async clearUnsyncedOrdersForSalesman(salesmanId) {
    try {
      if (!salesmanId) {
        console.warn('⚠️ No salesman ID provided for cleanup');
        return false;
      }
      
      console.log(`🧹 Clearing unsynced orders for salesman ${salesmanId}`);
      
      // Get unsynced order IDs for this salesman
      const orders = await this.selectQuery(
        'SELECT id FROM orders WHERE salesman_id = ? AND synced = 0',
        [salesmanId]
      );
      
      if (orders.length === 0) {
        console.log('✅ No unsynced orders to clear');
        return true;
      }
      
      // Delete order details for these orders
      for (const order of orders) {
        await this.executeQuery('DELETE FROM order_details WHERE order_id = ?', [order.id]);
      }
      console.log(`✅ Cleared order details for ${orders.length} unsynced orders`);
      
      // Delete the unsynced orders
      await this.executeQuery(
        'DELETE FROM orders WHERE salesman_id = ? AND synced = 0',
        [salesmanId]
      );
      console.log(`✅ Cleared ${orders.length} unsynced orders for salesman ${salesmanId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error clearing unsynced orders:', error);
      throw error;
    }
  }

  /**
   * Get order statistics
   * CRITICAL: salesmanId is REQUIRED for multi-tenancy
   */
  async getOrderStats(salesmanId = null) {
    try {
      // CRITICAL: Prevent getting stats from other salesmen
      if (!salesmanId) {
        console.error('❌ getOrderStats called without salesmanId - SECURITY VIOLATION');
        throw new Error('salesmanId is required for getOrderStats');
      }
      
      let query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_orders,
          SUM(CASE WHEN status = 'placed' THEN 1 ELSE 0 END) as placed_orders,
          SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized_orders,
          SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as unsynced_orders,
          SUM(total_amount) as total_amount
        FROM orders
        WHERE salesman_id = ?
      `;
      
      const params = [salesmanId];
      
      const result = await this.selectQuery(query, params);
      return result[0] || {};
    } catch (error) {
      console.error('❌ Error getting order stats:', error);
      throw error;
    }
  }

  /**
   * Sprint 9: Mark order as synced after successful upload to backend
   */
  async markOrderAsSynced(orderId, backendId = null) {
    try {
      const query = `
        UPDATE orders 
        SET synced = 1, 
            synced_at = datetime('now', 'localtime'),
            backend_id = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `;
      
      await this.executeQuery(query, [backendId, orderId]);
      console.log(`✅ Order ${orderId} marked as synced (backend_id: ${backendId})`);
      return true;
    } catch (error) {
      console.error(`❌ Error marking order ${orderId} as synced:`, error);
      throw error;
    }
  }

  /**
   * Sprint 9: Update order sync error message
   */
  async updateOrderSyncError(orderId, errorMessage) {
    try {
      const query = `
        UPDATE orders 
        SET notes = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `;
      
      const message = `Sync Error: ${errorMessage}`;
      await this.executeQuery(query, [message, orderId]);
      console.log(`⚠️ Order ${orderId} sync error recorded`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating order ${orderId} sync error:`, error);
      throw error;
    }
  }

  /**
   * Sprint 9: Get order details (items) for sync
   */
  async getOrderDetails(orderId) {
    try {
      const query = 'SELECT * FROM order_details WHERE order_id = ?';
      const details = await this.selectQuery(query, [orderId]);
      return details || [];
    } catch (error) {
      console.error(`❌ Error getting order ${orderId} details:`, error);
      throw error;
    }
  }

  /**
   * Sprint 9: Get sync statistics
   */
  async getSyncStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced_orders,
          SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as pending_orders,
          MAX(synced_at) as last_sync_at
        FROM orders
        WHERE status != 'draft'
      `;
      
      const result = await this.selectQuery(query);
      return result[0] || {
        total_orders: 0,
        synced_orders: 0,
        pending_orders: 0,
        last_sync_at: null,
      };
    } catch (error) {
      console.error('❌ Error getting sync stats:', error);
      throw error;
    }
  }

  // ==================== END ORDER METHODS ====================

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
      console.log('📂 Database closed');
    }
  }
}

// Export singleton instance
const dbHelper = new DatabaseHelper();
export default dbHelper;

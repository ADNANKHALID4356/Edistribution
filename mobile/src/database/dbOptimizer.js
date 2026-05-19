/**
 * Mobile SQLite Query Optimizer
 * Optimized database queries for React Native mobile app
 * 
 * Features:
 * - Indexed queries for fast lookups
 * - Batch operations
 * - Transaction management
 * - Query result caching
 * - Prepared statements
 */

import * as SQLite from 'expo-sqlite';

class MobileDatabaseOptimizer {
  constructor(dbName = 'distribution_system.db') {
    this.db = null;
    this.dbName = dbName;
    this.queryCache = new Map();
    this.cacheEnabled = true;
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Initialize database with performance optimizations
   */
  async init() {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      
      // Enable performance optimizations
      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 30000000000;
        PRAGMA page_size = 4096;
        PRAGMA cache_size = 10000;
      `);
      
      console.log('✅ Mobile database initialized with optimizations');
      
      // Create indexes
      await this.createIndexes();
      
      return this.db;
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    }
  }

  /**
   * Create performance indexes
   */
  async createIndexes() {
    const indexes = [
      // Products indexes
      'CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code)',
      'CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name)',
      'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id)',
      
      // Shops indexes
      'CREATE INDEX IF NOT EXISTS idx_shops_code ON shops(shop_code)',
      'CREATE INDEX IF NOT EXISTS idx_shops_route ON shops(route_id, is_active)',
      'CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active)',
      
      // Orders indexes
      'CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)',
      'CREATE INDEX IF NOT EXISTS idx_orders_salesman ON orders(salesman_id, order_date)',
      'CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, order_date)',
      'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, synced)',
      'CREATE INDEX IF NOT EXISTS idx_orders_sync ON orders(synced, salesman_id)',
      
      // Order items indexes
      'CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)',
      'CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id)',
      
      // Routes indexes
      'CREATE INDEX IF NOT EXISTS idx_routes_code ON routes(route_code)',
      'CREATE INDEX IF NOT EXISTS idx_routes_salesman ON routes(salesman_id)',
      
      // Sync metadata indexes
      'CREATE INDEX IF NOT EXISTS idx_sync_meta_table ON sync_metadata(table_name, last_sync_at)',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_date ON sync_logs(sync_date)'
    ];

    for (const indexSql of indexes) {
      try {
        await this.db.execAsync(indexSql);
      } catch (error) {
        // Ignore if index already exists
        if (!error.message.includes('already exists')) {
          console.warn('Index creation warning:', error.message);
        }
      }
    }
    
    console.log('✅ Database indexes created');
  }

  /**
   * Execute query with caching
   */
  async executeQuery(sql, params = [], options = {}) {
    const { cache = this.cacheEnabled, cacheKey = null } = options;
    
    // Check cache
    if (cache && cacheKey) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log('✅ Cache HIT:', cacheKey);
        return cached.data;
      }
    }

    // Execute query
    const result = await this.db.getAllAsync(sql, params);
    
    // Store in cache
    if (cache && cacheKey) {
      this.queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
    }
    
    return result;
  }

  /**
   * Batch insert with transaction - OPTIMIZED
   */
  async batchInsert(table, records, batchSize = 100) {
    if (!records || records.length === 0) return { success: true, inserted: 0 };

    const keys = Object.keys(records[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

    let inserted = 0;
    
    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      await this.db.withTransactionAsync(async () => {
        const statement = await this.db.prepareAsync(sql);
        
        for (const record of batch) {
          const values = keys.map(key => record[key]);
          await statement.executeAsync(values);
          inserted++;
        }
        
        await statement.finalizeAsync();
      });
    }

    console.log(`✅ Batch inserted ${inserted} records into ${table}`);
    return { success: true, inserted };
  }

  /**
   * Get products with pagination and filters - OPTIMIZED
   */
  async getProducts(options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      category = null,
      isActive = true,
      orderBy = 'product_name',
      orderDirection = 'ASC'
    } = options;

    const offset = (page - 1) * limit;
    let sql = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (isActive !== null) {
      sql += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    if (search) {
      sql += ' AND (product_name LIKE ? OR product_code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ` ORDER BY ${orderBy} ${orderDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const cacheKey = `products_${JSON.stringify(options)}`;
    const products = await this.executeQuery(sql, params, { cache: true, cacheKey });

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams = [];

    if (isActive !== null) {
      countSql += ' AND is_active = ?';
      countParams.push(isActive ? 1 : 0);
    }

    if (search) {
      countSql += ' AND (product_name LIKE ? OR product_code LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    const [countResult] = await this.db.getAllAsync(countSql, countParams);
    const total = countResult.total;

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get shops by route - OPTIMIZED
   */
  async getShopsByRoute(routeId, options = {}) {
    const { page = 1, limit = 20, search = '' } = options;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT s.*, r.route_name
      FROM shops s
      LEFT JOIN routes r ON s.route_id = r.id
      WHERE s.route_id = ? AND s.is_active = 1
    `;
    const params = [routeId];

    if (search) {
      sql += ' AND (s.shop_name LIKE ? OR s.owner_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.shop_name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const cacheKey = `shops_route_${routeId}_${page}_${search}`;
    return await this.executeQuery(sql, params, { cache: true, cacheKey });
  }

  /**
   * Get orders with items - OPTIMIZED
   */
  async getOrders(salesmanId, options = {}) {
    const { status = null, limit = 50, offset = 0 } = options;

    let sql = `
      SELECT 
        o.*,
        s.shop_name,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.salesman_id = ?
    `;
    const params = [salesmanId];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY o.id ORDER BY o.order_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await this.executeQuery(sql, params);
  }

  /**
   * Get order with items - OPTIMIZED
   */
  async getOrderWithItems(orderId) {
    // Get order
    const orderSql = `
      SELECT o.*, s.shop_name, s.owner_name
      FROM orders o
      LEFT JOIN shops s ON o.shop_id = s.id
      WHERE o.id = ?
    `;
    const [order] = await this.db.getAllAsync(orderSql, [orderId]);

    if (!order) return null;

    // Get order items with product details
    const itemsSql = `
      SELECT 
        oi.*,
        p.product_name,
        p.product_code,
        p.pack_size
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `;
    const items = await this.db.getAllAsync(itemsSql, [orderId]);

    return {
      ...order,
      items
    };
  }

  /**
   * Bulk update sync status - OPTIMIZED
   */
  async markOrdersSynced(orderIds) {
    if (!orderIds || orderIds.length === 0) return;

    const placeholders = orderIds.map(() => '?').join(',');
    const sql = `UPDATE orders SET synced = 1, synced_at = datetime('now') WHERE id IN (${placeholders})`;

    await this.db.runAsync(sql, orderIds);
    console.log(`✅ Marked ${orderIds.length} orders as synced`);
  }

  /**
   * Vacuum database (cleanup and optimize)
   */
  async vacuum() {
    console.log('🧹 Vacuuming database...');
    await this.db.execAsync('VACUUM');
    console.log('✅ Database vacuumed');
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    const stats = {};

    // Get table row counts
    const tables = ['products', 'shops', 'orders', 'order_items', 'routes'];
    for (const table of tables) {
      const [result] = await this.db.getAllAsync(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result.count;
    }

    // Get database size
    const [sizeResult] = await this.db.getAllAsync('PRAGMA page_count');
    const [pageSizeResult] = await this.db.getAllAsync('PRAGMA page_size');
    stats.size = (sizeResult.page_count * pageSizeResult.page_size) / 1024 / 1024; // MB

    // Get sync statistics
    const [syncResult] = await this.db.getAllAsync(
      'SELECT COUNT(*) as pending FROM orders WHERE synced = 0'
    );
    stats.pendingSync = syncResult.pending;

    return stats;
  }

  /**
   * Clear cache
   */
  clearCache(pattern = null) {
    if (pattern) {
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  /**
   * Close database
   */
  async close() {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

// Export singleton instance
const dbOptimizer = new MobileDatabaseOptimizer();

export default dbOptimizer;

// Export class for testing
export { MobileDatabaseOptimizer };

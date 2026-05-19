/**
 * Mobile Sync Controller
 * Sprint 9: Mobile Order Syncing - Part 1
 * Company: Ummahtechinnovations.com
 * 
 * This controller handles mobile synchronization for orders, products, shops, and routes.
 * Features:
 * - Bulk order upload from mobile devices
 * - Incremental sync with timestamps
 * - Conflict resolution (server wins)
 * - Batch processing (max 50 records per request)
 * - Sync logging and statistics
 */

const db = require('../config/database');

/**
 * POST /api/mobile/sync/orders
 * Upload orders from mobile device in bulk
 * 
 * Request Body:
 * {
 *   salesman_id: number,
 *   device_info: { device_id, os, app_version },
 *   orders: [{ mobile_order_id, shop_id, order_date, items: [], ... }]
 * }
 */
exports.syncOrders = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { salesman_id, device_info, orders } = req.body;
    const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';
    // SQLite dev schema keeps orders.salesman_id linked to users.id in this project.
    // Use authenticated user id to prevent FK failures during mobile sync.
    const effectiveSalesmanId = useSQLite ? req.user.id : salesman_id;
    
    console.log('\n🔄 ========== SYNC ORDERS REQUEST ==========');
    console.log('👤 Salesman ID (payload):', salesman_id);
    console.log('👤 Salesman ID (effective):', effectiveSalesmanId);
    console.log('📱 Device Info:', device_info);
    console.log('📦 Orders to sync:', orders?.length || 0);
    
    // Validation
    if (!effectiveSalesmanId || !orders || !Array.isArray(orders)) {
      console.log('❌ Validation failed: Missing salesman_id or orders');
      return res.status(400).json({
        success: false,
        message: 'Invalid request. salesman_id and orders array required.'
      });
    }
    
    // Limit batch size
    if (orders.length > 50) {
      console.log('❌ Too many orders:', orders.length);
      return res.status(400).json({
        success: false,
        message: 'Batch size exceeds limit. Maximum 50 orders per request.'
      });
    }
    
    console.log('✅ Starting transaction...');
    await connection.beginTransaction();
    
    const results = {
      total: orders.length,
      success: 0,
      failed: 0,
      conflicts: 0,
      errors: [],
      synced_orders: []  // Track synced order details for mobile
    };
    
    const startTime = Date.now();
    
    console.log('🔍 Processing', orders.length, 'orders...\n');
    
    for (let i = 0; i < orders.length; i++) {
      const orderData = orders[i];
      console.log(`\n📦 Order ${i + 1}/${orders.length}:`, orderData.mobile_order_id || 'No mobile_order_id');
      
      try {
        const { mobile_order_id, shop_id, route_id, total_amount, discount, net_amount, notes, items } = orderData;
        
        // Convert ISO datetime to MySQL format (YYYY-MM-DD HH:MM:SS)
        let order_date = orderData.order_date;
        if (order_date && order_date.includes('T')) {
          order_date = new Date(order_date).toISOString().slice(0, 19).replace('T', ' ');
          console.log('   📅 Converted order_date:', order_date);
        }
        
        console.log('   Shop:', shop_id, '| Items:', items?.length || 0, '| Amount:', net_amount);
        
        // Check if order already exists (by mobile_order_id)
        console.log('   🔍 Checking for existing order...');
        
        let existing;
        
        if (useSQLite) {
          // For SQLite: Check by shop_id, order_date, and total_amount (no mobile_order_id column)
          [existing] = await connection.query(
            'SELECT id, order_number, updated_at FROM orders WHERE salesman_id = ? AND shop_id = ? AND order_date = ? AND net_amount = ?',
            [effectiveSalesmanId, shop_id, order_date, net_amount]
          );
        } else {
          // For MySQL: Use mobile_order_id
          [existing] = await connection.query(
            'SELECT id, updated_at, is_synced FROM orders WHERE mobile_order_id = ? AND salesman_id = ?',
            [mobile_order_id, effectiveSalesmanId]
          );
        }
        
        console.log('   Existing orders found:', existing?.length || 0);
        
        let orderId;
        
        if (existing.length > 0) {
          console.log('   ⚠️  Order already exists - checking for conflicts...');
          // Conflict resolution: Check timestamps
          const existingOrder = existing[0];
          const serverTimestamp = new Date(existingOrder.updated_at).getTime();
          const mobileTimestamp = new Date(order_date).getTime();
          
          // For SQLite: Skip conflict check since we don't have is_synced column
          // For MySQL: Check if server data is newer and already synced
          const isSynced = useSQLite ? false : existingOrder.is_synced;
          
          if (mobileTimestamp <= serverTimestamp && isSynced) {
            // Server data is newer - skip this order
            console.log('   ⚠️  Skipping: Server data is newer');
            results.conflicts++;
            results.errors.push({
              mobile_order_id,
              error: 'Conflict: Server data is newer'
            });
            continue;
          }
          
          // Update existing order
          const orderDetailsTable = useSQLite ? 'order_items' : 'order_details';
          
          if (useSQLite) {
            // SQLite: no route_id, is_synced, sync_status, synced_at, last_modified
            // Uses discount_amount instead of discount
            await connection.query(
              `UPDATE orders 
               SET shop_id = ?, order_date = ?, total_amount = ?, discount_amount = ?, net_amount = ?, notes = ?
               WHERE id = ?`,
              [shop_id, order_date, total_amount, discount, net_amount, notes, existingOrder.id]
            );
          } else {
            // MySQL: has all sync-related columns
            await connection.query(
              `UPDATE orders 
               SET shop_id = ?, route_id = ?, order_date = ?, total_amount = ?, discount = ?, net_amount = ?, 
                   notes = ?, is_synced = TRUE, sync_status = 'synced', synced_at = NOW(), last_modified = NOW()
               WHERE id = ?`,
              [shop_id, route_id, order_date, total_amount, discount, net_amount, notes, existingOrder.id]
            );
          }
          
          orderId = existingOrder.id;
          
          // Delete existing items
          await connection.query(`DELETE FROM ${orderDetailsTable} WHERE order_id = ?`, [orderId]);
        } else {
          // Log stock levels for visibility (but do NOT block order creation)
          // Mobile sync should always accept orders - stock validation happens at fulfillment
          if (items && items.length > 0) {
            for (const item of items) {
              const [stockCheck] = await connection.query(
                'SELECT product_name, stock_quantity, reserved_stock FROM products WHERE id = ?',
                [item.product_id]
              );
              
              if (stockCheck.length === 0) {
                throw new Error(`Product ID ${item.product_id} not found`);
              }
              
              const product = stockCheck[0];
              const reservedStock = parseFloat(product.reserved_stock) || 0;
              const availableStock = product.stock_quantity - reservedStock;
              
              console.log(`   📦 Stock check for ${product.product_name}: stock=${product.stock_quantity}, reserved=${reservedStock}, available=${availableStock}, needed=${item.quantity}`);
              
              if (availableStock < item.quantity) {
                console.warn(`   ⚠️ Low/insufficient stock for ${product.product_name}: Available ${availableStock}, Required ${item.quantity} - order will still be accepted`);
              }
            }
          }
          
          // Generate order number
          console.log('   🎯 Generating new order number...');
          const orderNumber = await generateOrderNumber(connection);
          console.log('   ✅ Order number:', orderNumber);
          
          // Check if using SQLite (different schema from MySQL)
          const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';
          console.log('   📊 Database:', useSQLite ? 'SQLite' : 'MySQL');
          
          let insertResult;
          if (useSQLite) {
            console.log('   💾 Inserting order (SQLite schema)...');
            // SQLite: no route_id, mobile_order_id, is_synced, sync_status, synced_at
            // Uses discount_amount instead of discount
            [insertResult] = await connection.query(
              `INSERT INTO orders 
               (order_number, salesman_id, shop_id, order_date, total_amount, discount_amount, net_amount, status, notes) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 'placed', ?)`,
              [orderNumber, effectiveSalesmanId, shop_id, order_date, total_amount, discount, net_amount, notes]
            );
          } else {
            // MySQL: has route_id, mobile_order_id, is_synced, sync_status, synced_at
            [insertResult] = await connection.query(
              `INSERT INTO orders 
               (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, 
                status, notes, mobile_order_id, is_synced, sync_status, synced_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, TRUE, 'synced', NOW())`,
              [orderNumber, effectiveSalesmanId, shop_id, route_id, order_date, total_amount, discount, net_amount, notes, mobile_order_id]
            );
          }
          
          orderId = insertResult.insertId;
        }
        
        // Insert order items
        if (items && items.length > 0) {
          const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';
          const orderDetailsTable = useSQLite ? 'order_items' : 'order_details';
          
          for (const item of items) {
            if (useSQLite) {
              // SQLite: uses discount_percentage, no net_price
              const discount_percentage = item.discount && item.total_price > 0 
                ? (item.discount / item.total_price) * 100 
                : 0;
              
              await connection.query(
                `INSERT INTO ${orderDetailsTable} 
                 (order_id, product_id, quantity, unit_price, total_price, discount_percentage) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price, discount_percentage]
              );
            } else {
              // MySQL: has discount, discount_percentage, and net_price
              const discountAmt = parseFloat(item.discount) || 0;
              const discount_percentage = discountAmt > 0 && item.total_price > 0 
                ? (discountAmt / item.total_price) * 100 
                : 0;
              await connection.query(
                `INSERT INTO ${orderDetailsTable} 
                 (order_id, product_id, quantity, unit_price, total_price, discount, discount_percentage, net_price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price, discountAmt, discount_percentage, item.net_price]
              );
            }
          }
          
          // ================================================================
          // CRITICAL: DEDUCT STOCK IMMEDIATELY FOR REAL-TIME INVENTORY TRACKING
          // This ensures stock counts are updated as soon as orders are synced
          // ================================================================
          console.log('   📦 DEDUCTING STOCK FOR SYNCED ORDER...');
          
          const useSQLiteForStock = process.env.USE_SQLITE === 'true';
          
          // Get default warehouse for stock deduction
          let warehouseId = null;
          try {
            const [defaultWarehouse] = await connection.query(
              `SELECT id FROM warehouses WHERE status = 'active' ORDER BY is_default DESC LIMIT 1`
            );
            if (defaultWarehouse && defaultWarehouse.length > 0) {
              warehouseId = defaultWarehouse[0].id;
              console.log('   🏪 Using warehouse ID:', warehouseId);
            }
          } catch (whErr) {
            console.warn('   ⚠️ Could not get default warehouse:', whErr.message);
          }
          
          for (const item of items) {
            // Get current stock info
            const [stockInfo] = await connection.query(
              'SELECT stock_quantity, reserved_stock, product_name FROM products WHERE id = ?',
              [item.product_id]
            );
            
            if (stockInfo.length > 0) {
              const product = stockInfo[0];
              const stockBefore = parseFloat(product.stock_quantity) || 0;
              const stockAfter = stockBefore - item.quantity;
              
              // ================================================================
              // 1. DEDUCT FROM GLOBAL PRODUCT STOCK (products.stock_quantity)
              // ================================================================
              console.log(`   📦 [GLOBAL] ${product.product_name}: ${stockBefore} → ${stockAfter} (-${item.quantity})`);
              await connection.query(
                'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
              );
              
              // ================================================================
              // 2. DEDUCT FROM WAREHOUSE STOCK (warehouse_stock.quantity)
              // ================================================================
              if (warehouseId) {
                const [warehouseStock] = await connection.query(
                  'SELECT id, quantity FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
                  [warehouseId, item.product_id]
                );
                
                if (warehouseStock && warehouseStock.length > 0) {
                  const wsQty = parseFloat(warehouseStock[0].quantity) || 0;
                  const wsQtyAfter = Math.max(0, wsQty - item.quantity);
                  
                  console.log(`   🏪 [WAREHOUSE] ${product.product_name}: ${wsQty} → ${wsQtyAfter} (-${item.quantity})`);
                  
                  await connection.query(
                    `UPDATE warehouse_stock 
                     SET quantity = quantity - ?, 
                         last_updated = ${useSQLiteForStock ? "datetime('now')" : 'NOW()'}
                     WHERE warehouse_id = ? AND product_id = ?`,
                    [item.quantity, warehouseId, item.product_id]
                  );
                } else {
                  console.log(`   ⚠️ [WAREHOUSE] Product ${item.product_id} not in warehouse ${warehouseId}`);
                }
              }
              
              // Log stock movement - ONLY for MySQL (SQLite doesn't have stock_movements table)
              if (!useSQLiteForStock) {
                const reservedStock = parseFloat(product.reserved_stock) || 0;
                await connection.query(
                  `INSERT INTO stock_movements (
                    product_id, movement_type, quantity,
                    stock_before, stock_after, reserved_before, reserved_after,
                    available_before, available_after, reference_type, reference_id,
                    reference_number, notes, created_by
                  ) VALUES (?, 'SALE', ?, ?, ?, ?, ?, ?, ?, 'order', ?, ?, ?, NULL)`,
                  [
                    item.product_id,
                    item.quantity,
                    stockBefore,
                    stockAfter,
                    reservedStock,
                    reservedStock,
                    stockBefore - reservedStock,
                    stockAfter - reservedStock,
                    orderId,
                    mobile_order_id || `Order ${orderId}`,
                    `Stock deducted for synced order ${mobile_order_id || orderId}`
                  ]
                );
              }
            }
          }
          
          console.log('   ✅ Stock deducted successfully for all items');
          
          // Update order with warehouse_id if we have one
          if (warehouseId) {
            await connection.query(
              'UPDATE orders SET warehouse_id = ? WHERE id = ?',
              [warehouseId, orderId]
            );
          }
          
          // Mark order as having stock deducted - ONLY for MySQL (SQLite schema doesn't have this column)
          const useSQLiteForReserved = process.env.USE_SQLITE === 'true';
          if (!useSQLiteForReserved) {
            await connection.query(
              'UPDATE orders SET stock_reserved = TRUE WHERE id = ?',
              [orderId]
            );
          } else {
            console.log('   ℹ️  SQLite mode - skipping stock_reserved flag update');
          }
        }
        
        results.success++;
        // Track synced order for mobile response
        results.synced_orders.push({
          mobile_order_id: orderData.mobile_order_id,
          backend_id: orderId,
          order_number: orderData.order_number || `ORD-${orderId}`,
          status: 'synced'
        });
      } catch (itemError) {
        results.failed++;
        results.errors.push({
          mobile_order_id: orderData.mobile_order_id,
          error: itemError.message
        });
      }
    }
    
    await connection.commit();
    
    const duration = Date.now() - startTime;
    
    // Log sync event (after commit - not in transaction)
    try {
      await connection.query(
        `INSERT INTO sync_logs 
         (salesman_id, entity_type, action, status, records_count, sync_duration, device_info, timestamp) 
         VALUES (?, 'order', 'upload', ?, ?, ?, ?, NOW())`,
        [effectiveSalesmanId, results.failed === 0 ? 'success' : 'partial', results.success, duration, JSON.stringify(device_info)]
      );
      
      // Update sync statistics
      await updateSyncStatistics(connection, effectiveSalesmanId, 'orders_uploaded', results.success);
    } catch (logError) {
      console.warn('Failed to log sync event:', logError.message);
      // Don't fail the response if logging fails
    }
    
    res.json({
      success: true,
      message: `Synced ${results.success}/${results.total} orders successfully`,
      results,
      sync_duration_ms: duration
    });
    
  } catch (error) {
    // Only rollback if we're still in a transaction
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.warn('Rollback warning (transaction may have already been committed):', rollbackError.message);
    }
    
    console.error('Sync orders error:', error);
    
    // Log failure (not in transaction)
    try {
      await connection.query(
        `INSERT INTO sync_logs 
         (salesman_id, entity_type, action, status, error_message, timestamp) 
         VALUES (?, 'order', 'upload', 'failed', ?, NOW())`,
        [req.body.salesman_id || null, error.message]
      );
    } catch (logError) {
      console.warn('Failed to log sync error:', logError.message);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
      error: error.message
    });
  } finally {
    connection.release();
  }
};

/**
 * GET /api/mobile/sync/products?last_sync=2025-01-01T00:00:00Z
 * Get products updated after last_sync timestamp (incremental sync)
 */
exports.getProducts = async (req, res) => {
  try {
    const { last_sync } = req.query;
    const salesman_id = req.user?.id || req.query.salesman_id; // From auth middleware
    
    const startTime = Date.now();
    
    let query = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];
    
    if (last_sync) {
      query += ' AND updated_at > ?';
      params.push(last_sync);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const [products] = await db.query(query, params);
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    if (salesman_id) {
      await db.query(
        `INSERT INTO sync_logs 
         (salesman_id, entity_type, action, status, records_count, sync_duration, timestamp) 
         VALUES (?, 'product', 'download', 'success', ?, ?, NOW())`,
        [salesman_id, products.length, duration]
      );
      
      await updateSyncStatistics(null, salesman_id, 'products_downloaded', products.length);
    }
    
    res.json({
      success: true,
      products,
      count: products.length,
      sync_duration_ms: duration,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

/**
 * GET /api/mobile/sync/shops?last_sync=2025-01-01T00:00:00Z&salesman_id=1
 * Get shops assigned to salesman, updated after last_sync
 */
exports.getShops = async (req, res) => {
  try {
    const { last_sync, salesman_id } = req.query;
    
    if (!salesman_id) {
      return res.status(400).json({
        success: false,
        message: 'salesman_id is required'
      });
    }
    
    const startTime = Date.now();
    
    let query = `
      SELECT * 
      FROM shops 
      WHERE salesman_id = ? AND is_active = 1
    `;
    const params = [salesman_id];
    
    if (last_sync) {
      query += ' AND updated_at > ?';
      params.push(last_sync);
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const [shops] = await db.query(query, params);
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    await db.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, sync_duration, timestamp) 
       VALUES (?, 'shop', 'download', 'success', ?, ?, NOW())`,
      [salesman_id, shops.length, duration]
    );
    
    await updateSyncStatistics(null, salesman_id, 'shops_downloaded', shops.length);
    
    res.json({
      success: true,
      shops,
      count: shops.length,
      sync_duration_ms: duration,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get shops error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shops',
      error: error.message
    });
  }
};

/**
 * GET /api/mobile/sync/routes?last_sync=2025-01-01T00:00:00Z&salesman_id=1
 * Get routes assigned to salesman, updated after last_sync
 */
exports.getRoutes = async (req, res) => {
  try {
    const { last_sync, salesman_id } = req.query;
    
    if (!salesman_id) {
      return res.status(400).json({
        success: false,
        message: 'salesman_id is required'
      });
    }
    
    const startTime = Date.now();
    
    let query = `
      SELECT r.* 
      FROM routes r
      INNER JOIN route_assignments ra ON r.id = ra.route_id
      WHERE ra.salesman_id = ? AND r.status = 'active'
    `;
    const params = [salesman_id];
    
    if (last_sync) {
      query += ' AND r.updated_at > ?';
      params.push(last_sync);
    }
    
    query += ' ORDER BY r.updated_at DESC';
    
    const [routes] = await db.query(query, params);
    
    const duration = Date.now() - startTime;
    
    // Log sync event
    await db.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, sync_duration, timestamp) 
       VALUES (?, 'route', 'download', 'success', ?, ?, NOW())`,
      [salesman_id, routes.length, duration]
    );
    
    await updateSyncStatistics(null, salesman_id, 'routes_downloaded', routes.length);
    
    res.json({
      success: true,
      routes,
      count: routes.length,
      sync_duration_ms: duration,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      error: error.message
    });
  }
};

/**
 * POST /api/mobile/sync/status
 * Log sync status from mobile device
 * 
 * Request Body:
 * {
 *   salesman_id: number,
 *   entity_type: 'order' | 'product' | 'shop' | 'route',
 *   action: 'upload' | 'download',
 *   status: 'success' | 'failed',
 *   records_count: number,
 *   error_message: string,
 *   device_info: object
 * }
 */
exports.logSyncStatus = async (req, res) => {
  try {
    const { salesman_id, entity_type, action, status, records_count, error_message, device_info, sync_duration } = req.body;
    
    if (!salesman_id || !entity_type || !action || !status) {
      return res.status(400).json({
        success: false,
        message: 'salesman_id, entity_type, action, and status are required'
      });
    }
    
    await db.query(
      `INSERT INTO sync_logs 
       (salesman_id, entity_type, action, status, records_count, error_message, sync_duration, device_info, timestamp) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [salesman_id, entity_type, action, status, records_count || 0, error_message, sync_duration, JSON.stringify(device_info)]
    );
    
    // Update statistics
    if (status === 'success') {
      await updateSyncStatistics(null, salesman_id, 'successful_syncs', 1);
    } else {
      await updateSyncStatistics(null, salesman_id, 'failed_syncs', 1);
    }
    
    res.json({
      success: true,
      message: 'Sync status logged successfully'
    });
    
  } catch (error) {
    console.error('Log sync status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log sync status',
      error: error.message
    });
  }
};

/**
 * GET /api/mobile/sync/statistics/:salesman_id
 * Get sync statistics for a salesman
 */
exports.getSyncStatistics = async (req, res) => {
  try {
    const { salesman_id } = req.params;
    const { days = 7 } = req.query;
    
    const [stats] = await db.query(
      `SELECT * FROM sync_statistics 
       WHERE salesman_id = ? 
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY date DESC`,
      [salesman_id, days]
    );
    
    // Get recent sync logs
    const [recentLogs] = await db.query(
      `SELECT * FROM sync_logs 
       WHERE salesman_id = ? 
       ORDER BY timestamp DESC 
       LIMIT 20`,
      [salesman_id]
    );
    
    res.json({
      success: true,
      statistics: stats,
      recent_logs: recentLogs
    });
    
  } catch (error) {
    console.error('Get sync statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sync statistics',
      error: error.message
    });
  }
};

/**
 * Helper: Generate unique order number
 */
async function generateOrderNumber(connection) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  const [result] = await connection.query(
    "SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_number DESC LIMIT 1",
    [`ORD-${dateStr}-%`]
  );
  
  let sequence = 1;
  if (result.length > 0) {
    const lastNumber = result[0].order_number;
    const lastSequence = parseInt(lastNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  return `ORD-${dateStr}-${String(sequence).padStart(5, '0')}`;
}

/**
 * Helper: Update sync statistics
 */
async function updateSyncStatistics(connection, salesman_id, field, increment) {
  const conn = connection || db;
  
  // Map field names to actual column names in sync_statistics table
  const columnMap = {
    'orders_uploaded': 'total_orders',
    'products_synced': 'successful_syncs',
    'shops_synced': 'successful_syncs',
    'routes_synced': 'successful_syncs'
  };
  const actualColumn = columnMap[field] || 'total_orders';
  
  try {
    await conn.query(
      `INSERT INTO sync_statistics (salesman_id, date, ${actualColumn}, total_syncs, successful_syncs)
       VALUES (?, CURDATE(), ?, 1, ?)
       ON DUPLICATE KEY UPDATE 
         ${actualColumn} = ${actualColumn} + ?,
         total_syncs = total_syncs + 1,
         successful_syncs = successful_syncs + ?`,
      [salesman_id, increment, increment, increment, increment]
    );
  } catch (err) {
    console.warn('Failed to update sync statistics:', err.message);
  }
}

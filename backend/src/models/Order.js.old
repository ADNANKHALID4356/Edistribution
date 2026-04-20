/**
 * Order Model
 * Sprint 5: Order Management System
 * Company: Ummahtechinnovations.com
 */

const db = require('../config/database');

// Detect which database is being used and set table name accordingly
// SQLite uses 'order_items', MySQL uses 'order_details'
const useSQLite = process.env.USE_SQLITE === 'true';
const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';

console.log(`📊 Order Model: Using "${ORDER_DETAILS_TABLE}" table for order details (USE_SQLITE=${process.env.USE_SQLITE})`);

const Order = {
  /**
   * Generate unique order number per salesman
   * Format: ORD-YYYYMMDD-SXXX-NNNNN
   * - YYYYMMDD: Order date
   * - SXXX: Salesman ID (e.g., S001, S014)
   * - NNNNN: Sequential number for this salesman on this date
   */
  async generateOrderNumber(orderDate = new Date(), salesmanId) {
    const date = new Date(orderDate);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const salesmanPrefix = `S${String(salesmanId).padStart(3, '0')}`;
    
    console.log('🔍 [BACKEND MODEL] Generating order number for:');
    console.log('   📅 Date:', dateStr);
    console.log('   👤 Salesman ID:', salesmanId, '-> Prefix:', salesmanPrefix);
    
    // Get the highest order number for THIS SALESMAN on THIS DATE
    const orderPrefix = `ORD-${dateStr}-${salesmanPrefix}`;
    console.log('   🔍 Searching for orders like:', `${orderPrefix}%`);
    
    const [result] = await db.query(
      `SELECT order_number 
       FROM orders 
       WHERE salesman_id = ? 
         AND order_number LIKE ? 
       ORDER BY order_number DESC 
       LIMIT 1`,
      [salesmanId, `${orderPrefix}%`]
    );
    
    let orderCount = 0;
    if (result && result.length > 0) {
      // Extract the sequence number (e.g., "ORD-20251119-S014-00001" -> 1)
      const lastOrderNumber = result[0].order_number;
      const matches = lastOrderNumber.match(/-(\d{5})$/);
      if (matches) {
        orderCount = parseInt(matches[1]);
      }
      console.log('   ✅ Last order found:', lastOrderNumber, '-> count:', orderCount);
    } else {
      console.log('   ℹ️  No previous orders found for this salesman on this date');
    }
    
    orderCount += 1;
    const paddedCount = String(orderCount).padStart(5, '0');
    const newOrderNumber = `${orderPrefix}-${paddedCount}`;
    
    console.log('   🎯 Generated order number:', newOrderNumber);
    console.log('   ✅ Order number is UNIQUE for Salesman', salesmanId);
    
    return newOrderNumber;
  },

  /**
   * Create a new order with details
   */
  async create(orderData) {
    console.log('\n🔍 [BACKEND MODEL] ========== Order.create() called ==========');
    console.log('🔍 [BACKEND MODEL] Order data received:', JSON.stringify(orderData, null, 2));
    
    const {
      salesman_id,
      shop_id,
      route_id = null,
      order_date = new Date(),
      total_amount,
      discount = 0,
      net_amount,
      status = 'placed',
      notes = '',
      items = [] // Array of {product_id, quantity, unit_price, total_price, discount, net_price}
    } = orderData;

    console.log('🔍 [BACKEND MODEL] Extracted values:', {
      salesman_id,
      shop_id,
      route_id,
      order_date,
      total_amount,
      discount,
      net_amount,
      status,
      notes,
      itemsCount: items.length
    });

    // ============================================================
    // CRITICAL: CHECK STOCK AVAILABILITY BEFORE CREATING ORDER
    // This prevents orders from being created when stock is insufficient
    // ============================================================
    if (items && items.length > 0) {
      console.log('\n🔍 [BACKEND MODEL] Validating stock availability before order creation...');
      const Product = require('./Product');
      
      try {
        const stockCheck = await Product.checkStockAvailability(items);
        
        if (!stockCheck.available) {
          // Build detailed error message
          const insufficientDetails = [];
          for (const insufficient of stockCheck.insufficientItems) {
            if (insufficient.error) {
              insufficientDetails.push(`Product ID ${insufficient.product_id}: ${insufficient.error}`);
            } else {
              // Get product name for better error message
              const [product] = await db.query('SELECT product_name FROM products WHERE id = ?', [insufficient.product_id]);
              const productName = product[0] ? product[0].product_name : `Product ID ${insufficient.product_id}`;
              insufficientDetails.push(
                `${productName}: Available ${insufficient.available}, Required ${insufficient.required}`
              );
            }
          }
          
          const errorMessage = `Insufficient stock: ${insufficientDetails.join('; ')}`;
          console.error('❌ [BACKEND MODEL] Insufficient stock for order');
          console.error('   Details:', errorMessage);
          
          throw new Error(errorMessage);
        }
        
        console.log('✅ [BACKEND MODEL] Stock availability validated - all items available');
      } catch (error) {
        console.error('❌ [BACKEND MODEL] Stock validation failed:', error.message);
        throw error;
      }
    }

    const connection = await db.getConnection();
    console.log('🔍 [BACKEND MODEL] Database connection obtained');
    
    try {
      console.log('🔍 [BACKEND MODEL] Starting transaction...');
      await connection.beginTransaction();
      console.log('✅ [BACKEND MODEL] Transaction started successfully');

      // Declare variables outside try blocks so they're accessible later
      let order_number;
      let mysqlOrderDate;
      let orderResult;

      // Generate order number if not provided (pass order_date AND salesman_id for unique numbering)
      console.log('🔍 [BACKEND MODEL] Generating order number for:');
      console.log('   📅 Date:', order_date);
      console.log('   👤 Salesman ID:', salesman_id);
      try {
        order_number = orderData.order_number || await this.generateOrderNumber(order_date, salesman_id);
        console.log('✅ [BACKEND MODEL] Order number generated:', order_number);
      } catch (genError) {
        console.error('❌ [BACKEND MODEL] Failed to generate order number:', genError);
        throw new Error(`Order number generation failed: ${genError.message}`);
      }

      // Convert ISO datetime to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      console.log('🔍 [BACKEND MODEL] Converting datetime:', order_date);
      try {
        mysqlOrderDate = new Date(order_date).toISOString().slice(0, 19).replace('T', ' ');
        console.log('✅ [BACKEND MODEL] Converted datetime:', order_date, '->', mysqlOrderDate);
      } catch (dateError) {
        console.error('❌ [BACKEND MODEL] Failed to convert date:', dateError);
        throw new Error(`Date conversion failed: ${dateError.message}`);
      }

      // Insert order
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 [BACKEND MODEL] Preparing to INSERT into orders table...');
      console.log('🔍 [BACKEND MODEL] Validating SQL Parameters:');
      const insertParams = [order_number, salesman_id, shop_id, route_id, mysqlOrderDate, total_amount, discount, net_amount, status, notes];
      console.log('🔍 [BACKEND MODEL] Parameter 1 (order_number):', order_number, typeof order_number);
      console.log('🔍 [BACKEND MODEL] Parameter 2 (salesman_id):', salesman_id, typeof salesman_id);
      console.log('🔍 [BACKEND MODEL] Parameter 3 (shop_id):', shop_id, typeof shop_id);
      console.log('🔍 [BACKEND MODEL] Parameter 4 (route_id):', route_id, typeof route_id);
      console.log('🔍 [BACKEND MODEL] Parameter 5 (order_date):', mysqlOrderDate, typeof mysqlOrderDate);
      console.log('🔍 [BACKEND MODEL] Parameter 6 (total_amount):', total_amount, typeof total_amount);
      console.log('🔍 [BACKEND MODEL] Parameter 7 (discount):', discount, typeof discount);
      console.log('🔍 [BACKEND MODEL] Parameter 8 (net_amount):', net_amount, typeof net_amount);
      console.log('🔍 [BACKEND MODEL] Parameter 9 (status):', status, typeof status);
      console.log('🔍 [BACKEND MODEL] Parameter 10 (notes):', notes, typeof notes);
      
      console.log('🔍 [BACKEND MODEL] Executing INSERT query...');
      try {
        // Get default warehouse_id (use warehouse_id from orderData if provided, else get default warehouse)
        let warehouse_id = orderData.warehouse_id || null;
        if (!warehouse_id) {
          console.log('🔍 [BACKEND MODEL] No warehouse_id provided, fetching default warehouse...');
          try {
            // SQLite uses 1/0 for boolean, MySQL uses TRUE/FALSE - use 1 for compatibility
            const [defaultWarehouse] = await connection.query(
              `SELECT id FROM warehouses WHERE (is_default = 1 OR is_default = ${useSQLite ? "'1'" : 'TRUE'}) AND status = ? ORDER BY is_default DESC LIMIT 1`,
              ['active']
            );
            if (defaultWarehouse && defaultWarehouse.length > 0) {
              warehouse_id = defaultWarehouse[0].id;
              console.log('✅ [BACKEND MODEL] Using default/active warehouse ID:', warehouse_id);
            } else {
              // If no active warehouse found, try any warehouse
              const [anyWarehouse] = await connection.query('SELECT id FROM warehouses LIMIT 1');
              if (anyWarehouse && anyWarehouse.length > 0) {
                warehouse_id = anyWarehouse[0].id;
                console.log('✅ [BACKEND MODEL] Using first available warehouse ID:', warehouse_id);
              } else {
                console.log('⚠️ [BACKEND MODEL] No warehouses found, warehouse_id will be NULL');
              }
            }
          } catch (whError) {
            console.warn('⚠️ [BACKEND MODEL] Could not fetch default warehouse:', whError.message);
          }
        }
        
        // Use module-level useSQLite variable (declared at line 11)
        
        let insertQuery, insertParams;
        
        if (useSQLite) {
          // SQLite schema: no route_id, no synced_at, uses discount_amount instead of discount
          console.log('🔍 [BACKEND MODEL] Using SQLite schema (no route_id, no synced_at)');
          insertParams = [order_number, salesman_id, shop_id, warehouse_id, mysqlOrderDate, total_amount, discount, net_amount, status, notes];
          insertQuery = `INSERT INTO orders 
           (order_number, salesman_id, shop_id, warehouse_id, order_date, total_amount, discount_amount, net_amount, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        } else {
          // MySQL schema: has route_id, synced_at, uses discount
          console.log('🔍 [BACKEND MODEL] Using MySQL schema (with route_id, synced_at)');
          insertParams = [order_number, salesman_id, shop_id, warehouse_id, route_id, mysqlOrderDate, total_amount, discount, net_amount, status, notes];
          insertQuery = `INSERT INTO orders 
           (order_number, salesman_id, shop_id, warehouse_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;
        }
        
        console.log('🔍 [BACKEND MODEL] Insert params:', insertParams);
        
        [orderResult] = await connection.query(insertQuery, insertParams);
        console.log('✅ [BACKEND MODEL] INSERT query executed successfully');
        console.log('🔍 [BACKEND MODEL] Insert result:', JSON.stringify(orderResult, null, 2));
      } catch (insertError) {
        console.error('❌❌❌ [BACKEND MODEL] INSERT FAILED ❌❌❌');
        console.error('🔍 [BACKEND MODEL] Insert error code:', insertError.code);
        console.error('🔍 [BACKEND MODEL] Insert error errno:', insertError.errno);
        console.error('🔍 [BACKEND MODEL] Insert error message:', insertError.message);
        console.error('🔍 [BACKEND MODEL] Insert error SQL:', insertError.sql);
        console.error('🔍 [BACKEND MODEL] Parameters that caused error:', insertParams);
        throw insertError;
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const orderId = orderResult.insertId;
      console.log('✅ [BACKEND MODEL] Order inserted with ID:', orderId);

      // Insert order details
      if (items && items.length > 0) {
        console.log(`\n🔍 [BACKEND MODEL] Preparing to insert ${items.length} order items...`);
        try {
          // Use module-level useSQLite variable (declared at line 11)
          
          if (useSQLite) {
            // SQLite: Insert items one by one (no batch VALUES ? support)
            // SQLite schema: has discount_percentage, no net_price, no discount column
            console.log('🔍 [BACKEND MODEL] Using SQLite - inserting items individually');
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              console.log(`🔍 [BACKEND MODEL] Inserting Item ${i + 1}/${items.length}:`, JSON.stringify(item));
              
              // Validate item
              if (!item.product_id) {
                throw new Error(`Item ${i + 1}: product_id is required`);
              }
              if (!item.quantity) {
                throw new Error(`Item ${i + 1}: quantity is required`);
              }
              if (item.unit_price === undefined || item.unit_price === null) {
                throw new Error(`Item ${i + 1}: unit_price is required`);
              }
              
              // Calculate discount_percentage from discount amount
              const discount_percentage = item.discount && item.total_price > 0 
                ? (item.discount / item.total_price) * 100 
                : 0;
              
              await connection.query(
                `INSERT INTO ${ORDER_DETAILS_TABLE} 
                 (order_id, product_id, quantity, unit_price, total_price, discount_percentage)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.unit_price, item.total_price, discount_percentage]
              );
            }
            console.log('✅ [BACKEND MODEL] All order items inserted successfully (SQLite)');
          } else {
            // MySQL: Batch insert with VALUES ?
            // MySQL schema: has discount, discount_percentage, and net_price columns
            console.log('🔍 [BACKEND MODEL] Using MySQL - batch inserting items');
            const detailValues = items.map((item, index) => {
              console.log(`🔍 [BACKEND MODEL] Validating Item ${index + 1}:`, JSON.stringify(item));
              
              // Validate item
              if (!item.product_id) {
                throw new Error(`Item ${index + 1}: product_id is required`);
              }
              if (!item.quantity) {
                throw new Error(`Item ${index + 1}: quantity is required`);
              }
              if (item.unit_price === undefined || item.unit_price === null) {
                throw new Error(`Item ${index + 1}: unit_price is required`);
              }
              
              // Calculate discount_percentage from discount amount
              const discountAmt = parseFloat(item.discount) || 0;
              const discount_percentage = item.discount_percentage 
                ? parseFloat(item.discount_percentage) 
                : (discountAmt > 0 && item.total_price > 0 ? (discountAmt / item.total_price) * 100 : 0);
              
              return [
                orderId,
                item.product_id,
                item.quantity,
                item.unit_price,
                item.total_price,
                discountAmt,
                discount_percentage,
                item.net_price
              ];
            });
            
            console.log('🔍 [BACKEND MODEL] All items validated successfully');
            console.log(`🔍 [BACKEND MODEL] Executing batch INSERT for ${ORDER_DETAILS_TABLE}...`);

            const [detailResult] = await connection.query(
              `INSERT INTO ${ORDER_DETAILS_TABLE} 
               (order_id, product_id, quantity, unit_price, total_price, discount, discount_percentage, net_price)
               VALUES ?`,
              [detailValues]
            );
            console.log('✅ [BACKEND MODEL] Order details inserted successfully (MySQL)');
            console.log('🔍 [BACKEND MODEL] Details insert result:', JSON.stringify(detailResult, null, 2));
          }
        } catch (detailError) {
          console.error('❌❌❌ [BACKEND MODEL] ORDER DETAILS INSERT FAILED ❌❌❌');
          console.error('🔍 [BACKEND MODEL] Detail error:', detailError.message);
          console.error('🔍 [BACKEND MODEL] Detail error code:', detailError.code);
          console.error('🔍 [BACKEND MODEL] Detail error SQL:', detailError.sql);
          throw detailError;
        }
      } else {
        console.log('⚠️  [BACKEND MODEL] No items to insert');
      }

      console.log('\n🔍 [BACKEND MODEL] Deducting stock for order BEFORE committing...');
      // CRITICAL: Deduct stock INLINE within this transaction
      // This ensures inventory is properly tracked when orders are created
      // If deduction fails, entire order creation will be rolled back
      
      for (const item of items) {
        // Get current stock levels from products table
        const [stockCheck] = await connection.query(
          'SELECT stock_quantity, product_name FROM products WHERE id = ?',
          [item.product_id]
        );
        
        if (!stockCheck || stockCheck.length === 0) {
          throw new Error(`Product ID ${item.product_id} not found`);
        }
        
        const product = stockCheck[0];
        const available = product.stock_quantity;
        
        // Double-check availability (should already be validated above, but be safe)
        if (available < item.quantity) {
          throw new Error(
            `Insufficient stock for ${product.product_name}. ` +
            `Available: ${available}, Required: ${item.quantity}`
          );
        }
        
        // ================================================================
        // DEDUCT STOCK FROM PRODUCTS TABLE
        // ================================================================
        console.log(`📦 [STOCK] Deducting ${item.quantity} units of ${product.product_name} from global stock`);
        await connection.query(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
        console.log(`✅ [STOCK] Global stock updated: ${available} -> ${available - item.quantity}`);
        
        // ================================================================
        // DEDUCT STOCK FROM WAREHOUSE_STOCK TABLE (if warehouse assigned)
        // ================================================================
        if (warehouse_id) {
          // Check if product exists in this warehouse
          const [warehouseStock] = await connection.query(
            'SELECT id, quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
            [warehouse_id, item.product_id]
          );
          
          if (warehouseStock && warehouseStock.length > 0) {
            const wsRecord = warehouseStock[0];
            const wsAvailable = wsRecord.quantity - (wsRecord.reserved_quantity || 0);
            
            if (wsAvailable >= item.quantity) {
              // Deduct from warehouse stock
              console.log(`🏪 [WAREHOUSE] Deducting ${item.quantity} units from warehouse ${warehouse_id}`);
              await connection.query(`
                UPDATE warehouse_stock 
                SET quantity = quantity - ?,
                    last_updated = ${useSQLite ? "datetime('now')" : 'NOW()'}
                WHERE warehouse_id = ? AND product_id = ?
              `, [item.quantity, warehouse_id, item.product_id]);
              console.log(`✅ [WAREHOUSE] Warehouse stock updated: ${wsRecord.quantity} -> ${wsRecord.quantity - item.quantity}`);
            } else {
              console.log(`⚠️ [WAREHOUSE] Insufficient warehouse stock (${wsAvailable}), but global stock OK. Allowing order.`);
            }
          } else {
            console.log(`⚠️ [WAREHOUSE] Product ${item.product_id} not in warehouse ${warehouse_id}, but global stock OK. Allowing order.`);
          }
        }
      }
      
      // Mark order as having stock deducted (only for MySQL, SQLite doesn't have this column)
      // Use module-level useSQLite variable (line 11)
      if (!useSQLite) {
        await connection.query(
          'UPDATE orders SET stock_reserved = TRUE WHERE id = ?',
          [orderId]
        );
        console.log('✅ [BACKEND MODEL] Stock deducted flag set');
      } else {
        console.log('ℹ️  [BACKEND MODEL] SQLite mode - skipping stock_reserved flag');
      }
      
      console.log('✅ [BACKEND MODEL] Stock deducted successfully');

      console.log('\n🔍 [BACKEND MODEL] Committing transaction...');
      try {
        await connection.commit();
        console.log('✅ [BACKEND MODEL] Transaction committed successfully');
      } catch (commitError) {
        console.error('❌ [BACKEND MODEL] Failed to commit transaction:', commitError);
        throw commitError;
      }
      
      console.log('🎉 [BACKEND MODEL] ========== Order.create() complete ==========\n');

      return { id: orderId, order_number, ...orderData };
    } catch (error) {
      await connection.rollback();
      console.error('\n❌❌❌ [BACKEND MODEL] ERROR OCCURRED ❌❌❌');
      console.error('❌ [BACKEND MODEL] Transaction rolled back');
      console.error('⏰ Error timestamp:', new Date().toISOString());
      console.error('🔍 [BACKEND MODEL] Error name:', error.name);
      console.error('🔍 [BACKEND MODEL] Error message:', error.message);
      console.error('🔍 [BACKEND MODEL] Error code:', error.code);
      console.error('🔍 [BACKEND MODEL] SQL errno:', error.errno);
      console.error('🔍 [BACKEND MODEL] SQL state:', error.sqlState);
      console.error('🔍 [BACKEND MODEL] SQL message:', error.sqlMessage);
      console.error('🔍 [BACKEND MODEL] SQL query:', error.sql);
      console.error('🔍 [BACKEND MODEL] Error stack:', error.stack);
      console.error('🔍 [BACKEND MODEL] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      console.error('❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌❌\n');
      throw error;
    } finally {
      connection.release();
      console.log('🔍 [BACKEND MODEL] Database connection released');
    }
  },

  /**
   * Find all orders with optional filters and pagination
   */
  async findAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      salesman_id = '',
      shop_id = '',
      route_id = '',
      start_date = '',
      end_date = '',
      sortBy = 'order_date',
      sortOrder = 'DESC'
    } = filters;

    let query = `
      SELECT 
        o.*,
        s.salesman_code,
        s.full_name as salesman_name,
        sh.shop_name,
        sh.owner_name,
        COUNT(od.id) as items_count,
        ${useSQLite 
          ? `GROUP_CONCAT(p.product_name || ' (' || od.quantity || ')', ', ')`
          : `GROUP_CONCAT(CONCAT(p.product_name, ' (', od.quantity, ')') SEPARATOR ', ')`
        } as products_summary
      FROM orders o
      LEFT JOIN salesmen s ON o.salesman_id = s.id
      LEFT JOIN shops sh ON o.shop_id = sh.id
      LEFT JOIN ${ORDER_DETAILS_TABLE} od ON o.id = od.order_id
      LEFT JOIN products p ON od.product_id = p.id
      WHERE 1=1
    `;

    const params = [];

    // Search filter
    if (search) {
      query += ` AND (o.order_number LIKE ? OR sh.shop_name LIKE ? OR s.full_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Status filter
    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    // Salesman filter
    if (salesman_id) {
      query += ` AND o.salesman_id = ?`;
      params.push(salesman_id);
    }

    // Shop filter
    if (shop_id) {
      query += ` AND o.shop_id = ?`;
      params.push(shop_id);
    }

    // Route filter (only for MySQL, SQLite doesn't have route_id)
    if (route_id && !useSQLite) {
      query += ` AND o.route_id = ?`;
      params.push(route_id);
    }

    // Date range filter
    if (start_date) {
      query += ` AND DATE(o.order_date) >= ?`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND DATE(o.order_date) <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY o.id`;

    // Sorting
    const allowedSortFields = ['order_date', 'order_number', 'net_amount', 'status', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'order_date';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY o.${sortField} ${order}`;

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT o.id) as total FROM orders o 
                        LEFT JOIN shops sh ON o.shop_id = sh.id 
                        LEFT JOIN salesmen s ON o.salesman_id = s.id
                        WHERE 1=1 ${query.split('WHERE 1=1')[1].split('GROUP BY')[0]}`;
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [orders] = await db.query(query, params);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Find order by ID with details
   */
  async findById(id) {
    const [orders] = await db.query(
      `SELECT 
        o.*,
        s.salesman_code,
        s.full_name as salesman_name,
        s.phone as salesman_phone,
        sh.shop_name,
        sh.owner_name,
        sh.phone as shop_phone,
        sh.address as shop_address
      FROM orders o
      LEFT JOIN salesmen s ON o.salesman_id = s.id
      LEFT JOIN shops sh ON o.shop_id = sh.id
      WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return null;
    }

    const order = orders[0];

    // Normalize SQLite order fields to match MySQL schema
    if (useSQLite && order.discount_amount !== undefined) {
      order.discount = order.discount_amount;
    }

    // Get order details
    const [details] = await db.query(
      `SELECT 
        od.*,
        p.product_name,
        p.product_code,
        p.category,
        p.pieces_per_carton
      FROM ${ORDER_DETAILS_TABLE} od
      LEFT JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?`,
      [id]
    );

    // Normalize SQLite items to match MySQL schema
    if (useSQLite) {
      order.items = details.map(item => {
        // SQLite uses discount_percentage, calculate discount amount
        const discount = item.total_price * ((item.discount_percentage || 0) / 100);
        const net_price = item.total_price - discount;
        
        return {
          ...item,
          discount: discount,
          discount_amount: discount,
          net_price: net_price
        };
      });
    } else {
      // MySQL: Ensure all discount fields are present and normalized
      order.items = details.map(item => {
        // MySQL may have various discount field names - normalize them
        const discount_amount = item.discount_amount || item.discount || 0;
        // Calculate discount_percentage from amount if not stored
        // Use gross total (qty * unit_price) as base, NOT total_price (which is net)
        const grossTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
        const discount_percentage = parseFloat(item.discount_percentage) || 
          (discount_amount > 0 && grossTotal > 0 ? (discount_amount / grossTotal) * 100 : 0);
        const net_price = item.net_price || (item.total_price - discount_amount);
        
        return {
          ...item,
          discount: discount_amount,
          discount_amount: discount_amount,
          discount_percentage: discount_percentage,
          net_price: net_price
        };
      });
    }

    return order;
  },

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber) {
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE order_number = ?`,
      [orderNumber]
    );

    return orders.length > 0 ? orders[0] : null;
  },

  /**
   * Get orders by salesman
   */
  async findBySalesman(salesmanId, filters = {}) {
    const {
      page = 1,
      limit = 10,
      status = '',
      start_date = '',
      end_date = ''
    } = filters;

    let query = `
      SELECT 
        o.*,
        sh.shop_name,
        sh.owner_name,
        COUNT(od.id) as items_count
      FROM orders o
      LEFT JOIN shops sh ON o.shop_id = sh.id
      LEFT JOIN ${ORDER_DETAILS_TABLE} od ON o.id = od.order_id
      WHERE o.salesman_id = ?
    `;

    const params = [salesmanId];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    if (start_date) {
      query += ` AND DATE(o.order_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(o.order_date) <= ?`;
      params.push(end_date);
    }

    query += ` GROUP BY o.id ORDER BY o.order_date DESC`;

    // Get total count
    const countQuery = query.replace('SELECT o.*, sh.shop_name, sh.owner_name, COUNT(od.id) as items_count', 'SELECT COUNT(DISTINCT o.id) as total')
                           .split('GROUP BY')[0];
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [orders] = await db.query(query, params);

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Update order status
   */
  async updateStatus(id, status, notes = '') {
    const [result] = await db.query(
      `UPDATE orders 
       SET status = ?, notes = CONCAT(COALESCE(notes, ''), '\n', ?), updated_at = NOW()
       WHERE id = ?`,
      [status, notes, id]
    );

    return result.affectedRows > 0;
  },

  /**
   * Update order
   */
  async update(id, updateData) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        shop_id,
        route_id,
        total_amount,
        discount,
        net_amount,
        status,
        notes,
        items
      } = updateData;

      // ================================================================
      // STEP 1: RESTORE STOCK FOR OLD ORDER ITEMS
      // ================================================================
      if (items && Array.isArray(items)) {
        console.log('🔄 [ORDER UPDATE] Restoring stock for old items...');
        
        // Get old order items before deletion
        const [oldItems] = await connection.query(
          `SELECT product_id, quantity FROM ${ORDER_DETAILS_TABLE} WHERE order_id = ?`,
          [id]
        );

        // Get order's warehouse_id for warehouse stock updates
        const [orderInfo] = await connection.query(
          'SELECT warehouse_id FROM orders WHERE id = ?',
          [id]
        );
        const warehouse_id = orderInfo && orderInfo.length > 0 ? orderInfo[0].warehouse_id : null;

        // Restore stock for each old item
        for (const oldItem of oldItems) {
          console.log(`📦 [STOCK RESTORE] Restoring ${oldItem.quantity} units of product ${oldItem.product_id}`);
          
          // Restore global stock
          await connection.query(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [oldItem.quantity, oldItem.product_id]
          );
          console.log(`✅ [STOCK RESTORE] Global stock restored for product ${oldItem.product_id}`);

          // Restore warehouse stock if applicable
          if (warehouse_id) {
            const [warehouseStock] = await connection.query(
              'SELECT id FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
              [warehouse_id, oldItem.product_id]
            );

            if (warehouseStock && warehouseStock.length > 0) {
              await connection.query(`
                UPDATE warehouse_stock 
                SET quantity = quantity + ?,
                    last_updated = ${useSQLite ? "datetime('now')" : 'NOW()'}
                WHERE warehouse_id = ? AND product_id = ?
              `, [oldItem.quantity, warehouse_id, oldItem.product_id]);
              console.log(`✅ [WAREHOUSE RESTORE] Warehouse stock restored for product ${oldItem.product_id}`);
            }
          }
        }
      }

      // Update order fields
      const fields = [];
      const values = [];

      if (shop_id !== undefined) {
        fields.push('shop_id = ?');
        values.push(shop_id);
      }
      if (route_id !== undefined) {
        fields.push('route_id = ?');
        values.push(route_id);
      }
      if (total_amount !== undefined) {
        fields.push('total_amount = ?');
        values.push(total_amount);
      }
      if (discount !== undefined) {
        // SQLite uses 'discount_amount', MySQL uses 'discount'
        const discountColumn = useSQLite ? 'discount_amount' : 'discount';
        fields.push(`${discountColumn} = ?`);
        values.push(discount);
      }
      if (net_amount !== undefined) {
        fields.push('net_amount = ?');
        values.push(net_amount);
      }
      if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
      }
      if (notes !== undefined) {
        fields.push('notes = ?');
        values.push(notes);
      }

      if (fields.length > 0) {
        fields.push(useSQLite ? "updated_at = datetime('now')" : 'updated_at = NOW()');
        values.push(id);

        await connection.query(
          `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // ================================================================
      // STEP 2: UPDATE ORDER ITEMS AND DEDUCT NEW STOCK
      // ================================================================
      if (items && Array.isArray(items)) {
        // Delete existing items (stock already restored above)
        await connection.query(`DELETE FROM ${ORDER_DETAILS_TABLE} WHERE order_id = ?`, [id]);

        // Insert updated items and deduct stock
        if (items.length > 0) {
          // Get order's warehouse_id for stock deduction
          const [orderInfo] = await connection.query(
            'SELECT warehouse_id FROM orders WHERE id = ?',
            [id]
          );
          const warehouse_id = orderInfo && orderInfo.length > 0 ? orderInfo[0].warehouse_id : null;

          // Check stock availability for all new items first
          console.log('🔍 [ORDER UPDATE] Checking stock availability for new items...');
          for (const item of items) {
            const [stockCheck] = await connection.query(
              'SELECT stock_quantity, product_name FROM products WHERE id = ?',
              [item.product_id]
            );

            if (!stockCheck || stockCheck.length === 0) {
              throw new Error(`Product ID ${item.product_id} not found`);
            }

            const product = stockCheck[0];
            const available = product.stock_quantity;

            if (available < item.quantity) {
              throw new Error(
                `Insufficient stock for ${product.product_name}. ` +
                `Available: ${available}, Required: ${item.quantity}`
              );
            }
          }

          // Deduct stock for new items
          console.log('📦 [ORDER UPDATE] Deducting stock for new items...');
          for (const item of items) {
            const [stockCheck] = await connection.query(
              'SELECT stock_quantity, product_name FROM products WHERE id = ?',
              [item.product_id]
            );
            
            const product = stockCheck[0];
            const available = product.stock_quantity;

            // Deduct from products table
            console.log(`📦 [STOCK DEDUCT] Deducting ${item.quantity} units of ${product.product_name}`);
            await connection.query(
              'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
              [item.quantity, item.product_id]
            );
            console.log(`✅ [STOCK DEDUCT] Global stock updated: ${available} -> ${available - item.quantity}`);

            // Deduct from warehouse stock if applicable
            if (warehouse_id) {
              const [warehouseStock] = await connection.query(
                'SELECT id, quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
                [warehouse_id, item.product_id]
              );

              if (warehouseStock && warehouseStock.length > 0) {
                const wsRecord = warehouseStock[0];
                const wsAvailable = wsRecord.quantity - (wsRecord.reserved_quantity || 0);

                if (wsAvailable >= item.quantity) {
                  await connection.query(`
                    UPDATE warehouse_stock 
                    SET quantity = quantity - ?,
                        last_updated = ${useSQLite ? "datetime('now')" : 'NOW()'}
                    WHERE warehouse_id = ? AND product_id = ?
                  `, [item.quantity, warehouse_id, item.product_id]);
                  console.log(`✅ [WAREHOUSE DEDUCT] Warehouse stock updated for product ${item.product_id}`);
                } else {
                  console.log(`⚠️ [WAREHOUSE] Insufficient warehouse stock, but global stock OK`);
                }
              }
            }
          }

          // Insert new order items
          if (useSQLite) {
            // SQLite: Individual inserts with discount_percentage (no net_price column)
            console.log('🔍 [ORDER UPDATE] Using SQLite - inserting items individually');
            for (const item of items) {
              // Calculate discount_percentage from discount amount
              const discount_percentage = item.discount && item.total_price > 0 
                ? (item.discount / item.total_price) * 100 
                : 0;
              
              await connection.query(
                `INSERT INTO ${ORDER_DETAILS_TABLE} 
                 (order_id, product_id, quantity, unit_price, total_price, discount_percentage)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [id, item.product_id, item.quantity, item.unit_price, item.total_price, discount_percentage]
              );
            }
            console.log('✅ [ORDER UPDATE] New order items inserted (SQLite)');
          } else {
            // MySQL: Batch insert with discount, discount_percentage, and net_price
            console.log('🔍 [ORDER UPDATE] Using MySQL - batch inserting items');
            const itemValues = items.map(item => {
              const discountAmt = parseFloat(item.discount) || 0;
              const discount_percentage = item.discount_percentage 
                ? parseFloat(item.discount_percentage) 
                : (discountAmt > 0 && item.total_price > 0 ? (discountAmt / item.total_price) * 100 : 0);
              return [
                id,
                item.product_id,
                item.quantity,
                item.unit_price,
                discountAmt,
                discount_percentage,
                item.total_price,
                item.net_price
              ];
            });

            await connection.query(
              `INSERT INTO ${ORDER_DETAILS_TABLE} 
               (order_id, product_id, quantity, unit_price, discount, discount_percentage, total_price, net_price)
               VALUES ?`,
              [itemValues]
            );
            console.log('✅ [ORDER UPDATE] New order items inserted (MySQL)');
          }
        }
      }

      await connection.commit();
      connection.release();

      console.log('✅ [ORDER UPDATE] Order updated with stock adjustments');
      return await this.findById(id);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [ORDER UPDATE] Failed:', error.message);
      throw error;
    }
  },

  /**
   * Delete order (with stock restoration for placed orders)
   */
  async delete(id) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get order details including items before deletion
      const [orders] = await connection.query(
        'SELECT status, warehouse_id FROM orders WHERE id = ?',
        [id]
      );

      if (orders.length === 0) {
        await connection.rollback();
        connection.release();
        return false;
      }

      const order = orders[0];
      const warehouse_id = order.warehouse_id;

      // If order was placed, restore stock
      if (order.status === 'placed') {
        console.log('🔄 [ORDER DELETE] Restoring stock for placed order...');
        
        // Get order items
        const [items] = await connection.query(
          `SELECT product_id, quantity FROM ${ORDER_DETAILS_TABLE} WHERE order_id = ?`,
          [id]
        );

        // Restore stock for each item
        for (const item of items) {
          console.log(`📦 [STOCK RESTORE] Restoring ${item.quantity} units of product ${item.product_id}`);
          
          // Restore global stock
          await connection.query(
            'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
            [item.quantity, item.product_id]
          );
          console.log(`✅ [STOCK RESTORE] Global stock restored for product ${item.product_id}`);

          // Restore warehouse stock if applicable
          if (warehouse_id) {
            const [warehouseStock] = await connection.query(
              'SELECT id FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
              [warehouse_id, item.product_id]
            );

            if (warehouseStock && warehouseStock.length > 0) {
              await connection.query(`
                UPDATE warehouse_stock 
                SET quantity = quantity + ?,
                    last_updated = ${useSQLite ? "datetime('now')" : 'NOW()'}
                WHERE warehouse_id = ? AND product_id = ?
              `, [item.quantity, warehouse_id, item.product_id]);
              console.log(`✅ [WAREHOUSE RESTORE] Warehouse stock restored for product ${item.product_id}`);
            }
          }
        }
      }

      // Clear order_id reference in deliveries (preserve delivery records)
      await connection.query(
        `UPDATE deliveries SET order_id = NULL WHERE order_id = ?`,
        [id]
      );
      console.log('✅ [ORDER DELETE] Order reference cleared from deliveries');

      // Delete order items first (required for SQLite foreign key constraints)
      await connection.query(
        `DELETE FROM ${ORDER_DETAILS_TABLE} WHERE order_id = ?`,
        [id]
      );
      console.log('✅ [ORDER DELETE] Order items deleted');

      // Delete order
      const [result] = await connection.query(
        `DELETE FROM orders WHERE id = ?`,
        [id]
      );

      await connection.commit();
      connection.release();

      console.log('✅ [ORDER DELETE] Order deleted with stock restoration');
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [ORDER DELETE] Failed:', error.message);
      throw error;
    }
  },

  /**
   * Get order statistics
   */
  async getStatistics(filters = {}) {
    const {
      salesman_id = '',
      start_date = '',
      end_date = ''
    } = filters;

    let query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'placed' THEN 1 ELSE 0 END) as placed_orders,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_orders,
        SUM(CASE WHEN status = 'finalized' THEN 1 ELSE 0 END) as finalized_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_orders,
        SUM(CASE WHEN status IN ('finalized', 'delivered') THEN net_amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status IN ('finalized', 'delivered') THEN net_amount ELSE NULL END) as average_order_value
      FROM orders
      WHERE 1=1
    `;

    const params = [];

    if (salesman_id) {
      query += ` AND salesman_id = ?`;
      params.push(salesman_id);
    }

    if (start_date) {
      query += ` AND DATE(order_date) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(order_date) <= ?`;
      params.push(end_date);
    }

    const [stats] = await db.query(query, params);

    return stats[0];
  },

  // ========================================
  // SPRINT 6: Order Processing & Approval Methods
  // ========================================

  /**
   * Update order status with notes
   */
  async updateStatus(id, newStatus, notes = '') {
    console.log(`🔄 [MODEL] Updating order ${id} status to '${newStatus}'`);
    
    try {
      // SQLite-compatible status update
      if (useSQLite) {
        await db.query(
          `UPDATE orders 
           SET status = ?, 
               notes = COALESCE(notes, '') || '\n[' || datetime('now') || '] Status changed to ${newStatus}: ' || ?,
               updated_at = datetime('now')
           WHERE id = ?`,
          [newStatus, notes, id]
        );
      } else {
        await db.query(
          `UPDATE orders 
           SET status = ?, 
               notes = CONCAT(IFNULL(notes, ''), '\n[', NOW(), '] Status changed to ${newStatus}: ', ?),
               updated_at = NOW()
           WHERE id = ?`,
          [newStatus, notes, id]
        );
      }

      // If order is rejected or cancelled, RESTORE stock to products and warehouse
      if (['rejected', 'cancelled'].includes(newStatus)) {
        console.log(`🔓 [MODEL] Restoring stock for ${newStatus} order ${id}...`);
        try {
          await this.restoreStockForOrder(id);
          console.log(`✅ [MODEL] Stock restored for order ${id}`);
        } catch (stockError) {
          console.error(`⚠️  [MODEL] Failed to restore stock for order ${id}:`, stockError.message);
          // Continue even if stock restore fails - can be handled manually
        }
      }

      console.log(`✅ [MODEL] Order ${id} status updated to '${newStatus}'`);
      return await this.findById(id);
    } catch (error) {
      console.error('❌ [MODEL] Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Check stock availability for all items in an order
   * Returns detailed stock information for each product
   */
  async checkStockAvailability(orderId) {
    console.log(`📦 [MODEL] Checking stock availability for order ${orderId}`);

    const [items] = await db.query(
      `SELECT 
        od.product_id,
        od.quantity as order_quantity,
        p.product_name,
        p.product_code,
        p.stock_quantity as available_stock,
        p.reorder_level,
        (p.stock_quantity >= od.quantity) as is_available,
        (p.stock_quantity - od.quantity) as remaining_stock,
        CASE
          WHEN p.stock_quantity < od.quantity THEN 'INSUFFICIENT'
          WHEN (p.stock_quantity - od.quantity) <= p.reorder_level THEN 'LOW_STOCK_WARNING'
          ELSE 'AVAILABLE'
        END as stock_status
      FROM ${ORDER_DETAILS_TABLE} od
      JOIN products p ON od.product_id = p.id
      WHERE od.order_id = ?`,
      [orderId]
    );

    const insufficientItems = items.filter(item => !item.is_available);
    const lowStockWarnings = items.filter(item => item.stock_status === 'LOW_STOCK_WARNING');

    const result = {
      available: insufficientItems.length === 0,
      items: items,
      insufficientItems: insufficientItems,
      lowStockWarnings: lowStockWarnings,
      allItemsAvailable: insufficientItems.length === 0,
      hasLowStockWarnings: lowStockWarnings.length > 0
    };

    console.log(`📊 [MODEL] Stock check result:`, {
      totalItems: items.length,
      insufficientCount: insufficientItems.length,
      lowStockWarningCount: lowStockWarnings.length,
      available: result.available
    });

    return result;
  },

  /**
   * Finalize order and deduct stock (using reserved stock procedure)
   * This is a transactional operation - either all stock is deducted or none
   */
  async finalizeOrder(orderId, notes = '') {
    console.log(`🏁 [MODEL] Finalizing order ${orderId}...`);

    try {
      // Use the stored procedure to deduct stock
      const Product = require('./Product');
      await Product.deductStock(orderId, null);
      
      console.log(`📦 [MODEL] Stock deducted successfully`);

      // Update order status to finalized
      await db.query(
        `UPDATE orders 
         SET status = 'finalized',
             notes = CONCAT(IFNULL(notes, ''), '\n[', NOW(), '] Order finalized: ', ?),
             updated_at = NOW()
         WHERE id = ?`,
        [notes || 'Order finalized and stock deducted', orderId]
      );

      console.log(`✅ [MODEL] Order ${orderId} finalized successfully`);
      return await this.findById(orderId);
    } catch (error) {
      console.error('❌ [MODEL] Error finalizing order:', error);
      throw error;
    }
  },

  /**
   * Restore stock when order is cancelled or rejected
   * Adds back the quantities to both products table and warehouse_stock table
   */
  async restoreStockForOrder(orderId) {
    console.log(`🔄 [STOCK RESTORE] Starting stock restoration for order ${orderId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get order details including warehouse_id
      const [orderRows] = await connection.query(
        'SELECT id, warehouse_id FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (!orderRows || orderRows.length === 0) {
        throw new Error(`Order ${orderId} not found`);
      }
      
      const order = orderRows[0];
      const warehouse_id = order.warehouse_id;
      
      // Get all order items
      const [items] = await connection.query(
        `SELECT oi.product_id, oi.quantity, p.product_name 
         FROM ${ORDER_DETAILS_TABLE} oi
         INNER JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [orderId]
      );
      
      if (!items || items.length === 0) {
        console.log(`⚠️ [STOCK RESTORE] No items found for order ${orderId}`);
        await connection.commit();
        return;
      }
      
      console.log(`📦 [STOCK RESTORE] Restoring stock for ${items.length} items...`);
      
      for (const item of items) {
        // ================================================================
        // RESTORE STOCK TO PRODUCTS TABLE
        // ================================================================
        console.log(`📦 [STOCK RESTORE] Restoring ${item.quantity} units of ${item.product_name} to global stock`);
        await connection.query(
          'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
        
        // ================================================================
        // RESTORE STOCK TO WAREHOUSE_STOCK TABLE (if warehouse was assigned)
        // ================================================================
        if (warehouse_id) {
          // Check if product exists in this warehouse
          const [warehouseStock] = await connection.query(
            'SELECT id FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
            [warehouse_id, item.product_id]
          );
          
          if (warehouseStock && warehouseStock.length > 0) {
            console.log(`🏪 [STOCK RESTORE] Restoring ${item.quantity} units to warehouse ${warehouse_id}`);
            await connection.query(`
              UPDATE warehouse_stock 
              SET quantity = quantity + ?,
                  last_updated = ${useSQLite ? "datetime('now')" : 'NOW()'}
              WHERE warehouse_id = ? AND product_id = ?
            `, [item.quantity, warehouse_id, item.product_id]);
          }
        }
      }
      
      await connection.commit();
      console.log(`✅ [STOCK RESTORE] Stock restored successfully for order ${orderId}`);
      
    } catch (error) {
      await connection.rollback();
      console.error(`❌ [STOCK RESTORE] Error restoring stock for order ${orderId}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = Order;

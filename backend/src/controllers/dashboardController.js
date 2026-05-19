/**
 * Dashboard Controller
 * Sprint 4: Main Dashboard with Analytics
 * Company: Ummahtechinnovations.com
 */

const db = require('../config/database');
const { ROLES, normalizeRoleName } = require('../middleware/auth');

/**
 * Get overall dashboard statistics
 * Returns comprehensive real-time statistics for dashboard display
 * Supports both MySQL (with views) and SQLite (direct queries)
 */
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('🔵 Dashboard Stats API called');
    const { start_date, end_date, salesman_id } = req.query;
    
    let oWhere = '1=1';
    let srWhere = '1=1';
    const oParams = [];
    const srParams = [];

    if (start_date) {
      oWhere += ' AND DATE(o.order_date) >= ?';
      srWhere += ' AND DATE(sr.return_date) >= ?';
      oParams.push(start_date);
      srParams.push(start_date);
    }
    if (end_date) {
      oWhere += ' AND DATE(o.order_date) <= ?';
      srWhere += ' AND DATE(sr.return_date) <= ?';
      oParams.push(end_date);
      srParams.push(end_date);
    }
    if (salesman_id) {
      oWhere += ' AND o.salesman_id = ?';
      srWhere += ' AND sr.salesman_id = ?';
      oParams.push(salesman_id);
      srParams.push(salesman_id);
    }

    // Cash-basis collections filters (shop_ledger as source of truth)
    let cashWhere = "sl.transaction_type = 'payment'";
    const cashParams = [];
    if (start_date) {
      cashWhere += ' AND DATE(sl.transaction_date) >= ?';
      cashParams.push(start_date);
    }
    if (end_date) {
      cashWhere += ' AND DATE(sl.transaction_date) <= ?';
      cashParams.push(end_date);
    }
    if (salesman_id) {
      cashWhere += ' AND sh.salesman_id = ?';
      cashParams.push(salesman_id);
    }

    // Manual daily collections are also part of cash-basis recognized revenue.
    let dailyCollectionWhere = '1=1';
    const dailyCollectionParams = [];
    if (start_date) {
      dailyCollectionWhere += ' AND DATE(dc.collection_date) >= ?';
      dailyCollectionParams.push(start_date);
    }
    if (end_date) {
      dailyCollectionWhere += ' AND DATE(dc.collection_date) <= ?';
      dailyCollectionParams.push(end_date);
    }
    if (salesman_id) {
      dailyCollectionWhere += ' AND dc.salesman_id = ?';
      dailyCollectionParams.push(salesman_id);
    }

    const useSQLite = process.env.USE_SQLITE === 'true';
    console.log('🔵 USE_SQLITE:', useSQLite);
    let dashboardStats;
    const currentRole = normalizeRoleName(req.user?.role_name || req.user?.role);
    const isFinancialDashboardRestricted = currentRole === ROLES.MANAGER;
    
    if (useSQLite) {
      // SQLite: Direct queries instead of views
      console.log('📊 Dashboard: Using SQLite queries');
      
      // Get product stats
      const [productRows] = await db.query(`
        SELECT 
          COUNT(*) as total_products,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
          SUM(CASE WHEN stock_quantity <= reorder_level AND stock_quantity > 0 THEN 1 ELSE 0 END) as low_stock_count,
          SUM(CASE WHEN stock_quantity = 0 THEN 1 ELSE 0 END) as out_of_stock_count,
          SUM(stock_quantity) as total_stock_quantity,
          SUM(stock_quantity * unit_price) as total_inventory_value
        FROM products
      `);
      const productStats = productRows[0] || {};
      console.log('📦 Product stats:', productStats);
      
      // Get order stats
      const [orderRows] = await db.query(`
        SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN status IN ('placed', 'pending', 'processing') THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN status IN ('finalized', 'delivered') THEN 1 ELSE 0 END) as completed_orders,
          SUM(net_amount) as total_order_value
        FROM orders o
        WHERE ${oWhere}
      `, oParams);
      const orderStats = orderRows[0] || {};
      console.log('📋 Order stats:', orderStats);
      
      // Get shop stats
      const [shopRows] = await db.query(`
        SELECT 
          COUNT(*) as total_shops,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_shops
        FROM shops
      `);
      const shopStats = shopRows[0] || {};
      console.log('🏪 Shop stats:', shopStats);
      
      // Get salesman stats
      const [salesmanRows] = await db.query(`
        SELECT 
          COUNT(*) as total_salesmen,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_salesmen
        FROM salesmen
      `);
      const salesmanStats = salesmanRows[0] || {};
      console.log('👤 Salesman stats:', salesmanStats);
      
      // Get warehouse stats
      const [warehouseRows] = await db.query(`
        SELECT 
          COUNT(*) as total_warehouses,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_warehouses
        FROM warehouses
      `);
      const warehouseStats = warehouseRows[0] || {};
      
      // Get warehouse stock total
      const [stockRows] = await db.query(`
        SELECT 
          COALESCE(SUM(quantity), 0) as total_warehouse_stock,
          COALESCE(SUM(reserved_quantity), 0) as total_reserved_stock
        FROM warehouse_stock
      `);
      const warehouseStockTotal = stockRows[0] || {};
      
      // Get delivery stats (UPDATED - replaces invoice stats)
      const [deliveryRows] = await db.query(`
        SELECT 
          COUNT(*) as total_deliveries,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_deliveries,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_deliveries,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_deliveries
        FROM deliveries
      `);
      const deliveryStats = deliveryRows[0] || {};
      console.log('🚚 Delivery stats:', deliveryStats);
      
      dashboardStats = {
        // Products - with inventory metrics
        total_products: productStats.total_products || 0,
        active_products: productStats.active_products || 0,
        low_stock_products: productStats.low_stock_count || 0,
        out_of_stock_products: productStats.out_of_stock_count || 0,
        total_stock_quantity: parseFloat(productStats.total_stock_quantity || 0),
        total_inventory_value: parseFloat(productStats.total_inventory_value || 0),
        
        // Orders
        total_orders: orderStats.total_orders || 0,
        pending_orders: orderStats.pending_orders || 0,
        completed_orders: orderStats.completed_orders || 0,
        total_order_value: parseFloat(orderStats.total_order_value || 0),
        
        // Shops
        total_shops: shopStats.total_shops || 0,
        active_shops: shopStats.active_shops || 0,
        
        // Salesmen
        total_salesmen: salesmanStats.total_salesmen || 0,
        active_salesmen: salesmanStats.active_salesmen || 0,
        
        // Routes (may not exist in SQLite)
        total_routes: 0,
        active_routes: 0,
        
        // Warehouses - with stock totals
        total_warehouses: warehouseStats.total_warehouses || 0,
        active_warehouses: warehouseStats.active_warehouses || 0,
        total_warehouse_stock: parseFloat(warehouseStockTotal.total_warehouse_stock || 0),
        total_reserved_stock: parseFloat(warehouseStockTotal.total_reserved_stock || 0),
        
        // Deliveries
        total_deliveries: deliveryStats.total_deliveries || 0,
        pending_deliveries: deliveryStats.pending_deliveries || 0,
        in_transit_deliveries: deliveryStats.in_transit_deliveries || 0,
        delivered_deliveries: deliveryStats.delivered_deliveries || 0,
        
        // Deliveries (UPDATED - replaces invoices)
        total_deliveries: deliveryStats.total_deliveries || 0,
        pending_deliveries: deliveryStats.pending_deliveries || 0,
        in_transit_deliveries: deliveryStats.in_transit_deliveries || 0,
        delivered_deliveries: deliveryStats.delivered_deliveries || 0,
        
        // Load Sheets (may not exist in SQLite)
        total_load_sheets: 0,
        draft_load_sheets: 0,
        loaded_load_sheets: 0,
        in_transit_load_sheets: 0,
        
        // Suppliers (may not exist in SQLite)
        total_suppliers: 0,
        active_suppliers: 0,
        
        fully_reserved_count: 0
      };
      
      console.log('📊 Final dashboard stats:', dashboardStats);
      
    } else {
      // MySQL: Use the comprehensive dashboard view
      const [stats] = await db.query('SELECT * FROM v_dashboard_stats');
      
      dashboardStats = {
        // Products - show total (more meaningful than just active)
        total_products: stats[0].total_products,
        active_products: stats[0].active_products,
        low_stock_products: stats[0].low_stock_count,
        
        // Orders
        total_orders: stats[0].total_orders,
        pending_orders: stats[0].pending_orders,
        completed_orders: stats[0].completed_orders,
        
        // Shops
        total_shops: stats[0].total_shops,
        active_shops: stats[0].active_shops,
        
        // Salesmen
        total_salesmen: stats[0].total_salesmen,
        active_salesmen: stats[0].active_salesmen,
        
        // Routes
        total_routes: stats[0].total_routes,
        active_routes: stats[0].active_routes,
        
        // Warehouses
        total_warehouses: stats[0].total_warehouses,
        active_warehouses: stats[0].active_warehouses,
        
        // Deliveries
        total_deliveries: stats[0].total_deliveries,
        pending_deliveries: stats[0].pending_deliveries,
        in_transit_deliveries: stats[0].in_transit_deliveries,
        delivered_deliveries: stats[0].delivered_deliveries,
        
        // Invoices
        total_invoices: stats[0].total_invoices,
        unpaid_invoices: stats[0].unpaid_invoices,
        paid_invoices: stats[0].paid_invoices,
        partial_invoices: stats[0].partial_invoices,
        
        // Load Sheets
        total_load_sheets: stats[0].total_load_sheets,
        draft_load_sheets: stats[0].draft_load_sheets,
        loaded_load_sheets: stats[0].loaded_load_sheets,
        in_transit_load_sheets: stats[0].in_transit_load_sheets,
        
        // Suppliers
        total_suppliers: stats[0].total_suppliers,
        active_suppliers: stats[0].active_suppliers,
        
        // Stock metrics
        total_reserved_stock: parseFloat(stats[0].total_reserved_stock || 0),
        fully_reserved_count: stats[0].fully_reserved_count
      };

      // Overlay filtered order metrics so dashboard filters stay consistent.
      const [filteredOrderRows] = await db.query(
        `SELECT
          COUNT(*) as total_orders,
          SUM(CASE WHEN o.status IN ('placed', 'pending', 'processing') THEN 1 ELSE 0 END) as pending_orders,
          SUM(CASE WHEN o.status IN ('finalized', 'delivered') THEN 1 ELSE 0 END) as completed_orders,
          COALESCE(SUM(o.net_amount), 0) as total_order_value
         FROM orders o
         WHERE ${oWhere}`,
        oParams
      );
      const filteredOrderStats = filteredOrderRows[0] || {};
      dashboardStats.total_orders = Number(filteredOrderStats.total_orders || 0);
      dashboardStats.pending_orders = Number(filteredOrderStats.pending_orders || 0);
      dashboardStats.completed_orders = Number(filteredOrderStats.completed_orders || 0);
      dashboardStats.total_order_value = parseFloat(filteredOrderStats.total_order_value || 0);
    }

    if (!isFinancialDashboardRestricted) {
      // Cash-basis P&L:
      // Revenue is recognized on collections (shop_ledger payment entries),
      // while COGS remains tied to fulfilled sales (delivered/finalized orders).
      const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';
      
      const cogsQuery = `
        SELECT 
          COALESCE(SUM(od.net_price), 0) AS total_gross_sales_value,
          COALESCE(SUM(od.quantity * od.unit_purchase_cost), 0) AS total_cogs
        FROM orders o
        JOIN ${ORDER_DETAILS_TABLE} od ON o.id = od.order_id
        WHERE o.status IN ('delivered', 'finalized') AND ${oWhere}
      `;

      const returnsQuery = `
        SELECT 
          COALESCE(SUM(sr.total_return_amount), 0) AS total_return_revenue
        FROM stock_returns sr
        WHERE sr.status = 'completed' AND ${srWhere}
      `;

      const cashQuery = `
        SELECT
          COALESCE(SUM(sl.debit_amount), 0) AS total_collections_received,
          COALESCE(SUM(sl.credit_amount), 0) AS total_collections_paid_out
        FROM shop_ledger sl
        LEFT JOIN shops sh ON sh.id = sl.shop_id
        WHERE ${cashWhere}
      `;

      const dailyCollectionRawQuery = `
        SELECT COALESCE(SUM(dc.amount), 0) AS total_manual_daily_collections_raw
        FROM daily_collections dc
        WHERE ${dailyCollectionWhere}
      `;

      const dailyCollectionDedupedQuery = `
        SELECT COALESCE(SUM(dc.amount), 0) AS total_manual_daily_collections_deduped
        FROM daily_collections dc
        WHERE ${dailyCollectionWhere}
          AND NOT EXISTS (
            SELECT 1
            FROM shop_ledger sl2
            LEFT JOIN shops sh2 ON sh2.id = sl2.shop_id
            WHERE sl2.transaction_type = 'payment'
              AND COALESCE(sl2.debit_amount, 0) > 0
              AND COALESCE(sl2.shop_id, 0) = COALESCE(dc.shop_id, 0)
              AND DATE(sl2.transaction_date) = DATE(dc.collection_date)
              AND ABS(COALESCE(sl2.debit_amount, 0) - COALESCE(dc.amount, 0)) < 0.01
              AND (dc.salesman_id IS NULL OR sh2.salesman_id = dc.salesman_id)
              -- Strict anti-double-counting:
              -- Deduplicate ONLY when manual collection has a non-empty reference number
              -- that exactly matches a shop-ledger payment reference.
              -- This avoids false exclusions for same-day same-amount legitimate collections.
              AND dc.reference_number IS NOT NULL
              AND TRIM(dc.reference_number) != ''
              AND sl2.reference_number = dc.reference_number
          )
      `;

      try {
        const [cogsRows] = await db.query(cogsQuery, oParams);
        const [returnsRows] = await db.query(returnsQuery, srParams);
        const [cashRows] = await db.query(cashQuery, cashParams);
        const [dailyCollectionRawRows] = await db.query(dailyCollectionRawQuery, dailyCollectionParams);
        const [dailyCollectionDedupedRows] = await db.query(dailyCollectionDedupedQuery, dailyCollectionParams);

        const total_gross_sales_value = parseFloat(cogsRows[0]?.total_gross_sales_value || 0);
        const total_cogs = parseFloat(cogsRows[0]?.total_cogs || 0);
        const total_return_revenue = parseFloat(returnsRows[0]?.total_return_revenue || 0);
        const total_shop_ledger_collections_received = parseFloat(cashRows[0]?.total_collections_received || 0);
        const total_manual_daily_collections_raw = parseFloat(dailyCollectionRawRows[0]?.total_manual_daily_collections_raw || 0);
        const total_manual_daily_collections_deduped = parseFloat(dailyCollectionDedupedRows[0]?.total_manual_daily_collections_deduped || 0);
        const duplicate_manual_daily_collections = total_manual_daily_collections_raw - total_manual_daily_collections_deduped;
        const total_collections_received_raw = total_shop_ledger_collections_received + total_manual_daily_collections_raw;
        const total_collections_received = total_shop_ledger_collections_received + total_manual_daily_collections_deduped;
        const total_collections_paid_out = parseFloat(cashRows[0]?.total_collections_paid_out || 0);
        const total_gross_revenue = total_collections_received;
        const net_revenue = total_collections_received - total_collections_paid_out;
        const gross_profit = net_revenue - total_cogs;

        // Append P&L metrics to dashboardStats
        dashboardStats.total_gross_revenue = total_gross_revenue;
        dashboardStats.total_cogs = total_cogs;
        dashboardStats.net_cogs = total_cogs; // mapping for frontend alias
        dashboardStats.total_return_revenue = total_collections_paid_out;
        dashboardStats.net_revenue = net_revenue;
        dashboardStats.gross_profit = gross_profit;
        dashboardStats.total_collections_received_raw = total_collections_received_raw;
        dashboardStats.total_collections_received = total_collections_received;
        dashboardStats.total_collections_paid_out = total_collections_paid_out;
        dashboardStats.total_shop_ledger_collections_received = total_shop_ledger_collections_received;
        dashboardStats.total_manual_daily_collections = total_manual_daily_collections_deduped;
        dashboardStats.total_manual_daily_collections_raw = total_manual_daily_collections_raw;
        dashboardStats.total_manual_daily_collections_deduped = total_manual_daily_collections_deduped;
        dashboardStats.duplicate_manual_daily_collections = duplicate_manual_daily_collections;
        dashboardStats.total_gross_sales_value = total_gross_sales_value;
        dashboardStats.total_stock_returns_value = total_return_revenue;
        
        console.log('💰 Cash-basis P&L Metrics appended correctly:', {
          total_collections_received_raw,
          total_collections_received,
          total_shop_ledger_collections_received,
          total_manual_daily_collections_raw,
          total_manual_daily_collections_deduped,
          duplicate_manual_daily_collections,
          total_collections_paid_out,
          total_gross_sales_value,
          total_cogs,
          total_return_revenue,
          net_revenue,
          gross_profit
        });
      } catch (metricError) {
        console.error('Error calculating P&L metrics:', metricError);
        dashboardStats.total_gross_revenue = 0;
        dashboardStats.total_cogs = 0;
        dashboardStats.net_cogs = 0;
        dashboardStats.total_return_revenue = 0;
        dashboardStats.net_revenue = 0;
        dashboardStats.gross_profit = 0;
        dashboardStats.total_collections_received_raw = 0;
        dashboardStats.total_collections_received = 0;
        dashboardStats.total_collections_paid_out = 0;
        dashboardStats.total_shop_ledger_collections_received = 0;
        dashboardStats.total_manual_daily_collections = 0;
        dashboardStats.total_manual_daily_collections_raw = 0;
        dashboardStats.total_manual_daily_collections_deduped = 0;
        dashboardStats.duplicate_manual_daily_collections = 0;
        dashboardStats.total_gross_sales_value = 0;
        dashboardStats.total_stock_returns_value = 0;
      }
    } else {
      dashboardStats.total_gross_revenue = 0;
      dashboardStats.total_cogs = 0;
      dashboardStats.net_cogs = 0;
      dashboardStats.total_return_revenue = 0;
      dashboardStats.net_revenue = 0;
      dashboardStats.gross_profit = 0;
      dashboardStats.total_collections_received_raw = 0;
      dashboardStats.total_collections_received = 0;
      dashboardStats.total_collections_paid_out = 0;
      dashboardStats.total_shop_ledger_collections_received = 0;
      dashboardStats.total_manual_daily_collections = 0;
      dashboardStats.total_manual_daily_collections_raw = 0;
      dashboardStats.total_manual_daily_collections_deduped = 0;
      dashboardStats.duplicate_manual_daily_collections = 0;
      dashboardStats.total_gross_sales_value = 0;
      dashboardStats.total_stock_returns_value = 0;
    }

    // Set cache-control headers to prevent caching of stats
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

/**
 * Get recent orders (placeholder for future Orders module)
 */
exports.getRecentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // TODO: Implement when Orders module is created
    // For now, return empty array
    res.json({
      success: true,
      data: [],
      message: 'Orders module not yet implemented'
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders',
      error: error.message
    });
  }
};

/**
 * Get low stock products
 */
exports.getLowStockProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const [products] = await db.query(
      `SELECT 
        p.id,
        p.product_code,
        p.product_name,
        p.stock_quantity,
        p.reorder_level,
        p.unit_price,
        p.category,
        s.supplier_name,
        (p.reorder_level - p.stock_quantity) as shortage
       FROM products p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.stock_quantity <= p.reorder_level
       AND p.is_active = 1
       ORDER BY shortage DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
};

/**
 * Get top performing salesmen (placeholder for future Orders module)
 */
exports.getTopSalesmen = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const period = req.query.period || 'month'; // day, week, month, year

    // For now, return salesmen with their assigned routes count
    const [salesmen] = await db.query(
      `SELECT 
        s.id,
        s.salesman_code,
        s.full_name,
        s.city,
        s.monthly_target,
        s.commission_percentage,
        COUNT(r.id) as assigned_routes,
        (SELECT COUNT(*) FROM shops sh WHERE sh.route_id IN (SELECT id FROM routes WHERE salesman_id = s.id)) as total_shops
       FROM salesmen s
       LEFT JOIN routes r ON r.salesman_id = s.id AND r.is_active = 1
       WHERE s.is_active = 1
       GROUP BY s.id
       ORDER BY assigned_routes DESC, total_shops DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: salesmen,
      note: 'Full sales metrics will be available when Orders module is implemented'
    });
  } catch (error) {
    console.error('Error fetching top salesmen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top salesmen',
      error: error.message
    });
  }
};

/**
 * Get top selling products (placeholder for future Orders module)
 */
exports.getTopProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const period = req.query.period || 'month'; // day, week, month, year

    // TODO: Implement when Orders module is created
    // For now, return products with highest stock
    const [products] = await db.query(
      `SELECT 
        p.id,
        p.product_code,
        p.product_name,
        p.stock_quantity,
        p.unit_price,
        p.category,
        s.supplier_name
       FROM products p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.is_active = 1
       ORDER BY p.stock_quantity DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: products,
      note: 'Sales data will be available when Orders module is implemented'
    });
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top products',
      error: error.message
    });
  }
};

/**
 * Get revenue summary (placeholder for future Orders module)
 */
exports.getRevenueSummary = async (req, res) => {
  try {
    const period = req.query.period || 'month'; // day, week, month, year

    // TODO: Implement when Orders module is created
    res.json({
      success: true,
      data: {
        period,
        total_revenue: 0,
        total_orders: 0,
        average_order_value: 0,
        total_commission: 0
      },
      message: 'Orders module not yet implemented'
    });
  } catch (error) {
    console.error('Error fetching revenue summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue summary',
      error: error.message
    });
  }
};

/**
 * Get targets progress for all salesmen
 */
exports.getTargetsProgress = async (req, res) => {
  try {
    // Get all active salesmen with their targets
    const [salesmen] = await db.query(
      `SELECT 
        s.id,
        s.salesman_code,
        s.full_name,
        s.monthly_target,
        s.commission_percentage,
        COUNT(r.id) as assigned_routes,
        (SELECT COUNT(*) FROM shops sh WHERE sh.route_id IN (SELECT id FROM routes WHERE salesman_id = s.id AND is_active = 1)) as total_shops
       FROM salesmen s
       LEFT JOIN routes r ON r.salesman_id = s.id AND r.is_active = 1
       WHERE s.is_active = 1
       GROUP BY s.id
       ORDER BY s.full_name ASC`
    );

    // TODO: Add actual sales when Orders module is implemented
    const targetsProgress = salesmen.map(salesman => ({
      salesman_id: salesman.id,
      salesman_code: salesman.salesman_code,
      full_name: salesman.full_name,
      monthly_target: parseFloat(salesman.monthly_target),
      achieved_amount: 0, // Will be calculated from orders
      achievement_percentage: 0,
      commission_percentage: parseFloat(salesman.commission_percentage),
      estimated_commission: 0,
      assigned_routes: salesman.assigned_routes,
      total_shops: salesman.total_shops
    }));

    res.json({
      success: true,
      data: targetsProgress,
      note: 'Achievement metrics will be available when Orders module is implemented'
    });
  } catch (error) {
    console.error('Error fetching targets progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch targets progress',
      error: error.message
    });
  }
};

/**
 * Get sales trends (placeholder for future Orders module)
 */
exports.getSalesTrends = async (req, res) => {
  try {
    const period = req.query.period || 'week'; // day, week, month, year
    const limit = parseInt(req.query.limit) || 30; // Number of data points

    // TODO: Implement when Orders module is created
    res.json({
      success: true,
      data: [],
      message: 'Orders module not yet implemented'
    });
  } catch (error) {
    console.error('Error fetching sales trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      error: error.message
    });
  }
};

/**
 * Get city-wise distribution statistics
 */
exports.getCityStats = async (req, res) => {
  try {
    const [cityStats] = await db.query(
      `SELECT 
        city,
        COUNT(DISTINCT s.id) as salesmen_count,
        COUNT(DISTINCT r.id) as routes_count,
        COUNT(DISTINCT sh.id) as shops_count,
        SUM(s.monthly_target) as total_targets
       FROM salesmen s
       LEFT JOIN routes r ON r.salesman_id = s.id AND r.is_active = 1
       LEFT JOIN shops sh ON sh.route_id = r.id AND sh.is_active = 1
       WHERE s.is_active = 1
       GROUP BY city
       ORDER BY salesmen_count DESC, shops_count DESC`
    );

    res.json({
      success: true,
      data: cityStats
    });
  } catch (error) {
    console.error('Error fetching city stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch city statistics',
      error: error.message
    });
  }
};

/**
 * Get quick stats for dashboard cards
 */
exports.getQuickStats = async (req, res) => {
  try {
    // Use dashboard view
    const [viewStats] = await db.query('SELECT * FROM v_dashboard_stats');
    const stats = viewStats[0];

    // Get additional statistics
    const [activeUsers] = await db.query('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const [totalCategories] = await db.query('SELECT COUNT(DISTINCT category) as count FROM products WHERE is_active = 1 AND category IS NOT NULL');

    res.json({
      success: true,
      data: {
        ...stats,
        total_users: activeUsers[0].count,
        total_categories: totalCategories[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick statistics',
      error: error.message
    });
  }
};

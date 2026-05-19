const db = require('../config/database');
const { normalizeRoleName, ROLES } = require('../middleware/auth');

// Database compatibility: SQLite uses different table names than MySQL
const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';
const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';
const INVOICE_DETAILS_TABLE = useSQLite ? 'invoice_items' : 'invoice_details';

console.log(`🔧 Shop Controller: Using tables - Orders: "${ORDER_DETAILS_TABLE}", Invoices: "${INVOICE_DETAILS_TABLE}" (SQLite=${useSQLite})`);

const hasManagementScope = (reqUser) => {
  const role = normalizeRoleName(reqUser?.role_name || reqUser?.role);
  return role === ROLES.ADMIN || role === ROLES.SENIOR_MANAGER || role === ROLES.MANAGER;
};

const parseShopFiltersFromQuery = (query = {}) => ({
  search: query.search || '',
  route_id: query.route_id || '',
  salesman_id: query.salesman_id || '',
  city: query.city || '',
  is_active:
    query.is_active !== undefined && query.is_active !== ''
      ? query.is_active === 'true'
      : null
});

const buildShopListWhere = (reqUser, filters = {}, excludeField = null) => {
  let where = ' WHERE 1=1';
  const params = [];

  if (reqUser && !hasManagementScope(reqUser)) {
    if (reqUser.salesman_id) {
      where += ' AND s.salesman_id = ?';
      params.push(reqUser.salesman_id);
    } else {
      where += ' AND 1=0';
    }
  }

  const { search, route_id, salesman_id, city, is_active } = filters;

  if (search) {
    const like = `%${search}%`;
    if (useSQLite) {
      where += ' AND (s.shop_code LIKE ? COLLATE NOCASE OR s.shop_name LIKE ? COLLATE NOCASE OR s.owner_name LIKE ? COLLATE NOCASE OR s.phone LIKE ?)';
    } else {
      where += ' AND (s.shop_code LIKE ? OR s.shop_name LIKE ? OR s.owner_name LIKE ? OR s.phone LIKE ?)';
    }
    params.push(like, like, like, like);
  }

  if (route_id && excludeField !== 'route_id') {
    where += ' AND s.route_id = ?';
    params.push(route_id);
  }

  if (salesman_id && excludeField !== 'salesman_id') {
    if (salesman_id === 'unassigned') {
      where += ' AND s.salesman_id IS NULL';
    } else {
      where += ' AND s.salesman_id = ?';
      params.push(salesman_id);
    }
  }

  if (city && excludeField !== 'city') {
    if (useSQLite) {
      where += ' AND s.city = ? COLLATE NOCASE';
    } else {
      where += ' AND s.city = ?';
    }
    params.push(city);
  }

  if (is_active !== null && is_active !== undefined && excludeField !== 'is_active') {
    where += ' AND s.is_active = ?';
    params.push(is_active ? 1 : 0);
  }

  return { where, params };
};

// Get all shops with pagination and filters
exports.getAllShops = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const filters = parseShopFiltersFromQuery(req.query);
    const { where, params } = buildShopListWhere(req.user, filters);

    let query = `SELECT s.*, sm.full_name as salesman_name FROM shops s LEFT JOIN salesmen sm ON s.salesman_id = sm.id${where}`;

    const countQuery = query.replace(
      'SELECT s.*, sm.full_name as salesman_name',
      'SELECT COUNT(*) as total'
    );
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total || countResult.length;

    query += ' ORDER BY s.shop_name ASC LIMIT ? OFFSET ?';
    const listParams = [...params, parseInt(limit, 10), parseInt(offset, 10)];
    const [shops] = await db.query(query, listParams);

    res.json({
      success: true,
      data: shops,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / limit)
      }
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

// @desc    Get cascading filter options for shop listing
// @route   GET /api/desktop/shops/filter-options
exports.getFilterOptions = async (req, res) => {
  try {
    const filters = parseShopFiltersFromQuery(req.query);

    const salesmanFilter = buildShopListWhere(req.user, filters, 'salesman_id');
    const routeFilter = buildShopListWhere(req.user, filters, 'route_id');
    const cityFilter = buildShopListWhere(req.user, filters, 'city');
    const statusFilter = buildShopListWhere(req.user, filters, 'is_active');

    const [
      salesmanRowsResult,
      routeRowsResult,
      cityRowsResult,
      statusRowsResult
    ] = await Promise.all([
      db.query(
        `SELECT
          CASE WHEN s.salesman_id IS NULL THEN 'unassigned' ELSE s.salesman_id END AS value,
          COALESCE(sm.full_name, 'Unassigned') AS label,
          COUNT(*) AS count
         FROM shops s
         LEFT JOIN salesmen sm ON s.salesman_id = sm.id
         ${salesmanFilter.where}
         GROUP BY s.salesman_id, sm.full_name
         ORDER BY label ASC`,
        salesmanFilter.params
      ),
      db.query(
        `SELECT
          r.id AS value,
          r.route_name AS label,
          COUNT(*) AS count
         FROM shops s
         INNER JOIN routes r ON s.route_id = r.id
         ${routeFilter.where}
         GROUP BY r.id, r.route_name
         ORDER BY r.route_name ASC`,
        routeFilter.params
      ),
      db.query(
        `SELECT
          s.city AS value,
          COUNT(*) AS count
         FROM shops s
         ${cityFilter.where}
         AND s.city IS NOT NULL
         AND s.city != ''
         GROUP BY s.city
         ORDER BY s.city ASC`,
        cityFilter.params
      ),
      db.query(
        `SELECT s.is_active, COUNT(*) AS count
         FROM shops s
         ${statusFilter.where}
         GROUP BY s.is_active
         ORDER BY s.is_active DESC`,
        statusFilter.params
      )
    ]);

    const [salesmanRows] = salesmanRowsResult;
    const [routeRows] = routeRowsResult;
    const [cityRows] = cityRowsResult;
    const [statusRows] = statusRowsResult;

    const statuses = statusRows.map((row) => {
      const normalized = Number(row.is_active) === 1;
      return {
        value: normalized ? 'true' : 'false',
        label: normalized ? 'Active' : 'Inactive',
        count: Number(row.count) || 0
      };
    });

    res.json({
      success: true,
      data: {
        salesmen: salesmanRows.map((row) => ({
          value: row.value,
          label: row.label,
          count: Number(row.count) || 0
        })),
        routes: routeRows.map((row) => ({
          value: row.value,
          label: row.label,
          count: Number(row.count) || 0
        })),
        cities: cityRows.map((row) => ({
          value: row.value,
          label: row.value,
          count: Number(row.count) || 0
        })),
        statuses
      }
    });
  } catch (error) {
    console.error('Get shop filter options error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shop filter options',
      error: error.message
    });
  }
};

// Get shops by route
exports.getShopsByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;

    let query = 'SELECT * FROM shops WHERE route_id = ? AND is_active = 1';
    const params = [routeId];

    // Identity Security: Filter by salesman_id if not admin
    if (req.user && !hasManagementScope(req.user)) {
      if (req.user.salesman_id) {
        query += ' AND salesman_id = ?';
        params.push(req.user.salesman_id);
      } else {
        query += ' AND 1=0';
      }
    }

    query += ' ORDER BY shop_name ASC';

    const [shops] = await db.query(query, params);

    res.json({
      success: true,
      data: shops
    });
  } catch (error) {
    console.error('Get shops by route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shops',
      error: error.message
    });
  }
};

// Get shop by ID
exports.getShopById = async (req, res) => {
  try {
    const { id } = req.params;

    let query = 'SELECT s.*, sm.full_name as salesman_name FROM shops s LEFT JOIN salesmen sm ON s.salesman_id = sm.id WHERE s.id = ?';
    const params = [id];

    // Identity Security: Only allow fetching details of assigned shop
    if (req.user && !hasManagementScope(req.user)) {
      if (req.user.salesman_id) {
        query += ' AND s.salesman_id = ?';
        params.push(req.user.salesman_id);
      } else {
        query += ' AND 1=0';
      }
    }

    const [shops] = await db.query(query, params);

    if (shops.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const shop = shops[0];
    // Include available credit calculation
    const available_credit = parseFloat(shop.credit_limit) - parseFloat(shop.current_balance);
    shop.available_credit = available_credit;

    res.json({
      success: true,
      data: shop
    });
  } catch (error) {
    console.error('Get shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop',
      error: error.message
    });
  }
};

// Create new shop
exports.createShop = async (req, res) => {
  try {
    const {
      shop_code,
      shop_name,
      owner_name,
      phone,
      alternate_phone,
      email,
      address,
      city,
      area,
      route_id,
      salesman_id,
      credit_limit,
      opening_balance,
      latitude,
      longitude,
      shop_type,
      business_license,
      tax_registration,
      notes,
      is_active
    } = req.body;

    // Validate required fields
    if (!shop_code || !shop_name || !owner_name || !phone || !address || !city) {
      return res.status(400).json({
        success: false,
        message: 'Shop code, name, owner name, phone, address, and city are required'
      });
    }

    // Check if shop_code already exists
    const [existing] = await db.query('SELECT id FROM shops WHERE shop_code = ?', [shop_code]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Shop code already exists'
      });
    }

    // Verify route exists if provided
    if (route_id) {
      const [routes] = await db.query('SELECT id FROM routes WHERE id = ?', [route_id]);
      if (routes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Route not found'
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO shops (shop_code, shop_name, owner_name, phone, address, city, area, route_id, salesman_id, credit_limit, current_balance, latitude, longitude, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_code,
        shop_name,
        owner_name,
        phone,
        address,
        city,
        area,
        route_id || null,
        salesman_id || null,
        credit_limit || 0,
        opening_balance || 0,
        latitude,
        longitude,
        is_active !== undefined ? is_active : true
      ]
    );

    const [newShop] = await db.query('SELECT * FROM shops WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      data: newShop[0]
    });
  } catch (error) {
    console.error('Create shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shop',
      error: error.message
    });
  }
};

// Update shop
exports.updateShop = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const [shops] = await db.query('SELECT * FROM shops WHERE id = ?', [id]);

    if (shops.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const shop = shops[0];

    // Check if shop_code is being changed and already exists
    if (updateData.shop_code && updateData.shop_code !== shop.shop_code) {
      const [existing] = await db.query('SELECT id FROM shops WHERE shop_code = ? AND id != ?', [updateData.shop_code, id]);
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Shop code already exists'
        });
      }
    }

    // Verify route exists if being updated
    if (updateData.route_id && updateData.route_id !== shop.route_id) {
      const [routes] = await db.query('SELECT id FROM routes WHERE id = ?', [updateData.route_id]);
      if (routes.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Route not found'
        });
      }
    }

    // Build update query dynamically - only include valid database columns
      const validColumns = ['shop_code', 'shop_name', 'owner_name', 'phone', 'address', 'city', 'area', 'route_id', 'salesman_id', 'credit_limit', 'current_balance', 'is_active', 'latitude', 'longitude'];
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (key !== 'id' && key !== 'created_at' && key !== 'created_by') {
        // Map opening_balance to current_balance
        const dbKey = key === 'opening_balance' ? 'current_balance' : key;
        
        // Only include valid columns that exist in database
        if (validColumns.includes(dbKey)) {
          fields.push(`${dbKey} = ?`);
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);
    await db.query(`UPDATE shops SET ${fields.join(', ')} WHERE id = ?`, values);

    const [updated] = await db.query('SELECT * FROM shops WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Shop updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shop',
      error: error.message
    });
  }
};

// Delete shop (Admin can delete any shop with force flag)
exports.deleteShop = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // Admin override: ?force=true

    const [shops] = await db.query('SELECT * FROM shops WHERE id = ?', [id]);

    if (shops.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    // Check for dependencies (orders, invoices, deliveries)
    const [orders] = await db.query('SELECT COUNT(*) as count FROM orders WHERE shop_id = ?', [id]);
    const [invoices] = await db.query('SELECT COUNT(*) as count FROM invoices WHERE shop_id = ?', [id]);
    // SQLite: deliveries table doesn't have shop_id, it's linked through orders
    const [deliveries] = await db.query('SELECT COUNT(*) as count FROM deliveries WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [id]);

    const hasOrders = orders[0].count > 0;
    const hasInvoices = invoices[0].count > 0;
    const hasDeliveries = deliveries[0].count > 0;

    // If shop has dependencies and force flag is not set, return error with details
    if ((hasOrders || hasInvoices || hasDeliveries) && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shop with existing data',
        dependencies: {
          orders: orders[0].count,
          invoices: invoices[0].count,
          deliveries: deliveries[0].count
        },
        hint: 'Use force=true query parameter to delete shop with all related data (Admin only)'
      });
    }

    // Admin force delete: Remove all dependencies first
    if (force === 'true') {
      console.log(`[ADMIN FORCE DELETE] Deleting shop ${id} with all dependencies...`);
      
      // Start transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // 1. Delete order_details/order_items for orders related to this shop
        if (useSQLite) {
          // SQLite doesn't support DELETE with JOIN syntax, use subquery
          await connection.query(`DELETE FROM ${ORDER_DETAILS_TABLE} WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)`, [id]);
        } else {
          // MySQL supports DELETE with JOIN
          await connection.query(`DELETE od FROM ${ORDER_DETAILS_TABLE} od INNER JOIN orders o ON od.order_id = o.id WHERE o.shop_id = ?`, [id]);
        }
        
        // 2. Delete orders
        await connection.query('DELETE FROM orders WHERE shop_id = ?', [id]);
        
        // 3. Delete invoice_details/invoice_items for invoices related to this shop
        if (useSQLite) {
          // SQLite doesn't support DELETE with JOIN syntax, use subquery
          await connection.query(`DELETE FROM ${INVOICE_DETAILS_TABLE} WHERE invoice_id IN (SELECT id FROM invoices WHERE shop_id = ?)`, [id]);
        } else {
          // MySQL supports DELETE with JOIN
          await connection.query(`DELETE id FROM ${INVOICE_DETAILS_TABLE} id INNER JOIN invoices i ON id.invoice_id = i.id WHERE i.shop_id = ?`, [id]);
        }
        
        // 4. Delete invoice_payments
        if (useSQLite) {
          await connection.query('DELETE FROM invoice_payments WHERE invoice_id IN (SELECT id FROM invoices WHERE shop_id = ?)', [id]);
        } else {
          await connection.query('DELETE ip FROM invoice_payments ip INNER JOIN invoices i ON ip.invoice_id = i.id WHERE i.shop_id = ?', [id]);
        }
        
        // 5. Delete invoices
        await connection.query('DELETE FROM invoices WHERE shop_id = ?', [id]);
        
        // 6. Delete delivery_items for deliveries related to this shop
        if (useSQLite) {
          await connection.query('DELETE FROM delivery_items WHERE delivery_id IN (SELECT id FROM deliveries WHERE shop_id = ?)', [id]);
        } else {
          await connection.query('DELETE di FROM delivery_items di INNER JOIN deliveries d ON di.delivery_id = d.id WHERE d.shop_id = ?', [id]);
        }
        
        // 7. Delete load_sheet_deliveries associations (if table exists)
        // Deliveries are linked to shop through orders, not directly
        if (useSQLite) {
          await connection.query('DELETE FROM load_sheet_deliveries WHERE delivery_id IN (SELECT id FROM deliveries WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?))', [id]).catch(() => {});
        } else {
          await connection.query('DELETE lsd FROM load_sheet_deliveries lsd INNER JOIN deliveries d ON lsd.delivery_id = d.id INNER JOIN orders o ON d.order_id = o.id WHERE o.shop_id = ?', [id]).catch(() => {});
        }
        
        // 8. Delete deliveries (linked through orders)
        await connection.query('DELETE FROM deliveries WHERE order_id IN (SELECT id FROM orders WHERE shop_id = ?)', [id]);
        
        // 9. Delete shop_audit_log (will cascade automatically)
        // await connection.query('DELETE FROM shop_audit_log WHERE shop_id = ?', [id]);
        
        // 10. Finally, delete the shop
        await connection.query('DELETE FROM shops WHERE id = ?', [id]);

        await connection.commit();
        connection.release();

        console.log(`[ADMIN FORCE DELETE] Successfully deleted shop ${id} and all related data`);

        res.json({
          success: true,
          message: 'Shop and all related data deleted successfully (Admin override)',
          deleted: {
            shop: shops[0].shop_name,
            orders: orders[0].count,
            invoices: invoices[0].count,
            deliveries: deliveries[0].count
          }
        });

      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }

    } else {
      // Normal delete (no dependencies)
      await db.query('DELETE FROM shops WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Shop deleted successfully'
      });
    }

  } catch (error) {
    console.error('Delete shop error:', error);
    
    // Check if it's a foreign key constraint error
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete shop because it has related records (orders, invoices, or deliveries)',
        hint: 'Use force=true to delete shop with all related data (Admin only)',
        error: 'Foreign key constraint violation'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete shop',
      error: error.message
    });
  }
};

// Validate shop credit limit for order
exports.validateCreditLimit = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_amount } = req.body;

    if (!order_amount || order_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid order amount is required'
      });
    }

    const [shops] = await db.query('SELECT * FROM shops WHERE id = ?', [id]);

    if (shops.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found'
      });
    }

    const shop = shops[0];
    const newBalance = parseFloat(shop.current_balance) + parseFloat(order_amount);
    const canPlaceOrder = newBalance <= parseFloat(shop.credit_limit);
    const availableCredit = parseFloat(shop.credit_limit) - parseFloat(shop.current_balance);

    res.json({
      success: true,
      data: {
        can_place_order: canPlaceOrder,
        current_balance: parseFloat(shop.current_balance),
        credit_limit: parseFloat(shop.credit_limit),
        available_credit: availableCredit,
        order_amount: parseFloat(order_amount),
        new_balance: newBalance,
        message: canPlaceOrder 
          ? 'Order can be placed' 
          : `Order exceeds credit limit by PKR ${(newBalance - parseFloat(shop.credit_limit)).toFixed(2)}`
      }
    });
  } catch (error) {
    console.error('Validate credit limit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate credit limit',
      error: error.message
    });
  }
};

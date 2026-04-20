const db = require('../config/database');

// Get all routes with pagination
exports.getAllRoutes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', is_active } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM routes WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ' AND (route_code LIKE ? OR route_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Get paginated data
    query += ' ORDER BY route_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [routes] = await db.query(query, params);

    res.json({
      success: true,
      data: routes,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
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

// Get active routes (for dropdowns)
exports.getActiveRoutes = async (req, res) => {
  try {
    const [routes] = await db.query(
      'SELECT id, route_code, route_name FROM routes WHERE is_active = 1 ORDER BY route_name ASC'
    );

    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Get active routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active routes',
      error: error.message
    });
  }
};

// Get route by ID
exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    const [routes] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: routes[0]
    });
  } catch (error) {
    console.error('Get route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route',
      error: error.message
    });
  }
};

// Create new route
exports.createRoute = async (req, res) => {
  try {
    const { route_code, route_name, area, city, description, is_active } = req.body;

    // Validate required fields
    if (!route_code || !route_name) {
      return res.status(400).json({
        success: false,
        message: 'Route code and name are required'
      });
    }

    // Check if route_code already exists
    const [existing] = await db.query('SELECT id FROM routes WHERE route_code = ?', [route_code]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Route code already exists'
      });
    }

    const [result] = await db.query(
      'INSERT INTO routes (route_code, route_name, area, city, description, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [route_code, route_name, area || null, city || null, description || null, is_active !== undefined ? is_active : true]
    );

    const [newRoute] = await db.query('SELECT * FROM routes WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: newRoute[0]
    });
  } catch (error) {
    console.error('Create route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: error.message
    });
  }
};

// Update route
exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { route_code, route_name, area, city, description, is_active } = req.body;

    const [routes] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check if route_code is being changed and already exists
    if (route_code && route_code !== routes[0].route_code) {
      const [existing] = await db.query('SELECT id FROM routes WHERE route_code = ? AND id != ?', [route_code, id]);
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Route code already exists'
        });
      }
    }

    await db.query(
      'UPDATE routes SET route_code = ?, route_name = ?, area = ?, city = ?, description = ?, is_active = ? WHERE id = ?',
      [
        route_code || routes[0].route_code,
        route_name || routes[0].route_name,
        area !== undefined ? area : routes[0].area,
        city !== undefined ? city : routes[0].city,
        description !== undefined ? description : routes[0].description,
        is_active !== undefined ? is_active : routes[0].is_active,
        id
      ]
    );

    const [updated] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Route updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update route',
      error: error.message
    });
  }
};

// Delete route
exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;

    const [routes] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Check if route has shops assigned
    const [shops] = await db.query('SELECT COUNT(*) as count FROM shops WHERE route_id = ?', [id]);

    if (shops[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete route. ${shops[0].count} shop(s) are assigned to this route. Please reassign them first.`
      });
    }

    await db.query('DELETE FROM routes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Route deleted successfully'
    });
  } catch (error) {
    console.error('Delete route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete route',
      error: error.message
    });
  }
};

// Get route statistics
exports.getRouteStats = async (req, res) => {
  try {
    const { id } = req.params;

    const [routes] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Get shop count for this route
    const [shops] = await db.query(
      'SELECT COUNT(*) as count FROM shops WHERE route_id = ? AND is_active = 1',
      [id]
    );

    res.json({
      success: true,
      data: {
        route: routes[0],
        stats: {
          total_shops: shops[0].count
        }
      }
    });
  } catch (error) {
    console.error('Get route stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route statistics',
      error: error.message
    });
  }
};

// Get route-wise consolidated bill
// Shows all deliveries for a route within a date range, grouped by shop
exports.getRouteConsolidatedBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    // Validate route exists
    const [routes] = await db.query('SELECT * FROM routes WHERE id = ?', [id]);
    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    const route = routes[0];

    // Build date filter
    let dateFilter = '';
    const params = [id];
    if (start_date) {
      dateFilter += ' AND DATE(d.delivery_date) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND DATE(d.delivery_date) <= ?';
      params.push(end_date);
    }

    // Get all deliveries for this route with shop details
    const [deliveries] = await db.query(`
      SELECT 
        d.id as delivery_id,
        d.challan_number,
        d.delivery_date,
        d.shop_id,
        d.shop_name,
        d.shop_address,
        d.shop_contact,
        d.salesman_name,
        d.status,
        d.total_items,
        d.total_quantity,
        d.subtotal,
        d.discount_percentage,
        d.discount_amount,
        d.grand_total,
        d.total_amount
      FROM deliveries d
      WHERE d.route_id = ? ${dateFilter}
      ORDER BY d.shop_name ASC, d.delivery_date DESC
    `, params);

    // Get delivery items for all deliveries in one query
    if (deliveries.length > 0) {
      const deliveryIds = deliveries.map(d => d.delivery_id);
      const placeholders = deliveryIds.map(() => '?').join(',');
      
      const [items] = await db.query(`
        SELECT 
          di.delivery_id,
          di.product_id,
          di.product_name,
          di.product_code,
          di.quantity_ordered,
          di.quantity_delivered,
          di.quantity_returned,
          di.unit_price,
          di.total_price,
          di.discount_percentage,
          di.discount_amount,
          di.net_amount
        FROM delivery_items di
        WHERE di.delivery_id IN (${placeholders})
        ORDER BY di.product_name ASC
      `, deliveryIds);

      // Attach items to deliveries
      const itemsByDelivery = {};
      items.forEach(item => {
        if (!itemsByDelivery[item.delivery_id]) {
          itemsByDelivery[item.delivery_id] = [];
        }
        itemsByDelivery[item.delivery_id].push(item);
      });

      deliveries.forEach(d => {
        d.items = itemsByDelivery[d.delivery_id] || [];
      });
    }

    // Group deliveries by shop
    const shopGroups = {};
    deliveries.forEach(d => {
      if (!shopGroups[d.shop_id]) {
        shopGroups[d.shop_id] = {
          shop_id: d.shop_id,
          shop_name: d.shop_name,
          shop_address: d.shop_address,
          shop_contact: d.shop_contact,
          deliveries: [],
          total_deliveries: 0,
          total_amount: 0,
          total_discount: 0,
          grand_total: 0
        };
      }
      shopGroups[d.shop_id].deliveries.push(d);
      shopGroups[d.shop_id].total_deliveries++;
      shopGroups[d.shop_id].total_amount += parseFloat(d.subtotal || d.total_amount || 0);
      shopGroups[d.shop_id].total_discount += parseFloat(d.discount_amount || 0);
      shopGroups[d.shop_id].grand_total += parseFloat(d.grand_total || d.total_amount || 0);
    });

    // Build product-wise summary across all shops
    const productSummary = {};
    deliveries.forEach(d => {
      (d.items || []).forEach(item => {
        const key = item.product_id;
        if (!productSummary[key]) {
          productSummary[key] = {
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            total_quantity_ordered: 0,
            total_quantity_delivered: 0,
            total_quantity_returned: 0,
            total_amount: 0,
            total_discount: 0,
            net_amount: 0
          };
        }
        productSummary[key].total_quantity_ordered += parseFloat(item.quantity_ordered || 0);
        productSummary[key].total_quantity_delivered += parseFloat(item.quantity_delivered || 0);
        productSummary[key].total_quantity_returned += parseFloat(item.quantity_returned || 0);
        productSummary[key].total_amount += parseFloat(item.total_price || 0);
        productSummary[key].total_discount += parseFloat(item.discount_amount || 0);
        productSummary[key].net_amount += parseFloat(item.net_amount || item.total_price || 0);
      });
    });

    // Calculate route totals
    const routeTotals = {
      total_shops: Object.keys(shopGroups).length,
      total_deliveries: deliveries.length,
      total_amount: deliveries.reduce((sum, d) => sum + parseFloat(d.subtotal || d.total_amount || 0), 0),
      total_discount: deliveries.reduce((sum, d) => sum + parseFloat(d.discount_amount || 0), 0),
      grand_total: deliveries.reduce((sum, d) => sum + parseFloat(d.grand_total || d.total_amount || 0), 0)
    };

    res.json({
      success: true,
      data: {
        route,
        date_range: { start_date: start_date || 'all', end_date: end_date || 'all' },
        totals: routeTotals,
        shops: Object.values(shopGroups),
        product_summary: Object.values(productSummary).sort((a, b) => a.product_name.localeCompare(b.product_name))
      }
    });
  } catch (error) {
    console.error('Get route consolidated bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate consolidated bill',
      error: error.message
    });
  }
};

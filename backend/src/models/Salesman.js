/**
 * Salesman Model
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

const db = require('../config/database');

const Salesman = {
  /**
   * Create a new salesman
   */
  async create(salesmanData) {
    const {
      salesman_code,
      full_name,
      phone,
      email,
      cnic,
      address,
      city,
      hire_date,
      monthly_target,
      commission_percentage,
      user_id = null,
      is_active = 1
    } = salesmanData;

    const [result] = await db.query(
      `INSERT INTO salesmen 
       (salesman_code, full_name, phone, email, cnic, address, city, hire_date, 
        monthly_target, commission_percentage, user_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [salesman_code, full_name, phone, email, cnic, address, city, hire_date,
       monthly_target, commission_percentage, user_id, is_active]
    );

    return { id: result.insertId, ...salesmanData };
  },

  /**
   * Find all salesmen with optional filters and pagination
   */
  async findAll(filters = {}) {
    const {
      page = 1,
      limit = 10,
      search = '',
      city = '',
      is_active = null,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM salesmen WHERE 1=1';
    const params = [];

    // Apply filters
    if (search) {
      query += ` AND (full_name LIKE ? OR salesman_code LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (city) {
      query += ` AND city = ?`;
      params.push(city);
    }

    if (is_active !== null) {
      query += ` AND is_active = ?`;
      params.push(is_active);
    }

    // Add sorting
    const allowedSortFields = ['salesman_code', 'full_name', 'city', 'monthly_target', 'created_at'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${order}`;

    // Add pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [salesmen] = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM salesmen WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ` AND (full_name LIKE ? OR salesman_code LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (city) {
      countQuery += ` AND city = ?`;
      countParams.push(city);
    }

    if (is_active !== null) {
      countQuery += ` AND is_active = ?`;
      countParams.push(is_active);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    return {
      salesmen,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Find salesman by ID with assigned routes
   */
  async findById(id) {
    const [salesmen] = await db.query(
      `SELECT s.*, u.username, u.email as login_email
       FROM salesmen s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
      [id]
    );

    if (salesmen.length === 0) {
      return null;
    }

    const salesman = salesmen[0];

    // Get assigned routes
    const [routes] = await db.query(
      `SELECT id, route_code, route_name, description, is_active
       FROM routes
       WHERE salesman_id = ?`,
      [id]
    );

    salesman.assigned_routes = routes;

    return salesman;
  },

  /**
   * Find salesman by code
   */
  async findByCode(code) {
    const [salesmen] = await db.query(
      'SELECT * FROM salesmen WHERE salesman_code = ?',
      [code]
    );
    return salesmen.length > 0 ? salesmen[0] : null;
  },

  /**
   * Update salesman details
   */
  async update(id, updateData) {
    const allowedFields = [
      'full_name', 'phone', 'email', 'cnic', 'address', 'city',
      'hire_date', 'monthly_target', 'commission_percentage', 'user_id', 'is_active'
    ];

    const updates = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    const [result] = await db.query(
      `UPDATE salesmen SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  },

  /**
   * Soft delete salesman (set is_active = 0)
   */
  async delete(id) {
    const [result] = await db.query(
      'UPDATE salesmen SET is_active = 0 WHERE id = ?',
      [id]
    );

    return result.affectedRows > 0;
  },

  /**
   * Assign route to salesman
   */
  async assignRoute(salesmanId, routeId) {
    // Check if salesman exists
    const salesman = await this.findById(salesmanId);
    if (!salesman) {
      throw new Error('Salesman not found');
    }

    // Check if route exists
    const [routes] = await db.query('SELECT id FROM routes WHERE id = ?', [routeId]);
    if (routes.length === 0) {
      throw new Error('Route not found');
    }

    // Assign route
    const [result] = await db.query(
      'UPDATE routes SET salesman_id = ? WHERE id = ?',
      [salesmanId, routeId]
    );

    return result.affectedRows > 0;
  },

  /**
   * Unassign route from salesman
   */
  async unassignRoute(routeId) {
    const [result] = await db.query(
      'UPDATE routes SET salesman_id = NULL WHERE id = ?',
      [routeId]
    );

    return result.affectedRows > 0;
  },

  /**
   * Get all routes assigned to a salesman
   */
  async getAssignedRoutes(salesmanId) {
    const [routes] = await db.query(
      `SELECT r.*, COUNT(s.id) as total_shops
       FROM routes r
       LEFT JOIN shops s ON s.route_id = r.id AND s.is_active = 1
       WHERE r.salesman_id = ? AND r.is_active = 1
       GROUP BY r.id`,
      [salesmanId]
    );

    return routes;
  },

  /**
   * Get salesman performance metrics
   */
  async getPerformance(salesmanId) {
    const salesman = await this.findById(salesmanId);
    if (!salesman) {
      return null;
    }

    // Get routes count
    const [routesCount] = await db.query(
      'SELECT COUNT(*) as count FROM routes WHERE salesman_id = ? AND is_active = 1',
      [salesmanId]
    );

    // Get total shops covered
    const [shopsCount] = await db.query(
      `SELECT COUNT(s.id) as count
       FROM shops s
       INNER JOIN routes r ON r.id = s.route_id
       WHERE r.salesman_id = ? AND s.is_active = 1`,
      [salesmanId]
    );

    // TODO: Add order statistics when Orders module is implemented
    // This will include: total_orders, total_revenue, commission_earned

    return {
      salesman_id: salesmanId,
      salesman_code: salesman.salesman_code,
      full_name: salesman.full_name,
      monthly_target: salesman.monthly_target,
      commission_percentage: salesman.commission_percentage,
      assigned_routes: routesCount[0].count,
      total_shops: shopsCount[0].count,
      // Future: total_orders, total_revenue, commission_earned, target_achievement_percentage
    };
  },

  /**
   * Check if salesman code already exists
   */
  async codeExists(code, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM salesmen WHERE salesman_code = ?';
    const params = [code];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [result] = await db.query(query, params);
    return result[0].count > 0;
  },

  /**
   * Check if CNIC already exists
   */
  async cnicExists(cnic, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM salesmen WHERE cnic = ?';
    const params = [cnic];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [result] = await db.query(query, params);
    return result[0].count > 0;
  },

  /**
   * Get all active salesmen (for dropdowns)
   */
  async getActiveSalesmen() {
    const [salesmen] = await db.query(
      'SELECT id, salesman_code, full_name, phone, city FROM salesmen WHERE is_active = 1 ORDER BY full_name ASC'
    );
    return salesmen;
  },

  /**
   * Get salesmen summary (using view)
   */
  async getSummary() {
    const [summary] = await db.query('SELECT * FROM v_salesmen_summary ORDER BY full_name ASC');
    return summary;
  },

  /**
   * Permanently delete salesman from database (hard delete)
   * This will remove the salesman record completely
   * @param {number} id - Salesman ID to delete
   * @returns {Promise<Object>} - Query result
   */
  async permanentDelete(id) {
    try {
      // First, unassign all routes assigned to this salesman
      await db.query(
        'UPDATE routes SET salesman_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE salesman_id = ?',
        [id]
      );

      // Then permanently delete the salesman record from database
      const [result] = await db.query(
        'DELETE FROM salesmen WHERE id = ?',
        [id]
      );

      return result;
    } catch (error) {
      console.error('Error in permanentDelete:', error);
      throw error;
    }
  }
};

module.exports = Salesman;

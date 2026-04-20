/**
 * Daily Collection Model
 * Tracks daily received amounts from shops/salesmen
 * Company: Ummahtechinnovations.com
 */

const db = require('../config/database');

class DailyCollection {
  /**
   * Add a new daily collection entry
   */
  static async create(data) {
    const [result] = await db.query(`
      INSERT INTO daily_collections (
        collection_date, shop_id, shop_name,
        salesman_id, salesman_name, amount,
        payment_method, reference_number,
        description, received_from, notes, created_by, created_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.collection_date || new Date(),
      data.shop_id || null,
      data.shop_name || null,
      data.salesman_id || null,
      data.salesman_name || null,
      data.amount,
      data.payment_method || 'cash',
      data.reference_number || null,
      data.description || null,
      data.received_from || null,
      data.notes || null,
      data.created_by || null,
      data.created_by_name || null
    ]);

    return await DailyCollection.getById(result.insertId);
  }

  /**
   * Get collection by ID
   */
  static async getById(id) {
    const [rows] = await db.query('SELECT * FROM daily_collections WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get all collections with filters
   */
  static async getAll(filters = {}) {
    let query = 'SELECT * FROM daily_collections WHERE 1=1';
    const params = [];

    if (filters.date) {
      query += ' AND collection_date = ?';
      params.push(filters.date);
    }

    if (filters.start_date) {
      query += ' AND collection_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND collection_date <= ?';
      params.push(filters.end_date);
    }

    if (filters.shop_id) {
      query += ' AND shop_id = ?';
      params.push(filters.shop_id);
    }

    if (filters.salesman_id) {
      query += ' AND salesman_id = ?';
      params.push(filters.salesman_id);
    }

    if (filters.payment_method) {
      query += ' AND payment_method = ?';
      params.push(filters.payment_method);
    }

    if (filters.search) {
      query += ' AND (shop_name LIKE ? OR salesman_name LIKE ? OR description LIKE ? OR reference_number LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY collection_date DESC, created_at DESC';

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(query, params);

    return {
      collections: rows,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  /**
   * Get daily summary (aggregated by date)
   */
  static async getDailySummary(filters = {}) {
    let whereClause = '';
    const params = [];

    if (filters.start_date) {
      whereClause += ' AND collection_date >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      whereClause += ' AND collection_date <= ?';
      params.push(filters.end_date);
    }

    const [summary] = await db.query(`
      SELECT
        collection_date,
        COUNT(*) as total_entries,
        SUM(amount) as total_amount,
        SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_amount,
        SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END) as bank_amount,
        SUM(CASE WHEN payment_method = 'cheque' THEN amount ELSE 0 END) as cheque_amount,
        SUM(CASE WHEN payment_method = 'online' THEN amount ELSE 0 END) as online_amount
      FROM daily_collections
      WHERE 1=1 ${whereClause}
      GROUP BY collection_date
      ORDER BY collection_date DESC
      LIMIT 30
    `, params);

    return summary;
  }

  /**
   * Get today's collection summary
   */
  static async getTodaySummary() {
    const today = new Date().toISOString().split('T')[0];

    const [summary] = await db.query(`
      SELECT
        COUNT(*) as total_entries,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'bank_transfer' THEN amount ELSE 0 END), 0) as bank_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'cheque' THEN amount ELSE 0 END), 0) as cheque_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'online' THEN amount ELSE 0 END), 0) as online_amount
      FROM daily_collections
      WHERE collection_date = ?
    `, [today]);

    return summary[0];
  }

  /**
   * Update a collection entry
   */
  static async update(id, data) {
    await db.query(`
      UPDATE daily_collections SET
        collection_date = COALESCE(?, collection_date),
        shop_id = ?, shop_name = ?,
        salesman_id = ?, salesman_name = ?,
        amount = COALESCE(?, amount),
        payment_method = COALESCE(?, payment_method),
        reference_number = ?,
        description = ?, received_from = ?, notes = ?
      WHERE id = ?
    `, [
      data.collection_date,
      data.shop_id || null, data.shop_name || null,
      data.salesman_id || null, data.salesman_name || null,
      data.amount,
      data.payment_method,
      data.reference_number || null,
      data.description || null, data.received_from || null, data.notes || null,
      id
    ]);

    return await DailyCollection.getById(id);
  }

  /**
   * Delete a collection entry
   */
  static async delete(id) {
    await db.query('DELETE FROM daily_collections WHERE id = ?', [id]);
    return { success: true, message: 'Collection entry deleted' };
  }
}

module.exports = DailyCollection;

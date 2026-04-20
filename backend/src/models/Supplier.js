/**
 * Supplier Model
 * Handles all database operations for suppliers
 */

const db = require('../config/database');

const Supplier = {
  /**
   * Get all suppliers with pagination
   */
  async findAll(options = {}) {
    const { page = 1, limit = 20, search = '', is_active = null } = options;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    
    if (search) {
      query += ` AND (supplier_name LIKE ? OR supplier_code LIKE ? OR contact_person LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (is_active !== null) {
      query += ` AND is_active = ?`;
      params.push(is_active);
    }
    
    query += ` ORDER BY supplier_name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [suppliers] = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM suppliers WHERE 1=1';
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (supplier_name LIKE ? OR supplier_code LIKE ? OR contact_person LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (is_active !== null) {
      countQuery += ` AND is_active = ?`;
      countParams.push(is_active);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    
    return {
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  },

  /**
   * Get supplier by ID
   */
  async findById(id) {
    const [suppliers] = await db.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    return suppliers[0];
  },

  /**
   * Get supplier by code
   */
  async findByCode(supplierCode) {
    const [suppliers] = await db.query('SELECT * FROM suppliers WHERE supplier_code = ?', [supplierCode]);
    return suppliers[0];
  },

  /**
   * Create new supplier
   */
  async create(supplierData) {
    const {
      supplier_code,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      city,
      opening_balance,
      is_active,
      created_by
    } = supplierData;
    
    const [result] = await db.query(`
      INSERT INTO suppliers (
        supplier_code, supplier_name, contact_person, phone, email,
        address, city, opening_balance, current_balance, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      supplier_code, supplier_name, contact_person || null, phone || null, email || null,
      address || null, city || null, opening_balance || 0, opening_balance || 0, is_active !== false, created_by || null
    ]);
    
    return await this.findById(result.insertId);
  },

  /**
   * Update supplier
   */
  async update(id, supplierData) {
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      city,
      is_active
    } = supplierData;
    
    await db.query(`
      UPDATE suppliers SET
        supplier_name = ?,
        contact_person = ?,
        phone = ?,
        email = ?,
        address = ?,
        city = ?,
        is_active = ?
      WHERE id = ?
    `, [supplier_name, contact_person, phone, email, address, city, is_active, id]);
    
    return await this.findById(id);
  },

  /**
   * Delete supplier
   */
  async delete(id) {
    // Check if supplier has products
    const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE supplier_id = ?', [id]);
    
    if (products[0].count > 0) {
      throw new Error(`Cannot delete supplier. ${products[0].count} product(s) are linked to this supplier`);
    }
    
    await db.query('DELETE FROM suppliers WHERE id = ?', [id]);
    return { success: true, message: 'Supplier deleted successfully' };
  },

  /**
   * Get active suppliers only
   */
  async findActive() {
    const [suppliers] = await db.query(`
      SELECT * FROM suppliers 
      WHERE is_active = TRUE 
      ORDER BY supplier_name ASC
    `);
    
    return suppliers;
  },

  /**
   * Update supplier balance
   */
  async updateBalance(id, amount) {
    await db.query(`
      UPDATE suppliers 
      SET current_balance = current_balance + ? 
      WHERE id = ?
    `, [amount, id]);
    
    return await this.findById(id);
  },

  /**
   * Check if supplier code exists
   */
  async supplierCodeExists(supplierCode, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM suppliers WHERE supplier_code = ?';
    const params = [supplierCode];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [result] = await db.query(query, params);
    return result[0].count > 0;
  },

  /**
   * Generate unique supplier code
   */
  async generateSupplierCode() {
    const [result] = await db.query('SELECT COUNT(*) as count FROM suppliers');
    const count = result[0].count + 1;
    return `SUP${count.toString().padStart(3, '0')}`;
  }
};

module.exports = Supplier;

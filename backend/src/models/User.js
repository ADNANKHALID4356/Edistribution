const db = require('../config/database');

class User {
  // Find user by email
  static async findByEmail(email) {
    const [rows] = await db.query(
      `SELECT u.*, r.role_name, r.permissions, s.id as salesman_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN salesmen s ON s.user_id = u.id
       WHERE u.email = ?`,
      [email]
    );
    return rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    console.log('🔍 [USER MODEL] Searching for username:', username);
    const [rows] = await db.query(
      `SELECT u.*, r.role_name, r.permissions, s.id as salesman_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN salesmen s ON s.user_id = u.id
       WHERE u.username = ?`,
      [username]
    );
    console.log('🔍 [USER MODEL] Query returned', rows.length, 'result(s)');
    if (rows[0]) {
      console.log('🔍 [USER MODEL] Found user:', {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        role_name: rows[0].role_name,
        salesman_id: rows[0].salesman_id,
        is_active: rows[0].is_active
      });
    }
    return rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, 
              u.role_id, r.role_name, r.permissions, u.is_active, 
              u.last_login, u.created_at, s.id as salesman_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       LEFT JOIN salesmen s ON s.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  }

  // Create new user
  static async create(userData) {
    const { username, email, password, full_name, phone, role_id } = userData;
    
    const [result] = await db.query(
      `INSERT INTO users (username, email, password, full_name, phone, role_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, email, password, full_name, phone, role_id]
    );
    
    return result.insertId;
  }

  // Update last login
  static async updateLastLogin(userId) {
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  // Check if email exists
  static async emailExists(email) {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    return rows.length > 0;
  }

  // Check if username exists
  static async usernameExists(username) {
    const [rows] = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    return rows.length > 0;
  }

  // Update user active status
  static async updateActiveStatus(userId, isActive) {
    await db.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [isActive, userId]
    );
  }

  // Update user password
  static async updatePassword(userId, hashedPassword) {
    await db.query(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, userId]
    );
  }

  // Get user with password (for credential management)
  static async findByIdWithPassword(id) {
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.email, u.password, u.full_name, u.phone, 
              u.role_id, r.role_name, u.is_active
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async listRoles() {
    const [rows] = await db.query(
      'SELECT id, role_name, description FROM roles ORDER BY role_name ASC'
    );
    return rows;
  }

  static async findRoleByName(roleName) {
    const [rows] = await db.query(
      'SELECT id, role_name, description FROM roles WHERE role_name = ?',
      [roleName]
    );
    return rows[0];
  }

  static async listUsers(filters = {}) {
    const { page = 1, limit = 20, search = '', role_name, is_active } = filters;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active, u.last_login, u.created_at,
             r.id AS role_id, r.role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue);
    }

    if (role_name) {
      query += ' AND r.role_name = ?';
      params.push(role_name);
    }

    if (is_active !== undefined) {
      query += ' AND u.is_active = ?';
      params.push(is_active ? 1 : 0);
    }

    const countQuery = query.replace(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.is_active, u.last_login, u.created_at,
             r.id AS role_id, r.role_name`,
      'SELECT COUNT(*) AS total'
    );

    const [countRows] = await db.query(countQuery, params);
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const [users] = await db.query(query, params);
    return {
      users,
      pagination: {
        total: Number(countRows[0]?.total || 0),
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(Number(countRows[0]?.total || 0) / parseInt(limit, 10))
      }
    };
  }

  static async updateProfile(userId, data = {}) {
    const allowedFields = ['username', 'email', 'full_name', 'phone', 'role_id', 'is_active'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        updates.push(`${field} = ?`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return false;
    }

    values.push(userId);
    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    return true;
  }

  static async deleteById(userId) {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
    return result.affectedRows > 0;
  }
}

module.exports = User;

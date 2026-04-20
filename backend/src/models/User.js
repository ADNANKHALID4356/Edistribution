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
}

module.exports = User;

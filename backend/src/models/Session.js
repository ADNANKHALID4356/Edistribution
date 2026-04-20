const db = require('../config/database');

class Session {
  // Create new session
  static async create(sessionData) {
    const { user_id, token, device_info, ip_address, expires_at } = sessionData;
    
    const [result] = await db.query(
      `INSERT INTO sessions (user_id, token, device_info, ip_address, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, token, device_info, ip_address, expires_at]
    );
    
    return result.insertId;
  }

  // Find session by token
  static async findByToken(token) {
    const [rows] = await db.query(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    return rows[0];
  }

  // Delete session (logout)
  static async delete(token) {
    await db.query('DELETE FROM sessions WHERE token = ?', [token]);
  }

  // Delete all user sessions
  static async deleteAllUserSessions(userId) {
    await db.query('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }

  // Clean expired sessions
  static async cleanExpired() {
    await db.query('DELETE FROM sessions WHERE expires_at < NOW()');
  }
}

module.exports = Session;

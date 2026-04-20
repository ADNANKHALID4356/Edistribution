const mysql = require('mysql2');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend root directory
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Check if SQLite mode is enabled (skip MySQL connection)
const useSQLite = process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development';

if (useSQLite) {
  console.log('⚠️  Skipping MySQL connection - SQLite mode enabled');
  // In SQLite mode, export the SQLite database wrapper instead
  module.exports = require('./database-sqlite');
} else {
  // Create connection pool
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Test connection
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      if (err.code === 'ER_BAD_DB_ERROR') {
        console.error('💡 Database does not exist. Please create it first:');
        console.error('   Run: CREATE DATABASE distribution_system_db;');
      }
      // Don't exit process here, let server handle it
      return;
    }
    console.log('✅ Database connected successfully');
    if (connection) {
      connection.release();
    }
  });

  // Export promise-based pool
  module.exports = pool.promise();
}

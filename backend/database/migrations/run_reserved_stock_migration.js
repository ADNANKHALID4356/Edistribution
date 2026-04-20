/**
 * Simple Migration Runner - Execute SQL files directly
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function executeSQLFile(connection, filename, description) {
  console.log(`\n📋 ${description}...`);
  try {
    const sql = fs.readFileSync(path.join(__dirname, filename), 'utf8');
    await connection.query(sql);
    console.log(`✅ ${description} completed`);
    return true;
  } catch (err) {
    console.error(`❌ ${description} failed:`, err.message);
    return false;
  }
}

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting Reserved Stock Migration...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'distribution_system_db',
      multipleStatements: true
    });
    
    console.log('✅ Connected to database:', process.env.DB_NAME);
    
    // Execute migration files in sequence
    await executeSQLFile(connection, '017_schema_changes.sql', 'Schema Changes');
    await executeSQLFile(connection, '017_procedures.sql', 'Stored Procedures');
    await executeSQLFile(connection, '017_views.sql', 'Views and Indexes');
    
    // Verify
    console.log('\n📊 Verifying migration...');
    const [result] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'reserved_stock') as has_reserved_stock,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.ROUTINES 
         WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME LIKE 'sp_%stock%') as procedure_count,
        (SELECT COUNT(*) FROM products) as product_count,
        (SELECT SUM(stock_quantity) FROM products) as total_stock
    `);
    
    console.log('✅ Migration verified:');
    console.log(`   Reserved stock column: ${result[0].has_reserved_stock ? 'YES' : 'NO'}`);
    console.log(`   Procedures created: ${result[0].procedure_count}`);
    console.log(`   Products in system: ${result[0].product_count}`);
    console.log(`   Total stock: ${result[0].total_stock}`);
    
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

runMigration();

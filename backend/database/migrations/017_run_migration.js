/**
 * Reserved Stock Migration Runner
 * Executes the migration in proper sequence
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting Reserved Stock Migration...\n');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'distribution_system_db',
      multipleStatements: true
    });
    
    console.log('✅ Connected to database:', process.env.DB_NAME);
    
    // Read migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '017_add_reserved_stock_system.sql'),
      'utf8'
    );
    
    // Split by DELIMITER to separate procedures
    const sqlParts = migrationSQL.split(/DELIMITER\s+\/\//i);
    
    // Part 1: Everything before procedures (schema changes, tables, views)
    if (sqlParts[0]) {
      console.log('\n📋 Step 1: Executing schema changes...');
      const part1 = sqlParts[0].trim();
      if (part1) {
        await connection.query(part1);
        console.log('✅ Schema changes completed');
      }
    }
    
    // Part 2: Procedures (between first and second DELIMITER)
    if (sqlParts[1]) {
      const proceduresPart = sqlParts[1].split(/DELIMITER\s+;/i)[0];
      const procedures = proceduresPart.split(/CREATE PROCEDURE/i).filter(p => p.trim());
      
      console.log(`\n📋 Step 2: Creating ${procedures.length} stored procedures...`);
      
      for (let i = 0; i < procedures.length; i++) {
        const proc = 'CREATE PROCEDURE' + procedures[i].trim();
        try {
          await connection.query(proc);
          console.log(`  ✅ Procedure ${i + 1}/${procedures.length} created`);
        } catch (err) {
          if (err.code === 'ER_SP_ALREADY_EXISTS') {
            console.log(`  ⚠️  Procedure ${i + 1}/${procedures.length} already exists, skipping`);
          } else {
            throw err;
          }
        }
      }
    }
    
    // Part 3: Everything after procedures (views, final checks)
    if (sqlParts.length > 1) {
      const afterDelimiterParts = sqlParts[sqlParts.length - 1].split(/DELIMITER\s+;/i);
      if (afterDelimiterParts.length > 1) {
        const part3 = afterDelimiterParts[1].trim();
        if (part3) {
          console.log('\n📋 Step 3: Creating views and final setup...');
          await connection.query(part3);
          console.log('✅ Views and final setup completed');
        }
      }
    }
    
    // Verify migration
    console.log('\n📊 Verifying migration...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'products' AND COLUMN_NAME = 'reserved_stock'
    `, [process.env.DB_NAME]);
    
    if (columns.length > 0) {
      console.log('✅ reserved_stock column added successfully');
      console.log('   Type:', columns[0].DATA_TYPE);
      console.log('   Comment:', columns[0].COLUMN_COMMENT);
    }
    
    const [orderColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'orders' AND COLUMN_NAME IN ('stock_reserved', 'stock_deducted')
    `, [process.env.DB_NAME]);
    
    console.log(`✅ Order tracking columns: ${orderColumns.map(c => c.COLUMN_NAME).join(', ')}`);
    
    const [procedures] = await connection.query(`
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME LIKE 'sp_%stock%'
    `, [process.env.DB_NAME]);
    
    console.log(`✅ Stored procedures created: ${procedures.length}`);
    procedures.forEach(p => console.log(`   - ${p.ROUTINE_NAME}`));
    
    const [views] = await connection.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%stock%'
    `, [process.env.DB_NAME]);
    
    console.log(`✅ Stock-related views: ${views.length}`);
    views.forEach(v => console.log(`   - ${v.TABLE_NAME}`));
    
    // Get product count
    const [productCount] = await connection.query(`
      SELECT COUNT(*) as count, 
             SUM(stock_quantity) as total_stock,
             SUM(reserved_stock) as total_reserved
      FROM products
    `);
    
    console.log('\n📊 Current Stock Status:');
    console.log(`   Total Products: ${productCount[0].count}`);
    console.log(`   Total Stock: ${productCount[0].total_stock}`);
    console.log(`   Total Reserved: ${productCount[0].total_reserved}`);
    console.log(`   Available: ${productCount[0].total_stock - productCount[0].total_reserved}`);
    
    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error code:', error.code);
    console.error('SQL State:', error.sqlState);
    if (error.sql) {
      console.error('SQL:', error.sql.substring(0, 200) + '...');
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
runMigration();

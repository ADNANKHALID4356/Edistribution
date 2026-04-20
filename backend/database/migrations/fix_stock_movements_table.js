/**
 * Fix stock_movements table - Add missing columns
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const columnsToAdd = [
  { name: 'stock_before', definition: 'DECIMAL(12, 2) NULL AFTER quantity' },
  { name: 'stock_after', definition: 'DECIMAL(12, 2) NULL AFTER stock_before' },
  { name: 'reserved_before', definition: 'DECIMAL(12, 2) DEFAULT 0.00 AFTER stock_after' },
  { name: 'reserved_after', definition: 'DECIMAL(12, 2) DEFAULT 0.00 AFTER reserved_before' },
  { name: 'available_before', definition: 'DECIMAL(12, 2) DEFAULT 0.00 AFTER reserved_after' },
  { name: 'available_after', definition: 'DECIMAL(12, 2) DEFAULT 0.00 AFTER available_before' },
  { name: 'reference_number', definition: 'VARCHAR(100) NULL AFTER reference_id' },
  { name: 'movement_date', definition: 'DATETIME DEFAULT CURRENT_TIMESTAMP AFTER notes' }
];

async function fixStockMovementsTable() {
  let connection;
  
  try {
    console.log('🔧 Fixing stock_movements table structure...\n');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Connected to database\n');
    
    // Get existing columns
    const [existing] = await connection.query('SHOW COLUMNS FROM stock_movements');
    const existingColumns = existing.map(col => col.Field);
    
    console.log('Existing columns:', existingColumns.join(', '), '\n');
    
    // Add missing columns
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        console.log(`Adding column: ${col.name}...`);
        try {
          await connection.query(`ALTER TABLE stock_movements ADD COLUMN ${col.name} ${col.definition}`);
          console.log(`✅ ${col.name} added`);
        } catch (err) {
          console.error(`❌ Failed to add ${col.name}:`, err.message);
        }
      } else {
        console.log(`✓ ${col.name} already exists`);
      }
    }
    
    // Modify quantity column
    console.log('\nModifying quantity column to DECIMAL...');
    await connection.query('ALTER TABLE stock_movements MODIFY COLUMN quantity DECIMAL(12, 2) NOT NULL');
    console.log('✅ quantity column updated');
    
    // Update movement_type enum
    console.log('\nUpdating movement_type enum...');
    try {
      await connection.query(`
        ALTER TABLE stock_movements 
        MODIFY COLUMN movement_type ENUM('RESERVE', 'RELEASE', 'DEDUCT', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'TRANSFER') NOT NULL
      `);
      console.log('✅ movement_type enum updated');
    } catch (err) {
      console.log('⚠️  movement_type may already be updated:', err.message);
    }
    
    // Verify
    console.log('\n📊 Final table structure:');
    const [final] = await connection.query('SHOW COLUMNS FROM stock_movements');
    final.forEach(col => {
      console.log(`  ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n✅ stock_movements table fixed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

fixStockMovementsTable();

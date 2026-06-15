/**
 * Add reserved_stock column to products table
 * This migration adds the missing reserved_stock column to the products table in SQLite
 */

const db = require('./src/config/database');

async function addReservedStockColumn() {
  try {
    console.log('\n🔧 ========== ADDING RESERVED_STOCK COLUMN ==========');
    
    // Check if column already exists
    const [columns] = await db.query(`PRAGMA table_info(products)`);
    const hasReservedStock = columns.some(col => col.name === 'reserved_stock');
    
    if (hasReservedStock) {
      console.log('✅ reserved_stock column already exists');
      console.log('🔧 ========== MIGRATION COMPLETE ==========\n');
      return;
    }
    
    console.log('📝 Adding reserved_stock column to products table...');
    
    // Add the column with default value 0
    await db.query(`ALTER TABLE products ADD COLUMN reserved_stock REAL DEFAULT 0`);
    
    console.log('✅ reserved_stock column added successfully');
    
    // Update existing products to have reserved_stock = 0
    await db.query(`UPDATE products SET reserved_stock = 0 WHERE reserved_stock IS NULL`);
    
    console.log('✅ Updated existing products with default reserved_stock = 0');
    
    // Verify the column was added
    const [verifyColumns] = await db.query(`PRAGMA table_info(products)`);
    const reservedStockCol = verifyColumns.find(col => col.name === 'reserved_stock');
    
    if (reservedStockCol) {
      console.log('✅ Verification passed: reserved_stock column exists');
      console.log('   Column details:', JSON.stringify(reservedStockCol, null, 2));
    } else {
      console.error('❌ Verification failed: reserved_stock column not found');
    }
    
    console.log('🔧 ========== MIGRATION COMPLETE ==========\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ ========== MIGRATION FAILED ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('❌ ========================================\n');
    process.exit(1);
  }
}

// Run migration
addReservedStockColumn();

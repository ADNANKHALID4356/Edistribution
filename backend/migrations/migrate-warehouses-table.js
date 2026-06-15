// Migration script to add is_default column to warehouses table
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'distribution_system.db');

console.log(`📂 Migrating database: ${DB_PATH}`);

const db = new Database(DB_PATH);

try {
  console.log('🔧 Starting warehouses table migration...');
  
  // Check if is_default column exists
  const tableInfo = db.prepare('PRAGMA table_info(warehouses)').all();
  const hasIsDefault = tableInfo.some(col => col.name === 'is_default');
  
  if (hasIsDefault) {
    console.log('✅ Column is_default already exists, no migration needed');
    process.exit(0);
  }
  
  console.log('Current table columns:', tableInfo.map(col => col.name).join(', '));
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  console.log('🔄 Adding is_default column...');
  
  // Add is_default column
  db.exec(`
    ALTER TABLE warehouses 
    ADD COLUMN is_default INTEGER DEFAULT 0
  `);
  
  console.log('✅ Added is_default column');
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ Migration completed successfully!');
  console.log('🎉 Warehouses table migration complete!');
  
  // Verify the change
  const newTableInfo = db.prepare('PRAGMA table_info(warehouses)').all();
  console.log('Updated table columns:', newTableInfo.map(col => col.name).join(', '));
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}

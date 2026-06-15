// Migration script to add salesman_id column to routes table
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'distribution_system.db');

console.log(`📂 Migrating database: ${DB_PATH}`);

const db = new Database(DB_PATH);

try {
  console.log('🔧 Starting routes table migration...');
  
  // Check if salesman_id column exists
  const tableInfo = db.prepare('PRAGMA table_info(routes)').all();
  const hasSalesmanId = tableInfo.some(col => col.name === 'salesman_id');
  
  if (hasSalesmanId) {
    console.log('✅ Column salesman_id already exists, no migration needed');
    process.exit(0);
  }
  
  console.log('Current table columns:', tableInfo.map(col => col.name).join(', '));
  
  // Begin transaction
  db.exec('BEGIN TRANSACTION');
  
  console.log('🔄 Adding salesman_id column...');
  
  // Add salesman_id column
  db.exec(`
    ALTER TABLE routes 
    ADD COLUMN salesman_id INTEGER REFERENCES salesmen(id) ON DELETE SET NULL
  `);
  
  console.log('✅ Added salesman_id column');
  
  // Commit transaction
  db.exec('COMMIT');
  
  console.log('✅ Migration completed successfully!');
  console.log('🎉 Routes table migration complete!');
  
  // Verify the change
  const newTableInfo = db.prepare('PRAGMA table_info(routes)').all();
  console.log('Updated table columns:', newTableInfo.map(col => col.name).join(', '));
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  db.exec('ROLLBACK');
  process.exit(1);
} finally {
  db.close();
}

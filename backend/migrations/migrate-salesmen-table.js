/**
 * Migration Script: Fix Salesmen Table Schema
 * Adds missing columns and renames commission_rate to commission_percentage
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'distribution_system.db');

// Create directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Created data directory');
}

console.log(`📂 Migrating database: ${dbPath}`);

const db = new Database(dbPath);

try {
  console.log('🔧 Starting salesmen table migration...');
  
  // Check if table exists
  const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='salesmen'").get();
  
  if (!tableExists) {
    console.log('⚠️  Salesmen table does not exist yet. Schema will be created correctly on next startup.');
    process.exit(0);
  }

  // Get current table schema
  const tableInfo = db.prepare("PRAGMA table_info(salesmen)").all();
  console.log('Current table columns:', tableInfo.map(col => col.name).join(', '));
  
  // Check which columns are missing
  const columnNames = tableInfo.map(col => col.name);
  const needsMigration = !columnNames.includes('full_name') || 
                         !columnNames.includes('hire_date') ||
                         !columnNames.includes('commission_percentage') ||
                         columnNames.includes('joining_date') ||
                         columnNames.includes('commission_rate');
  
  if (!needsMigration) {
    console.log('✅ Table schema is already up to date!');
    process.exit(0);
  }

  console.log('🔄 Migrating table schema...');

  // Begin transaction
  db.prepare('BEGIN TRANSACTION').run();

  try {
    // Step 1: Create new table with correct schema
    db.prepare(`
      CREATE TABLE salesmen_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE,
        salesman_code TEXT UNIQUE,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        cnic TEXT,
        address TEXT,
        city TEXT,
        hire_date DATETIME,
        monthly_target REAL DEFAULT 0,
        commission_percentage REAL DEFAULT 0,
        vehicle_number TEXT,
        license_number TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `).run();

    console.log('✅ Created new table with correct schema');

    // Step 2: Copy data from old table to new table
    // Map old column names to new ones
    const copySQL = `
      INSERT INTO salesmen_new (
        id, user_id, salesman_code, full_name, phone, email, cnic, address, city, 
        hire_date, monthly_target, commission_percentage, vehicle_number, license_number, 
        is_active, created_at, updated_at
      )
      SELECT 
        s.id, 
        s.user_id, 
        s.salesman_code, 
        COALESCE(u.full_name, 'Unknown') as full_name,
        COALESCE(u.phone, NULL) as phone,
        COALESCE(u.email, NULL) as email,
        s.cnic, 
        s.address, 
        s.city, 
        COALESCE(s.joining_date, datetime('now')) as hire_date,
        s.monthly_target, 
        COALESCE(s.commission_rate, 0) as commission_percentage,
        s.vehicle_number, 
        s.license_number, 
        s.is_active, 
        s.created_at, 
        s.updated_at
      FROM salesmen s
      LEFT JOIN users u ON u.id = s.user_id
    `;

    const result = db.prepare(copySQL).run();
    console.log(`✅ Copied ${result.changes} salesman records`);

    // Step 3: Drop views that reference salesmen table
    try {
      db.prepare('DROP VIEW IF EXISTS v_dashboard_stats').run();
      db.prepare('DROP VIEW IF EXISTS v_salesmen_summary').run();
      console.log('✅ Dropped dependent views');
    } catch (error) {
      console.log('⚠️  No views to drop');
    }

    // Step 4: Drop old table
    db.prepare('DROP TABLE salesmen').run();
    console.log('✅ Dropped old table');

    // Step 4: Rename new table to original name
    db.prepare('ALTER TABLE salesmen_new RENAME TO salesmen').run();
    console.log('✅ Renamed new table');

    // Commit transaction
    db.prepare('COMMIT').run();
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    throw error;
  }

} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

db.close();
console.log('🎉 Database migration complete!');

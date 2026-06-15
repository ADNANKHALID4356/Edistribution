/**
 * Check Ledger Database Status
 * Quick diagnostic script to check shop_ledger table and data
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'distribution_system.db');
const db = new Database(dbPath);

console.log('🔍 LEDGER SYSTEM DIAGNOSTIC\n');
console.log('=' .repeat(60));

// Check if shop_ledger table exists
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='shop_ledger'
`).all();

if (tables.length === 0) {
  console.log('❌ shop_ledger table DOES NOT EXIST!');
  console.log('   → Need to run migration: node migrate-create-ledger-system.js\n');
  db.close();
  process.exit(1);
}

console.log('✅ shop_ledger table exists\n');

// Check ledger entries count
const countResult = db.prepare('SELECT COUNT(*) as count FROM shop_ledger').get();
console.log(`📊 Total ledger entries: ${countResult.count}\n`);

if (countResult.count > 0) {
  // Show sample entries
  console.log('📋 Sample ledger entries:');
  console.log('-'.repeat(60));
  const entries = db.prepare(`
    SELECT 
      id, shop_id, transaction_date, transaction_type,
      reference_number, debit_amount, credit_amount, balance
    FROM shop_ledger 
    ORDER BY transaction_date DESC, id DESC
    LIMIT 10
  `).all();
  
  console.table(entries);
  
  // Check shop balances
  console.log('\n💰 Shop balances in ledger:');
  console.log('-'.repeat(60));
  const balances = db.prepare(`
    SELECT 
      s.id,
      s.shop_code,
      s.shop_name,
      s.current_balance as shop_table_balance,
      (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as ledger_balance
    FROM shops s
    WHERE s.id IN (SELECT DISTINCT shop_id FROM shop_ledger)
  `).all();
  
  console.table(balances);
} else {
  console.log('⚠️  No ledger entries found!');
  console.log('   → The table exists but is empty\n');
  
  // Check if there are invoices that need to be migrated
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get();
  const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments').get();
  
  console.log(`📄 Invoices in database: ${invoiceCount.count}`);
  console.log(`💳 Payments in database: ${paymentCount.count}\n`);
  
  if (invoiceCount.count > 0 || paymentCount.count > 0) {
    console.log('📝 ACTION REQUIRED:');
    console.log('   Run migration to populate ledger from existing data:');
    console.log('   → node migrate-create-ledger-system.js\n');
  }
}

// Check shops with test data
console.log('\n🏪 Shops in database:');
console.log('-'.repeat(60));
const shops = db.prepare(`
  SELECT id, shop_code, shop_name, current_balance, credit_limit
  FROM shops
  ORDER BY id
  LIMIT 10
`).all();
console.table(shops);

db.close();
console.log('\n' + '='.repeat(60));
console.log('✅ Diagnostic complete!\n');

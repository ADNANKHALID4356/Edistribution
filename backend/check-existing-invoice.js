/**
 * Check existing invoice data
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'distribution_system.db');
const db = new Database(dbPath, { readonly: true });

console.log('✅ Connected to SQLite database\n');

const invoices = db.prepare('SELECT * FROM invoices').all();
console.log('========================================');
console.log('EXISTING INVOICES:');
console.log('========================================\n');
console.log(JSON.stringify(invoices, null, 2));

const items = db.prepare('SELECT * FROM invoice_items').all();
console.log('\n========================================');
console.log('EXISTING INVOICE ITEMS:');
console.log('========================================\n');
console.log(JSON.stringify(items, null, 2));

db.close();

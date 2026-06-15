/**
 * Check invoice tables schema (SQLite with better-sqlite3)
 */

const Database = require('better-sqlite3');
const path = require('path');

async function checkInvoiceSchema() {
  try {
    const dbPath = path.join(__dirname, 'data', 'distribution_system.db');
    const db = new Database(dbPath, { readonly: true });

    console.log('✅ Connected to SQLite database');
    console.log('Database path:', dbPath);
    
    console.log('\n========================================');
    console.log('INVOICES TABLE STRUCTURE');
    console.log('========================================\n');

    const invoiceColumns = db.pragma('table_info(invoices)');
    console.log('Columns in invoices table:');
    invoiceColumns.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.name} (${col.type}) - NotNull:${col.notnull} - Default:${col.dflt_value}`);
    });

    console.log('\n========================================');
    console.log('INVOICE_ITEMS TABLE STRUCTURE');
    console.log('========================================\n');

    const itemColumns = db.pragma('table_info(invoice_items)');
    console.log('Columns in invoice_items table:');
    itemColumns.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.name} (${col.type}) - NotNull:${col.notnull} - Default:${col.dflt_value}`);
    });

    console.log('\n========================================');
    console.log('SAMPLE DATA COUNT');
    console.log('========================================\n');

    const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get();
    console.log(`Total invoices: ${invoiceCount.count}`);

    const itemCount = db.prepare('SELECT COUNT(*) as count FROM invoice_items').get();
    console.log(`Total invoice items: ${itemCount.count}`);

    db.close();
    console.log('\n✅ Schema check complete');
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
    process.exit(1);
  }
}

checkInvoiceSchema();

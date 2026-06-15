/**
 * Shop Ledger System Migration Script
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * This script creates the shop ledger infrastructure and migrates existing data:
 * 1. Creates shop_ledger table
 * 2. Creates payment_allocations table
 * 3. Adds last_transaction_date to shops
 * 4. Creates database views for reporting
 * 5. Migrates existing invoices to ledger
 * 6. Migrates existing payments to ledger
 * 7. Updates shops current_balance from ledger
 */

const Database = require('better-sqlite3');
const path = require('path');

// Use the same database path as the application
const dbPath = path.join(__dirname, 'data', 'distribution_system.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

async function migrateLedgerSystem() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      SHOP LEDGER SYSTEM MIGRATION - STARTING...           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // ============================================================
    // STEP 1: Create shop_ledger table
    // ============================================================
    console.log('📊 [STEP 1/9] Creating shop_ledger table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS shop_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        shop_name TEXT,
        transaction_date DATETIME NOT NULL,
        transaction_type TEXT NOT NULL CHECK(transaction_type IN ('invoice', 'payment', 'adjustment', 'opening_balance')),
        reference_type TEXT CHECK(reference_type IN ('invoice', 'payment', 'manual')),
        reference_id INTEGER,
        reference_number TEXT,
        debit_amount REAL DEFAULT 0,
        credit_amount REAL DEFAULT 0,
        balance REAL NOT NULL,
        description TEXT,
        notes TEXT,
        created_by INTEGER,
        created_by_name TEXT,
        is_manual INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      )
    `);
    console.log('✅ shop_ledger table created successfully\n');
    
    // ============================================================
    // STEP 2: Create indexes for performance
    // ============================================================
    console.log('🔍 [STEP 2/9] Creating indexes for shop_ledger...');
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_shop_id ON shop_ledger(shop_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_transaction_date ON shop_ledger(transaction_date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_reference ON shop_ledger(reference_type, reference_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_type ON shop_ledger(transaction_type)`);
    console.log('✅ Indexes created successfully\n');
    
    // ============================================================
    // STEP 3: Create payment_allocations table
    // ============================================================
    console.log('💰 [STEP 3/9] Creating payment_allocations table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payment_id INTEGER NOT NULL,
        invoice_id INTEGER NOT NULL,
        allocated_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice ON payment_allocations(invoice_id)`);
    console.log('✅ payment_allocations table created successfully\n');
    
    // ============================================================
    // STEP 4: Add last_transaction_date to shops
    // ============================================================
    console.log('🏪 [STEP 4/9] Updating shops table...');
    try {
      db.exec(`ALTER TABLE shops ADD COLUMN last_transaction_date DATETIME`);
      console.log('✅ Added last_transaction_date column to shops\n');
    } catch (error) {
      if (error.message.includes('duplicate column')) {
        console.log('⚠️  last_transaction_date already exists, skipping...\n');
      } else {
        throw error;
      }
    }
    
    // ============================================================
    // STEP 5: Create database views
    // ============================================================
    console.log('📊 [STEP 5/9] Creating database views...');
    
    // Drop views if they exist
    db.exec(`DROP VIEW IF EXISTS v_shop_balance_summary`);
    db.exec(`DROP VIEW IF EXISTS v_invoice_aging`);
    
    // Create v_shop_balance_summary
    db.exec(`
      CREATE VIEW v_shop_balance_summary AS
      SELECT 
        s.id as shop_id,
        s.shop_code,
        s.shop_name,
        s.credit_limit,
        s.opening_balance,
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as current_balance,
        s.credit_limit - COALESCE((SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1), 0) as available_credit,
        COALESCE((SELECT SUM(balance_amount) FROM invoices WHERE shop_id = s.id AND status IN ('unpaid', 'partial')), 0) as total_outstanding,
        COALESCE((SELECT COUNT(*) FROM invoices WHERE shop_id = s.id AND status IN ('unpaid', 'partial')), 0) as outstanding_invoice_count,
        s.last_transaction_date
      FROM shops s
      WHERE s.is_active = 1
    `);
    
    // Create v_invoice_aging
    db.exec(`
      CREATE VIEW v_invoice_aging AS
      SELECT 
        i.id,
        i.invoice_number,
        i.shop_id,
        s.shop_name,
        i.invoice_date,
        i.due_date,
        i.net_amount,
        i.paid_amount,
        i.balance_amount,
        i.status,
        CASE 
          WHEN i.due_date < datetime('now') THEN 
            CAST((julianday('now') - julianday(i.due_date)) AS INTEGER)
          ELSE 0
        END as days_overdue,
        CASE 
          WHEN i.due_date >= datetime('now') THEN '0-Current'
          WHEN CAST((julianday('now') - julianday(i.due_date)) AS INTEGER) BETWEEN 1 AND 30 THEN '1-30 Days'
          WHEN CAST((julianday('now') - julianday(i.due_date)) AS INTEGER) BETWEEN 31 AND 60 THEN '31-60 Days'
          WHEN CAST((julianday('now') - julianday(i.due_date)) AS INTEGER) BETWEEN 61 AND 90 THEN '61-90 Days'
          ELSE '90+ Days'
        END as aging_bucket
      FROM invoices i
      JOIN shops s ON i.shop_id = s.id
      WHERE i.status IN ('unpaid', 'partial')
    `);
    console.log('✅ Database views created successfully\n');
    
    // ============================================================
    // STEP 6: Create opening balance entries
    // ============================================================
    console.log('📝 [STEP 6/9] Creating opening balance entries...');
    const shops = db.prepare('SELECT * FROM shops WHERE is_active = 1').all();
    let openingBalanceCount = 0;
    
    for (const shop of shops) {
      if (shop.opening_balance && shop.opening_balance > 0) {
        db.prepare(`
          INSERT INTO shop_ledger (
            shop_id, shop_name, transaction_date, transaction_type,
            reference_type, reference_number,
            debit_amount, credit_amount, balance,
            description, created_by_name, is_manual
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          shop.id,
          shop.shop_name,
          shop.created_at || new Date().toISOString(),
          'opening_balance',
          'manual',
          'OPENING-BAL',
          shop.opening_balance,
          0,
          shop.opening_balance,
          'Opening balance from system migration',
          'System Migration',
          1
        );
        openingBalanceCount++;
      }
    }
    console.log(`✅ Created ${openingBalanceCount} opening balance entries\n`);
    
    // ============================================================
    // STEP 7: Migrate existing invoices to ledger
    // ============================================================
    console.log('📄 [STEP 7/9] Migrating existing invoices to ledger...');
    const invoices = db.prepare(`
      SELECT i.*, s.shop_name 
      FROM invoices i 
      JOIN shops s ON i.shop_id = s.id 
      ORDER BY i.invoice_date ASC, i.id ASC
    `).all();
    
    let invoiceCount = 0;
    for (const invoice of invoices) {
      // Get previous balance for this shop
      const prevEntry = db.prepare(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `).get(invoice.shop_id);
      
      const previousBalance = prevEntry ? prevEntry.balance : 0;
      const newBalance = previousBalance + invoice.net_amount;
      
      // Insert ledger entry for invoice
      db.prepare(`
        INSERT INTO shop_ledger (
          shop_id, shop_name, transaction_date, transaction_type,
          reference_type, reference_id, reference_number,
          debit_amount, credit_amount, balance,
          description, created_by_name, is_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoice.shop_id,
        invoice.shop_name,
        invoice.invoice_date,
        'invoice',
        'invoice',
        invoice.id,
        invoice.invoice_number,
        invoice.net_amount,
        0,
        newBalance,
        `Invoice ${invoice.invoice_number}`,
        'System Migration',
        0
      );
      invoiceCount++;
    }
    console.log(`✅ Migrated ${invoiceCount} invoices to ledger\n`);
    
    // ============================================================
    // STEP 8: Migrate existing payments to ledger
    // ============================================================
    console.log('💸 [STEP 8/9] Migrating existing payments to ledger...');
    const payments = db.prepare(`
      SELECT p.*, s.shop_name 
      FROM payments p 
      JOIN shops s ON p.shop_id = s.id 
      ORDER BY p.payment_date ASC, p.id ASC
    `).all();
    
    let paymentCount = 0;
    for (const payment of payments) {
      // Get previous balance for this shop
      const prevEntry = db.prepare(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `).get(payment.shop_id);
      
      const previousBalance = prevEntry ? prevEntry.balance : 0;
      const newBalance = previousBalance - payment.amount;
      
      // Insert ledger entry for payment
      db.prepare(`
        INSERT INTO shop_ledger (
          shop_id, shop_name, transaction_date, transaction_type,
          reference_type, reference_id, reference_number,
          debit_amount, credit_amount, balance,
          description, created_by_name, is_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        payment.shop_id,
        payment.shop_name,
        payment.payment_date,
        'payment',
        'payment',
        payment.id,
        payment.receipt_number,
        0,
        payment.amount,
        newBalance,
        `Payment ${payment.receipt_number}`,
        'System Migration',
        0
      );
      
      // If payment has invoice_id, create allocation
      if (payment.invoice_id) {
        db.prepare(`
          INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
          VALUES (?, ?, ?)
        `).run(payment.id, payment.invoice_id, payment.amount);
      }
      paymentCount++;
    }
    console.log(`✅ Migrated ${paymentCount} payments to ledger\n`);
    
    // ============================================================
    // STEP 9: Update shops current_balance from ledger
    // ============================================================
    console.log('🔄 [STEP 9/9] Updating shops current_balance from ledger...');
    db.exec(`
      UPDATE shops 
      SET current_balance = (
        SELECT balance FROM shop_ledger 
        WHERE shop_ledger.shop_id = shops.id 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      ),
      last_transaction_date = (
        SELECT transaction_date FROM shop_ledger 
        WHERE shop_ledger.shop_id = shops.id 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      )
      WHERE EXISTS (
        SELECT 1 FROM shop_ledger WHERE shop_ledger.shop_id = shops.id
      )
    `);
    console.log('✅ Updated shops current_balance from ledger\n');
    
    // ============================================================
    // MIGRATION SUMMARY
    // ============================================================
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         MIGRATION COMPLETED SUCCESSFULLY! ✅ ✅ ✅          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Print summary statistics
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(CASE WHEN transaction_type = 'opening_balance' THEN 1 ELSE 0 END) as opening_balances,
        SUM(CASE WHEN transaction_type = 'invoice' THEN 1 ELSE 0 END) as invoices,
        SUM(CASE WHEN transaction_type = 'payment' THEN 1 ELSE 0 END) as payments,
        SUM(debit_amount) as total_debits,
        SUM(credit_amount) as total_credits
      FROM shop_ledger
    `).get();
    
    const shopBalances = db.prepare(`
      SELECT 
        COUNT(*) as shop_count,
        SUM(current_balance) as total_outstanding,
        AVG(current_balance) as avg_balance
      FROM shops 
      WHERE is_active = 1 AND current_balance IS NOT NULL
    `).get();
    
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Ledger Entries: ${summary.total_entries || 0}`);
    console.log(`  - Opening Balances: ${summary.opening_balances || 0}`);
    console.log(`  - Invoices: ${summary.invoices || 0}`);
    console.log(`  - Payments: ${summary.payments || 0}`);
    console.log(`\nFinancial Totals:`);
    console.log(`  Total Debits: ${(summary.total_debits || 0).toFixed(2)} PKR`);
    console.log(`  Total Credits: ${(summary.total_credits || 0).toFixed(2)} PKR`);
    console.log(`\nShop Statistics:`);
    console.log(`  Active Shops: ${shopBalances.shop_count || 0}`);
    console.log(`  Total Outstanding: ${(shopBalances.total_outstanding || 0).toFixed(2)} PKR`);
    console.log(`  Average Balance: ${(shopBalances.avg_balance || 0).toFixed(2)} PKR`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Show sample ledger entries for verification
    console.log('📋 SAMPLE LEDGER ENTRIES (First 5):');
    console.log('═══════════════════════════════════════════════════════════');
    const sampleEntries = db.prepare(`
      SELECT 
        shop_name,
        transaction_type,
        reference_number,
        debit_amount,
        credit_amount,
        balance,
        date(transaction_date) as trans_date
      FROM shop_ledger
      ORDER BY id ASC
      LIMIT 5
    `).all();
    
    console.table(sampleEntries);
    
    console.log('\n✅ Shop Ledger System is now ready for use!\n');
    console.log('Next Steps:');
    console.log('  1. Test ledger entries by creating a new invoice');
    console.log('  2. Test payment allocation by recording a payment');
    console.log('  3. View shop ledger from desktop application');
    console.log('  4. Generate account statements\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error('═══════════════════════════════════════════════════════════');
    console.error(error);
    console.error('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

// Run migration
migrateLedgerSystem();

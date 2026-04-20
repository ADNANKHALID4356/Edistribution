# 📒 SHOP LEDGER SYSTEM - IMPLEMENTATION PLAN

**Feature:** Comprehensive Shop Account Ledger with Automated Transaction Tracking  
**Company:** Ummahtechinnovations  
**Date:** January 22, 2026  
**Status:** 🟡 Ready for Implementation

---

## 📋 EXECUTIVE SUMMARY

### **Objective**
Build a **professional shop ledger system** that automatically tracks all financial transactions (invoices, payments, adjustments) for each shop, maintains accurate running balance, and provides comprehensive account statements.

### **Key Requirements** ✅
1. ✅ **Automated Tracking** - Ledger entries created automatically when invoices/payments occur
2. ✅ **Smart Balance Calculation** - Handle loan/credit scenarios efficiently
3. ✅ **Manual Adjustments** - Admin can manually add/edit ledger entries
4. ✅ **Payment Allocation** - Intelligent payment distribution (oldest invoice first - FIFO)
5. ✅ **Credit Limit Enforcement** - Alert/block when shop exceeds credit limit
6. ✅ **Account Statements** - Generate detailed statements with aging analysis

### **Example Scenario**
```
Shop: ABC Store (Credit Limit: 50,000 PKR)

Opening Balance: 5,000 PKR (shop already owes)
---------------------------------------------------------
Date       | Type       | Reference  | Debit    | Credit   | Balance
---------------------------------------------------------
Jan 1      | Opening    | -          | 5,000    | -        | 5,000
Jan 5      | Invoice    | INV-001    | 10,000   | -        | 15,000
Jan 10     | Payment    | PAY-001    | -        | 7,000    | 8,000
Jan 15     | Invoice    | INV-002    | 20,000   | -        | 28,000
Jan 18     | Adjustment | ADJ-001    | -        | 500      | 27,500
---------------------------------------------------------
Current Balance: 27,500 PKR (shop owes)
Available Credit: 22,500 PKR (50,000 - 27,500)
```

---

## 🏗️ CURRENT SYSTEM ANALYSIS

### **Existing Database Tables**

#### **1. shops table** ✅ Already exists
```sql
CREATE TABLE shops (
  id INTEGER PRIMARY KEY,
  shop_code TEXT UNIQUE,
  shop_name TEXT NOT NULL,
  credit_limit REAL DEFAULT 0,
  current_balance REAL DEFAULT 0,     -- ⚠️ Currently not properly maintained
  opening_balance REAL DEFAULT 0,     -- ⚠️ Not being used
  ...
)
```
**Issues:**
- `current_balance` is NOT updated automatically when invoices/payments are created
- No transaction history to verify how balance was calculated
- No audit trail

#### **2. invoices table** ✅ Already exists
```sql
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  invoice_number TEXT UNIQUE,
  shop_id INTEGER NOT NULL,
  net_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  balance_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'unpaid',  -- ('unpaid', 'partial', 'paid')
  invoice_date DATETIME,
  due_date DATETIME,
  ...
)
```
**Current Behavior:**
- ✅ Invoice tracks its own payment status
- ❌ Does NOT update shop's current_balance automatically
- ❌ No ledger entry created

#### **3. payments table** ✅ Already exists
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  receipt_number TEXT UNIQUE,
  shop_id INTEGER NOT NULL,
  invoice_id INTEGER,           -- ⚠️ Can be NULL (advance payment)
  amount REAL NOT NULL,
  payment_method TEXT,
  payment_date DATETIME,
  ...
)
```
**Current Behavior:**
- ✅ Payment recorded against specific invoice
- ❌ Does NOT update shop's current_balance
- ❌ No ledger entry created
- ❌ No payment allocation logic if invoice_id is NULL

### **Missing Components** ❌

1. **No shop_ledger table** - No transaction history
2. **No automatic triggers** - Balance not updated on invoice/payment
3. **No payment allocation logic** - How to handle 5,000 PKR payment when multiple invoices exist?
4. **No aging analysis** - Which invoices are overdue?
5. **No credit limit enforcement** - Shop can order unlimited even if exceeding limit

---

## 🎯 SOLUTION DESIGN

### **Approach: Hybrid Ledger System**

We'll implement a **hybrid approach**:
1. **Physical ledger table** (`shop_ledger`) - Stores all transactions with running balance
2. **Automatic entry creation** - Triggers in application layer (not DB triggers)
3. **Manual adjustment capability** - Admin can add adjustment entries
4. **Calculated views** - For real-time summaries and aging

### **Why Hybrid?**
- ✅ **Audit trail** - Complete transaction history
- ✅ **Flexibility** - Can handle manual adjustments, opening balances
- ✅ **Performance** - Fast queries with indexed ledger table
- ✅ **Accuracy** - Running balance calculated and stored
- ✅ **Extensibility** - Easy to add new transaction types (returns, credit notes)

---

## 📊 DATABASE SCHEMA DESIGN

### **1. New Table: `shop_ledger`**

```sql
CREATE TABLE shop_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Shop reference
  shop_id INTEGER NOT NULL,
  shop_name TEXT,                     -- Denormalized for reporting
  
  -- Transaction details
  transaction_date DATETIME NOT NULL,
  transaction_type TEXT NOT NULL,     -- 'invoice', 'payment', 'adjustment', 'opening_balance'
  
  -- Reference to source transaction
  reference_type TEXT,                -- 'invoice', 'payment', 'manual'
  reference_id INTEGER,               -- FK to invoices/payments table
  reference_number TEXT,              -- Invoice/Receipt number for display
  
  -- Financial amounts
  debit_amount REAL DEFAULT 0,        -- Shop owes (invoices, debit notes)
  credit_amount REAL DEFAULT 0,       -- Shop paid (payments, credit notes)
  balance REAL NOT NULL,              -- Running balance after this transaction
  
  -- Additional info
  description TEXT,                   -- Transaction description
  notes TEXT,                         -- Additional notes
  
  -- Metadata
  created_by INTEGER,                 -- User ID who created entry
  created_by_name TEXT,               -- User name (denormalized)
  is_manual INTEGER DEFAULT 0,        -- 1 if manually created by admin
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_shop_ledger_shop_id ON shop_ledger(shop_id);
CREATE INDEX idx_shop_ledger_transaction_date ON shop_ledger(transaction_date);
CREATE INDEX idx_shop_ledger_reference ON shop_ledger(reference_type, reference_id);
CREATE INDEX idx_shop_ledger_type ON shop_ledger(transaction_type);
```

### **2. New Table: `payment_allocations`**
For tracking how payments are allocated across invoices

```sql
CREATE TABLE payment_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL,        -- FK to payments table
  invoice_id INTEGER NOT NULL,        -- FK to invoices table
  allocated_amount REAL NOT NULL,     -- Amount allocated to this invoice
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice ON payment_allocations(invoice_id);
```

### **3. Updated Table: `shops`**
Add last_transaction_date for tracking

```sql
ALTER TABLE shops ADD COLUMN last_transaction_date DATETIME;
```

### **4. Database View: `v_shop_balance_summary`**
For quick balance queries

```sql
CREATE VIEW v_shop_balance_summary AS
SELECT 
  s.id as shop_id,
  s.shop_code,
  s.shop_name,
  s.credit_limit,
  s.opening_balance,
  
  -- Calculate current balance from latest ledger entry
  (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as current_balance,
  
  -- Calculate available credit
  s.credit_limit - COALESCE((SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1), 0) as available_credit,
  
  -- Total unpaid invoices
  COALESCE((SELECT SUM(balance_amount) FROM invoices WHERE shop_id = s.id AND status IN ('unpaid', 'partial')), 0) as total_outstanding,
  
  -- Count of unpaid invoices
  COALESCE((SELECT COUNT(*) FROM invoices WHERE shop_id = s.id AND status IN ('unpaid', 'partial')), 0) as outstanding_invoice_count,
  
  -- Last transaction date
  s.last_transaction_date
FROM shops s
WHERE s.is_active = 1;
```

### **5. Database View: `v_invoice_aging`**
For aging analysis

```sql
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
  
  -- Calculate days overdue
  CASE 
    WHEN i.due_date < datetime('now') THEN 
      CAST((julianday('now') - julianday(i.due_date)) AS INTEGER)
    ELSE 0
  END as days_overdue,
  
  -- Aging bucket
  CASE 
    WHEN i.due_date >= datetime('now') THEN '0-Current'
    WHEN CAST((julianday('now') - julianday(i.due_date)) AS INTEGER) BETWEEN 1 AND 30 THEN '1-30 Days'
    WHEN CAST((julianday('now') - julianday(i.due_date)) AS INTEGER) BETWEEN 31 AND 60 THEN '31-60 Days'
    WHEN CAST((julianday('now') - julianday(i.due_date)) AS INTEGER) BETWEEN 61 AND 90 THEN '61-90 Days'
    ELSE '90+ Days'
  END as aging_bucket
  
FROM invoices i
JOIN shops s ON i.shop_id = s.id
WHERE i.status IN ('unpaid', 'partial');
```

---

## 🔧 IMPLEMENTATION STEPS

### **Phase 1: Database Setup** 🟡

#### **Step 1.1: Create migration script**
**File:** `backend/migrate-create-ledger-system.js`

```javascript
const db = require('./src/config/database-sqlite');

async function migrateLedgerSystem() {
  console.log('🔄 Starting Shop Ledger System Migration...\n');
  
  try {
    // 1. Create shop_ledger table
    console.log('📊 Creating shop_ledger table...');
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
    console.log('✅ shop_ledger table created\n');
    
    // 2. Create indexes
    console.log('🔍 Creating indexes...');
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_shop_id ON shop_ledger(shop_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_transaction_date ON shop_ledger(transaction_date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_reference ON shop_ledger(reference_type, reference_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_shop_ledger_type ON shop_ledger(transaction_type)`);
    console.log('✅ Indexes created\n');
    
    // 3. Create payment_allocations table
    console.log('💰 Creating payment_allocations table...');
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
    console.log('✅ payment_allocations table created\n');
    
    // 4. Add last_transaction_date to shops
    console.log('🏪 Updating shops table...');
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
    
    // 5. Create views
    console.log('📊 Creating database views...');
    
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
    console.log('✅ Database views created\n');
    
    // 6. Populate opening balances from existing data
    console.log('📝 Creating opening balance entries...');
    const shops = db.prepare('SELECT * FROM shops WHERE is_active = 1').all();
    
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
          'Opening balance',
          'System Migration',
          1
        );
      }
    }
    console.log(`✅ Created opening balance entries for ${shops.length} shops\n`);
    
    // 7. Migrate existing invoices to ledger
    console.log('📄 Migrating existing invoices to ledger...');
    const invoices = db.prepare(`
      SELECT i.*, s.shop_name 
      FROM invoices i 
      JOIN shops s ON i.shop_id = s.id 
      ORDER BY i.invoice_date ASC, i.id ASC
    `).all();
    
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
    }
    console.log(`✅ Migrated ${invoices.length} invoices to ledger\n`);
    
    // 8. Migrate existing payments to ledger
    console.log('💸 Migrating existing payments to ledger...');
    const payments = db.prepare(`
      SELECT p.*, s.shop_name 
      FROM payments p 
      JOIN shops s ON p.shop_id = s.id 
      ORDER BY p.payment_date ASC, p.id ASC
    `).all();
    
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
    }
    console.log(`✅ Migrated ${payments.length} payments to ledger\n`);
    
    // 9. Update shops current_balance from ledger
    console.log('🔄 Updating shops current_balance...');
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
    console.log('✅ Updated shops current_balance\n');
    
    console.log('✅ ✅ ✅ MIGRATION COMPLETED SUCCESSFULLY! ✅ ✅ ✅\n');
    
    // Print summary
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
    
    console.log('📊 Migration Summary:');
    console.log('═══════════════════════════════════════');
    console.log(`Total Ledger Entries: ${summary.total_entries}`);
    console.log(`  - Opening Balances: ${summary.opening_balances}`);
    console.log(`  - Invoices: ${summary.invoices}`);
    console.log(`  - Payments: ${summary.payments}`);
    console.log(`Total Debits: ${summary.total_debits.toFixed(2)} PKR`);
    console.log(`Total Credits: ${summary.total_credits.toFixed(2)} PKR`);
    console.log('═══════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateLedgerSystem();
```

---

### **Phase 2: Backend Model Layer** 🟡

#### **Step 2.1: Create ShopLedger Model**
**File:** `backend/src/models/ShopLedger.js`

```javascript
/**
 * Shop Ledger Model
 * Company: Ummahtechinnovations.com
 * 
 * Handles all shop ledger operations including:
 * - Automatic ledger entry creation
 * - Balance calculations
 * - Account statements
 * - Payment allocations
 */

const db = require('../config/database');

class ShopLedger {
  /**
   * Create a ledger entry (called automatically from Invoice/Payment models)
   * @param {Object} entryData - Ledger entry data
   * @returns {Promise<Object>} Created ledger entry
   */
  async createEntry(entryData) {
    console.log('📒 [SHOP LEDGER] Creating ledger entry...');
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get previous balance for this shop
      const [prevEntries] = await connection.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `, [entryData.shop_id]);
      
      const previousBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
      
      // Calculate new balance
      // Debit increases balance (shop owes more)
      // Credit decreases balance (shop paid)
      const debitAmount = parseFloat(entryData.debit_amount) || 0;
      const creditAmount = parseFloat(entryData.credit_amount) || 0;
      const newBalance = previousBalance + debitAmount - creditAmount;
      
      console.log(`💰 Previous Balance: ${previousBalance}, Debit: ${debitAmount}, Credit: ${creditAmount}, New Balance: ${newBalance}`);
      
      // Insert ledger entry
      const [result] = await connection.query(`
        INSERT INTO shop_ledger (
          shop_id, shop_name, transaction_date, transaction_type,
          reference_type, reference_id, reference_number,
          debit_amount, credit_amount, balance,
          description, notes, created_by, created_by_name, is_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entryData.shop_id,
        entryData.shop_name || null,
        entryData.transaction_date || new Date(),
        entryData.transaction_type,
        entryData.reference_type || null,
        entryData.reference_id || null,
        entryData.reference_number || null,
        debitAmount,
        creditAmount,
        newBalance,
        entryData.description || '',
        entryData.notes || null,
        entryData.created_by || null,
        entryData.created_by_name || null,
        entryData.is_manual || 0
      ]);
      
      // Update shop's current_balance and last_transaction_date
      await connection.query(`
        UPDATE shops 
        SET current_balance = ?, 
            last_transaction_date = ?
        WHERE id = ?
      `, [newBalance, entryData.transaction_date || new Date(), entryData.shop_id]);
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ [SHOP LEDGER] Entry created for shop ${entryData.shop_id}, new balance: ${newBalance}`);
      
      return {
        id: result.insertId,
        previous_balance: previousBalance,
        new_balance: newBalance,
        ...entryData
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error creating entry:', error);
      throw error;
    }
  }
  
  /**
   * Get shop ledger with pagination and filters
   * @param {number} shopId - Shop ID
   * @param {Object} filters - Filters (page, limit, start_date, end_date, transaction_type)
   * @returns {Promise<Object>} Ledger entries with pagination
   */
  async getShopLedger(shopId, filters = {}) {
    console.log(`📒 [SHOP LEDGER] Getting ledger for shop ${shopId}...`);
    
    const {
      page = 1,
      limit = 50,
      start_date = null,
      end_date = null,
      transaction_type = null
    } = filters;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = ['shop_id = ?'];
    let queryParams = [shopId];
    
    if (start_date) {
      whereConditions.push('transaction_date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('transaction_date <= ?');
      queryParams.push(end_date);
    }
    
    if (transaction_type) {
      whereConditions.push('transaction_type = ?');
      queryParams.push(transaction_type);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get ledger entries
    const [entries] = await db.query(`
      SELECT * FROM shop_ledger
      WHERE ${whereClause}
      ORDER BY transaction_date DESC, id DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM shop_ledger
      WHERE ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    
    // Get shop details
    const [shops] = await db.query(`
      SELECT s.*, 
        (SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1) as current_balance
      FROM shops s
      WHERE s.id = ?
    `, [shopId]);
    
    return {
      shop: shops[0] || null,
      entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get account statement (formatted for printing/PDF)
   * @param {number} shopId - Shop ID
   * @param {Object} options - start_date, end_date
   * @returns {Promise<Object>} Formatted account statement
   */
  async getAccountStatement(shopId, options = {}) {
    console.log(`📄 [SHOP LEDGER] Generating account statement for shop ${shopId}...`);
    
    const { start_date, end_date } = options;
    
    // Get shop details
    const [shops] = await db.query(`
      SELECT * FROM shops WHERE id = ?
    `, [shopId]);
    
    if (shops.length === 0) {
      throw new Error('Shop not found');
    }
    
    const shop = shops[0];
    
    // Get opening balance (balance before start_date or first entry)
    let openingBalance = 0;
    if (start_date) {
      const [prevEntries] = await db.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? AND transaction_date < ?
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `, [shopId, start_date]);
      
      openingBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
    }
    
    // Build query for transactions
    let whereConditions = ['shop_id = ?'];
    let queryParams = [shopId];
    
    if (start_date) {
      whereConditions.push('transaction_date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('transaction_date <= ?');
      queryParams.push(end_date);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get all transactions
    const [transactions] = await db.query(`
      SELECT * FROM shop_ledger
      WHERE ${whereClause}
      ORDER BY transaction_date ASC, id ASC
    `, queryParams);
    
    // Calculate totals
    const totalDebits = transactions.reduce((sum, t) => sum + parseFloat(t.debit_amount), 0);
    const totalCredits = transactions.reduce((sum, t) => sum + parseFloat(t.credit_amount), 0);
    const closingBalance = transactions.length > 0 ? parseFloat(transactions[transactions.length - 1].balance) : openingBalance;
    
    // Get outstanding invoices
    const [outstandingInvoices] = await db.query(`
      SELECT * FROM invoices
      WHERE shop_id = ? AND status IN ('unpaid', 'partial')
      ORDER BY invoice_date ASC
    `, [shopId]);
    
    return {
      shop,
      statement_period: {
        start_date,
        end_date,
        generated_at: new Date()
      },
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_debits: totalDebits,
      total_credits: totalCredits,
      transactions,
      outstanding_invoices: outstandingInvoices
    };
  }
  
  /**
   * Allocate payment to invoices (FIFO - First In First Out)
   * @param {number} paymentId - Payment ID
   * @param {number} shopId - Shop ID
   * @param {number} paymentAmount - Payment amount
   * @returns {Promise<Array>} Array of allocations
   */
  async allocatePayment(paymentId, shopId, paymentAmount) {
    console.log(`💰 [SHOP LEDGER] Allocating payment ${paymentId} (${paymentAmount} PKR) for shop ${shopId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Get unpaid/partial invoices for this shop (oldest first - FIFO)
      const [invoices] = await connection.query(`
        SELECT * FROM invoices
        WHERE shop_id = ? AND status IN ('unpaid', 'partial')
        ORDER BY invoice_date ASC, id ASC
      `, [shopId]);
      
      if (invoices.length === 0) {
        console.log('⚠️  No outstanding invoices found. Payment will be recorded as advance.');
        await connection.commit();
        connection.release();
        return [];
      }
      
      let remainingAmount = parseFloat(paymentAmount);
      const allocations = [];
      
      for (const invoice of invoices) {
        if (remainingAmount <= 0) break;
        
        const invoiceBalance = parseFloat(invoice.balance_amount);
        const allocationAmount = Math.min(remainingAmount, invoiceBalance);
        
        // Create allocation record
        await connection.query(`
          INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
          VALUES (?, ?, ?)
        `, [paymentId, invoice.id, allocationAmount]);
        
        // Update invoice paid_amount and balance_amount
        const newPaidAmount = parseFloat(invoice.paid_amount) + allocationAmount;
        const newBalance = parseFloat(invoice.net_amount) - newPaidAmount;
        
        let newStatus = 'unpaid';
        if (newBalance <= 0.01) { // Allow for rounding errors
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }
        
        await connection.query(`
          UPDATE invoices 
          SET paid_amount = ?, balance_amount = ?, status = ?
          WHERE id = ?
        `, [newPaidAmount, Math.max(0, newBalance), newStatus, invoice.id]);
        
        allocations.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invoice_date: invoice.invoice_date,
          invoice_amount: invoice.net_amount,
          previous_balance: invoiceBalance,
          allocated_amount: allocationAmount,
          new_balance: newBalance,
          status: newStatus
        });
        
        remainingAmount -= allocationAmount;
        
        console.log(`  ✅ Allocated ${allocationAmount} to Invoice ${invoice.invoice_number}`);
      }
      
      if (remainingAmount > 0.01) {
        console.log(`⚠️  Remaining ${remainingAmount} PKR recorded as advance payment`);
      }
      
      await connection.commit();
      connection.release();
      
      console.log(`✅ [SHOP LEDGER] Payment allocated to ${allocations.length} invoices`);
      
      return allocations;
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [SHOP LEDGER] Error allocating payment:', error);
      throw error;
    }
  }
  
  /**
   * Create manual adjustment entry (admin only)
   * @param {Object} adjustmentData - Adjustment details
   * @returns {Promise<Object>} Created ledger entry
   */
  async createAdjustment(adjustmentData) {
    console.log('✏️ [SHOP LEDGER] Creating manual adjustment...');
    
    // Validate required fields
    if (!adjustmentData.shop_id || !adjustmentData.amount || !adjustmentData.type) {
      throw new Error('shop_id, amount, and type (debit/credit) are required');
    }
    
    const entryData = {
      shop_id: adjustmentData.shop_id,
      shop_name: adjustmentData.shop_name,
      transaction_date: adjustmentData.transaction_date || new Date(),
      transaction_type: 'adjustment',
      reference_type: 'manual',
      reference_number: `ADJ-${Date.now()}`,
      debit_amount: adjustmentData.type === 'debit' ? adjustmentData.amount : 0,
      credit_amount: adjustmentData.type === 'credit' ? adjustmentData.amount : 0,
      description: adjustmentData.description || 'Manual adjustment',
      notes: adjustmentData.notes,
      created_by: adjustmentData.created_by,
      created_by_name: adjustmentData.created_by_name,
      is_manual: 1
    };
    
    return await this.createEntry(entryData);
  }
  
  /**
   * Get aging analysis for a shop
   * @param {number} shopId - Shop ID
   * @returns {Promise<Object>} Aging buckets with amounts
   */
  async getAgingAnalysis(shopId) {
    console.log(`📊 [SHOP LEDGER] Getting aging analysis for shop ${shopId}...`);
    
    const [aging] = await db.query(`
      SELECT 
        aging_bucket,
        COUNT(*) as invoice_count,
        SUM(balance_amount) as total_amount
      FROM v_invoice_aging
      WHERE shop_id = ?
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN '0-Current' THEN 1
          WHEN '1-30 Days' THEN 2
          WHEN '31-60 Days' THEN 3
          WHEN '61-90 Days' THEN 4
          WHEN '90+ Days' THEN 5
        END
    `, [shopId]);
    
    return aging;
  }
  
  /**
   * Check if shop can create new order (credit limit check)
   * @param {number} shopId - Shop ID
   * @param {number} orderAmount - New order amount
   * @returns {Promise<Object>} Check result with details
   */
  async checkCreditLimit(shopId, orderAmount) {
    console.log(`🔍 [SHOP LEDGER] Checking credit limit for shop ${shopId}...`);
    
    const [shops] = await db.query(`
      SELECT * FROM v_shop_balance_summary WHERE shop_id = ?
    `, [shopId]);
    
    if (shops.length === 0) {
      throw new Error('Shop not found');
    }
    
    const shop = shops[0];
    const currentBalance = parseFloat(shop.current_balance) || 0;
    const creditLimit = parseFloat(shop.credit_limit) || 0;
    const availableCredit = creditLimit - currentBalance;
    const newBalance = currentBalance + parseFloat(orderAmount);
    const willExceedLimit = newBalance > creditLimit;
    
    return {
      shop_id: shopId,
      shop_name: shop.shop_name,
      credit_limit: creditLimit,
      current_balance: currentBalance,
      available_credit: availableCredit,
      order_amount: orderAmount,
      new_balance_if_ordered: newBalance,
      exceeds_limit: willExceedLimit,
      excess_amount: willExceedLimit ? newBalance - creditLimit : 0,
      can_proceed: !willExceedLimit,
      message: willExceedLimit 
        ? `Order will exceed credit limit by ${(newBalance - creditLimit).toFixed(2)} PKR` 
        : 'Order within credit limit'
    };
  }
}

module.exports = new ShopLedger();
```

---

**(CONTINUED IN NEXT PART DUE TO LENGTH...)**

---

## 📝 IMPLEMENTATION CHECKLIST

### ✅ Completed
- [x] Analyze existing invoice/payment system
- [x] Design comprehensive ledger schema
- [x] Create migration script
- [x] Design ShopLedger model with all methods

### 🟡 To Be Implemented
- [ ] **Phase 3:** Update Invoice model to create ledger entries
- [ ] **Phase 4:** Update Payment model to create ledger entries and allocate
- [ ] **Phase 5:** Create LedgerController for API endpoints
- [ ] **Phase 6:** Create desktop UI components (ledger table, statements)
- [ ] **Phase 7:** Add mobile balance checking
- [ ] **Phase 8:** Add credit limit enforcement
- [ ] **Phase 9:** Testing with sample data
- [ ] **Phase 10:** PDF/Excel report generation

---

## 🎯 KEY DESIGN DECISIONS

### ✅ Decision 1: Physical Ledger Table
**Chosen:** Create `shop_ledger` table with running balance  
**Why:** Provides audit trail, supports manual adjustments, faster queries  
**Alternative rejected:** Virtual view (can't handle manual adjustments)

### ✅ Decision 2: Payment Allocation Strategy
**Chosen:** FIFO (First In, First Out) - Pay oldest invoices first  
**Why:** Industry standard, fair, prevents old debts from lingering  
**Alternative rejected:** Manual allocation (complex UI, error-prone)

### ✅ Decision 3: Balance Calculation
**Chosen:** Store running balance in each ledger entry  
**Why:** Fast queries, no need to sum all transactions  
**Alternative rejected:** Calculate on-the-fly (slow for large datasets)

### ✅ Decision 4: Credit Limit Enforcement
**Chosen:** Warning + Allow with manager approval  
**Why:** Flexible, business can decide policy  
**Alternative rejected:** Hard block (too rigid for business needs)

---

## ⚡ NEXT STEPS

Ready to proceed with implementation? Here's what we'll do:

1. **Run migration script** to create tables and migrate existing data
2. **Update Invoice model** to automatically create ledger entries
3. **Update Payment model** to handle payment allocation
4. **Create API endpoints** for ledger operations
5. **Build desktop UI** for viewing ledgers and statements
6. **Add mobile features** for balance checking
7. **Test thoroughly** with sample transactions

**Should I proceed with Phase 1 (Database Migration)?** 🚀

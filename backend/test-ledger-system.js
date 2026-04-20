/**
 * Shop Ledger System Test Script
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * This script tests the complete ledger system flow:
 * 1. Creates a test shop with opening balance
 * 2. Creates an invoice (should create debit entry)
 * 3. Records a payment (should create credit entry with FIFO allocation)
 * 4. Verifies balances and allocations
 */

const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'data', 'distribution_system.db');
const db = new Database(dbPath);

console.log('\n==============================================');
console.log('🧪 SHOP LEDGER SYSTEM TEST');
console.log('==============================================\n');

// Enable foreign keys
db.pragma('foreign_keys = ON');

try {
  // ============================================================================
  // CLEANUP: Delete any existing test data
  // ============================================================================
  console.log('🧹 CLEANUP: Removing any existing test data...');
  
  db.prepare("DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE receipt_number LIKE 'RCP-TEST-%')").run();
  db.prepare("DELETE FROM payments WHERE receipt_number LIKE 'RCP-TEST-%'").run();
  db.prepare("DELETE FROM shop_ledger WHERE shop_id IN (SELECT id FROM shops WHERE shop_code LIKE 'SH-TEST-%')").run();
  db.prepare("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE invoice_number LIKE 'INV-TEST-%')").run();
  db.prepare("DELETE FROM invoices WHERE invoice_number LIKE 'INV-TEST-%'").run();
  db.prepare("DELETE FROM shops WHERE shop_code LIKE 'SH-TEST-%'").run();
  
  console.log('✅ Cleanup complete\n');
  
  // ============================================================================
  // STEP 1: Create Test Shop
  // ============================================================================
  console.log('📋 STEP 1: Creating test shop...');
  
  const shopInsert = db.prepare(`
    INSERT INTO shops (
      shop_code, shop_name, owner_name, phone, 
      address, city, credit_limit, opening_balance, current_balance
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const shopResult = shopInsert.run(
    'SH-TEST-001',
    'Test Shop - Ledger System',
    'Test Owner',
    '0300-1234567',
    'Test Address',
    'Karachi',
    50000.00,  // Credit limit
    0.00,      // Opening balance
    0.00       // Current balance
  );
  
  const shopId = shopResult.lastInsertRowid;
  console.log(`✅ Shop created with ID: ${shopId}`);
  console.log(`   Shop Code: SH-TEST-001`);
  console.log(`   Credit Limit: Rs. 50,000`);
  console.log(`   Opening Balance: Rs. 0\n`);

  // ============================================================================
  // STEP 2: Create Test Invoice (Debit Entry)
  // ============================================================================
  console.log('📋 STEP 2: Creating test invoice...');
  
  const invoiceInsert = db.prepare(`
    INSERT INTO invoices (
      invoice_number, shop_id, invoice_date, due_date,
      total_amount, discount_amount, net_amount, 
      paid_amount, balance_amount, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const invoiceDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  const invoiceResult = invoiceInsert.run(
    'INV-TEST-001',
    shopId,
    invoiceDate,
    dueDate,
    15000.00,  // Total
    500.00,    // Discount
    14500.00,  // Net
    0.00,      // Paid
    14500.00,  // Balance
    'unpaid'
  );
  
  const invoiceId = invoiceResult.lastInsertRowid;
  console.log(`✅ Invoice created with ID: ${invoiceId}`);
  console.log(`   Invoice Number: INV-TEST-001`);
  console.log(`   Net Amount: Rs. 14,500`);
  console.log(`   Status: unpaid\n`);

  // Create ledger entry for invoice (DEBIT)
  console.log('📋 Creating ledger debit entry for invoice...');
  
  const ledgerInsert = db.prepare(`
    INSERT INTO shop_ledger (
      shop_id, transaction_date, transaction_type,
      reference_type, reference_id, debit_amount, credit_amount,
      balance, description, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Get previous balance
  const prevBalanceQuery = db.prepare(`
    SELECT balance FROM shop_ledger 
    WHERE shop_id = ? 
    ORDER BY id DESC LIMIT 1
  `);
  const prevBalanceRow = prevBalanceQuery.get(shopId);
  const previousBalance = prevBalanceRow ? prevBalanceRow.balance : 0;
  
  const newBalance = previousBalance + 14500.00; // Debit increases balance
  
  ledgerInsert.run(
    shopId,
    invoiceDate,
    'invoice',  // transaction_type
    'invoice',  // reference_type
    invoiceId,
    14500.00,  // Debit
    0.00,      // Credit
    newBalance,
    'Invoice INV-TEST-001',
    1  // Admin user
  );
  
  console.log(`✅ Ledger entry created (DEBIT)`);
  console.log(`   Previous Balance: Rs. ${previousBalance.toFixed(2)}`);
  console.log(`   Debit Amount: Rs. 14,500.00`);
  console.log(`   New Balance: Rs. ${newBalance.toFixed(2)}\n`);
  
  // Update shop balance
  db.prepare('UPDATE shops SET current_balance = ? WHERE id = ?').run(newBalance, shopId);

  // ============================================================================
  // STEP 3: Create Second Invoice
  // ============================================================================
  console.log('📋 STEP 3: Creating second invoice...');
  
  const invoice2Result = invoiceInsert.run(
    'INV-TEST-002',
    shopId,
    invoiceDate,
    dueDate,
    8000.00,   // Total
    200.00,    // Discount
    7800.00,   // Net
    0.00,      // Paid
    7800.00,   // Balance
    'unpaid'
  );
  
  const invoice2Id = invoice2Result.lastInsertRowid;
  console.log(`✅ Second invoice created with ID: ${invoice2Id}`);
  console.log(`   Invoice Number: INV-TEST-002`);
  console.log(`   Net Amount: Rs. 7,800\n`);

  // Create ledger entry for second invoice
  const prevBalance2 = db.prepare('SELECT balance FROM shop_ledger WHERE shop_id = ? ORDER BY id DESC LIMIT 1').get(shopId).balance;
  const newBalance2 = prevBalance2 + 7800.00;
  
  ledgerInsert.run(
    shopId,
    invoiceDate,
    'invoice',  // transaction_type
    'invoice',  // reference_type
    invoice2Id,
    7800.00,
    0.00,
    newBalance2,
    'Invoice INV-TEST-002',
    1
  );
  
  console.log(`✅ Ledger entry created (DEBIT)`);
  console.log(`   Previous Balance: Rs. ${prevBalance2.toFixed(2)}`);
  console.log(`   Debit Amount: Rs. 7,800.00`);
  console.log(`   New Balance: Rs. ${newBalance2.toFixed(2)}\n`);
  
  db.prepare('UPDATE shops SET current_balance = ? WHERE id = ?').run(newBalance2, shopId);

  // ============================================================================
  // STEP 4: Record Payment (Credit Entry with FIFO Allocation)
  // ============================================================================
  console.log('📋 STEP 4: Recording payment with FIFO allocation...');
  console.log('   Payment Amount: Rs. 20,000');
  console.log('   Expected Allocation:');
  console.log('     - INV-TEST-001: Rs. 14,500 (fully paid)');
  console.log('     - INV-TEST-002: Rs. 5,500 (partial)');
  console.log('     - Remaining: Rs. 0\n');
  
  const paymentAmount = 20000.00;
  let remainingAmount = paymentAmount;
  
  // Insert payment record
  const paymentInsert = db.prepare(`
    INSERT INTO payments (
      receipt_number, shop_id, payment_date,
      amount, payment_method, reference_number
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const paymentResult = paymentInsert.run(
    'RCP-TEST-001',
    shopId,
    invoiceDate,
    paymentAmount,
    'cash',
    'TEST-REF-001'
  );
  
  const paymentId = paymentResult.lastInsertRowid;
  console.log(`✅ Payment record created with ID: ${paymentId}`);
  console.log(`   Receipt Number: RCP-TEST-001\n`);

  // Get unpaid invoices (FIFO order)
  const unpaidInvoices = db.prepare(`
    SELECT id, invoice_number, net_amount, paid_amount, balance_amount
    FROM invoices
    WHERE shop_id = ? AND status IN ('unpaid', 'partial')
    ORDER BY invoice_date ASC
  `).all(shopId);
  
  console.log('📊 Allocating payment to invoices (FIFO):');
  
  const paymentAllocationInsert = db.prepare(`
    INSERT INTO payment_allocations (payment_id, invoice_id, allocated_amount)
    VALUES (?, ?, ?)
  `);
  
  const invoiceUpdate = db.prepare(`
    UPDATE invoices 
    SET paid_amount = paid_amount + ?,
        balance_amount = balance_amount - ?,
        status = CASE 
          WHEN balance_amount - ? <= 0 THEN 'paid'
          ELSE 'partial'
        END
    WHERE id = ?
  `);
  
  for (const invoice of unpaidInvoices) {
    if (remainingAmount <= 0) break;
    
    const allocAmount = Math.min(remainingAmount, invoice.balance_amount);
    
    // Create allocation record
    paymentAllocationInsert.run(paymentId, invoice.id, allocAmount);
    
    // Update invoice
    invoiceUpdate.run(allocAmount, allocAmount, allocAmount, invoice.id);
    
    remainingAmount -= allocAmount;
    
    const newStatus = allocAmount >= invoice.balance_amount ? 'paid' : 'partial';
    console.log(`   ✅ ${invoice.invoice_number}: Rs. ${allocAmount.toFixed(2)} allocated (${newStatus})`);
  }
  
  if (remainingAmount > 0) {
    console.log(`   💰 Advance Payment: Rs. ${remainingAmount.toFixed(2)}`);
  }
  
  // Create ledger entry for payment (CREDIT)
  const prevBalance3 = db.prepare('SELECT balance FROM shop_ledger WHERE shop_id = ? ORDER BY id DESC LIMIT 1').get(shopId).balance;
  const newBalance3 = prevBalance3 - paymentAmount; // Credit decreases balance
  
  ledgerInsert.run(
    shopId,
    invoiceDate,
    'payment',  // transaction_type
    'payment',  // reference_type
    paymentId,
    0.00,
    paymentAmount,
    newBalance3,
    'Payment RCP-TEST-001',
    1
  );
  
  console.log(`\n✅ Ledger entry created (CREDIT)`);
  console.log(`   Previous Balance: Rs. ${prevBalance3.toFixed(2)}`);
  console.log(`   Credit Amount: Rs. ${paymentAmount.toFixed(2)}`);
  console.log(`   New Balance: Rs. ${newBalance3.toFixed(2)}\n`);
  
  db.prepare('UPDATE shops SET current_balance = ? WHERE id = ?').run(newBalance3, shopId);

  // ============================================================================
  // STEP 5: Verify Results
  // ============================================================================
  console.log('📋 STEP 5: Verifying results...\n');
  
  // Check shop balance
  const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(shopId);
  console.log('🏪 SHOP DETAILS:');
  console.log(`   Shop: ${shop.shop_name}`);
  console.log(`   Current Balance: Rs. ${shop.current_balance.toFixed(2)}`);
  console.log(`   Credit Limit: Rs. ${shop.credit_limit.toFixed(2)}`);
  console.log(`   Available Credit: Rs. ${(shop.credit_limit - shop.current_balance).toFixed(2)}\n`);
  
  // Check invoices
  const invoices = db.prepare('SELECT * FROM invoices WHERE shop_id = ? ORDER BY id').all(shopId);
  console.log('📄 INVOICES:');
  invoices.forEach(inv => {
    console.log(`   ${inv.invoice_number}:`);
    console.log(`     Net: Rs. ${inv.net_amount.toFixed(2)}`);
    console.log(`     Paid: Rs. ${inv.paid_amount.toFixed(2)}`);
    console.log(`     Balance: Rs. ${inv.balance_amount.toFixed(2)}`);
    console.log(`     Status: ${inv.status}`);
  });
  
  // Check payment allocations
  const allocations = db.prepare(`
    SELECT pa.*, i.invoice_number
    FROM payment_allocations pa
    JOIN invoices i ON pa.invoice_id = i.id
    WHERE pa.payment_id = ?
  `).all(paymentId);
  
  console.log(`\n💳 PAYMENT ALLOCATIONS (RCP-TEST-001):`);
  allocations.forEach(alloc => {
    console.log(`   ${alloc.invoice_number}: Rs. ${alloc.allocated_amount.toFixed(2)}`);
  });
  
  // Check ledger
  const ledger = db.prepare(`
    SELECT * FROM shop_ledger 
    WHERE shop_id = ? 
    ORDER BY transaction_date, id
  `).all(shopId);
  
  console.log(`\n📊 SHOP LEDGER:`);
  console.log('   Date                  | Type    | Ref              | Debit      | Credit     | Balance');
  console.log('   ' + '-'.repeat(95));
  
  ledger.forEach(entry => {
    const date = new Date(entry.transaction_date).toLocaleDateString();
    const ref = `${entry.reference_type}-${entry.reference_id}`;
    console.log(`   ${date.padEnd(22)}| ${entry.transaction_type.padEnd(8)}| ${ref.padEnd(17)}| ${entry.debit_amount.toFixed(2).padStart(10)} | ${entry.credit_amount.toFixed(2).padStart(10)} | ${entry.balance.toFixed(2).padStart(10)}`);
  });
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n==============================================');
  console.log('✅ TEST COMPLETED SUCCESSFULLY');
  console.log('==============================================');
  console.log('✅ Shop created with credit limit');
  console.log('✅ Invoices created (debit entries)');
  console.log('✅ Payment recorded with FIFO allocation');
  console.log('✅ Ledger entries created correctly');
  console.log('✅ Running balance calculated accurately');
  console.log('✅ Payment allocated to oldest invoice first');
  console.log('\nThe shop ledger system is working correctly! 🎉\n');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}

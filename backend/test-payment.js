/**
 * Test Payment Recording
 */

require('dotenv').config();
const db = require('./src/config/database');

async function testPayment() {
  try {
    console.log('✅ Database connected');

    // First, check if shop_ledger table exists
    if (process.env.USE_SQLITE === 'true') {
      const [tables] = await db.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='shop_ledger'"
      );
      console.log('\n📋 shop_ledger table check:', tables.length > 0 ? '✅ EXISTS' : '❌ MISSING');
      
      if (tables.length === 0) {
        console.log('❌ Cannot test payment - shop_ledger table is missing');
        return;
      }

      // Check table structure
      const columns = await db.query("PRAGMA table_info(shop_ledger)");
      console.log('\n📊 Table columns:', columns.length);
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }

    // Check if there are any shops
    const shops = await db.query('SELECT * FROM shops LIMIT 1');
    if (shops.length === 0) {
      console.log('\n⚠️  No shops found - creating a test shop...');
      await db.query(`
        INSERT INTO shops (shop_code, shop_name, owner_name, current_balance, opening_balance)
        VALUES ('TEST001', 'Test Shop', 'Test Owner', 0, 0)
      `);
      console.log('✅ Test shop created');
    }

    const testShop = await db.query('SELECT * FROM shops LIMIT 1');
    console.log('\n🏪 Test shop:', testShop[0]);

    // Now try to record a payment
    console.log('\n💳 Recording test payment...');
    
    const paymentData = {
      shop_id: testShop[0].id,
      shop_name: testShop[0].shop_name,
      transaction_date: new Date(),
      transaction_type: 'payment',
      reference_type: 'payment',
      reference_number: 'TEST-PAY-001',
      debit_amount: 0,
      credit_amount: 5600,
      balance: -5600, // Shop's receivable reduces (we received payment)
      description: 'Test payment',
      notes: 'Testing payment recording',
      created_by: 1,
      created_by_name: 'Test User',
      is_manual: 0
    };

    const result = await db.query(`
      INSERT INTO shop_ledger (
        shop_id, shop_name, transaction_date, transaction_type,
        reference_type, reference_number, debit_amount, credit_amount,
        balance, description, notes, created_by, created_by_name, is_manual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paymentData.shop_id,
      paymentData.shop_name,
      paymentData.transaction_date,
      paymentData.transaction_type,
      paymentData.reference_type,
      paymentData.reference_number,
      paymentData.debit_amount,
      paymentData.credit_amount,
      paymentData.balance,
      paymentData.description,
      paymentData.notes,
      paymentData.created_by,
      paymentData.created_by_name,
      paymentData.is_manual
    ]);

    console.log('✅ Payment recorded successfully!');
    console.log('   Insert ID:', result.insertId || result.lastID);

    // Verify the entry
    const entries = await db.query('SELECT * FROM shop_ledger WHERE shop_id = ?', [testShop[0].id]);
    console.log('\n📝 Ledger entries for shop:', entries.length);
    entries.forEach(entry => {
      console.log('   -', entry.transaction_type, ':', entry.credit_amount ? `Credit ${entry.credit_amount}` : `Debit ${entry.debit_amount}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPayment();

/**
 * Simple Payment Test
 */

require('dotenv').config();
const db = require('./src/config/database');

async function testPayment() {
  try {
    console.log('✅ Database connected');

    // Check if shop_ledger table exists
    const tables = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='shop_ledger'"
    );
    console.log('📋 shop_ledger table:', tables.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    
    if (tables.length === 0) {
      console.log('❌ Cannot test - shop_ledger table is missing');
      process.exit(1);
    }

    // Check if there are shops
    const shops = await db.query('SELECT * FROM shops LIMIT 1');
    if (shops.length === 0) {
      console.log('\n⚠️  No shops found - creating test shop...');
      await db.query(`
        INSERT INTO shops (shop_code, shop_name, owner_name, current_balance, opening_balance)
        VALUES ('TEST001', 'Test Shop', 'Test Owner', 0, 0)
      `);
      console.log('✅ Test shop created');
    }

    const testShops = await db.query('SELECT * FROM shops LIMIT 1');
    const testShop = testShops[0];
    console.log('\n🏪 Shop:', testShop.shop_name, '(ID:', testShop.id + ')');

    // Record a payment
    console.log('\n💳 Recording test payment of Rs 5600...');
    
    const paymentData = {
      shop_id: testShop.id,
      shop_name: testShop.shop_name,
      transaction_date: new Date().toISOString(),
      transaction_type: 'payment',
      reference_type: 'payment',
      reference_number: 'TEST-PAY-001',
      debit_amount: 0,
      credit_amount: 5600,
      balance: 0 - 5600, // Shop pays us, their balance reduces (becomes negative = they owe less)
      description: 'Test payment',
      notes: 'Testing payment recording',
      created_by: 1,
      created_by_name: 'Admin',
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

    // Verify
    const entries = await db.query('SELECT * FROM shop_ledger WHERE shop_id = ?', [testShop.id]);
    console.log('\n📝 Ledger entries for shop:', entries.length);
    if (entries.length > 0) {
      entries.forEach(entry => {
        console.log(`   - ${entry.transaction_type}: Credit ${entry.credit_amount}, Balance ${entry.balance}`);
      });
    }

    console.log('\n✅ TEST PASSED - Payment recording works!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPayment();

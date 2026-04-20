const db = require('./src/config/database');

async function checkOrders() {
  try {
    console.log('\n=== Checking Orders from January 26, 2026 ===\n');
    
    const [rows] = await db.query(
      `SELECT id, order_number, salesman_id, shop_id, status, net_amount, created_at 
       FROM orders 
       WHERE created_at >= '2026-01-26 00:00:00' 
       ORDER BY created_at DESC`
    );
    
    if (rows.length === 0) {
      console.log('❌ No orders found from January 26, 2026');
      console.log('   This means mobile orders are NOT being synced to backend database\n');
    } else {
      console.log(`✅ Found ${rows.length} orders from January 26, 2026:\n`);
      rows.forEach((row, index) => {
        console.log(`${index + 1}. Order: ${row.order_number}`);
        console.log(`   Salesman ID: ${row.salesman_id}, Shop ID: ${row.shop_id}`);
        console.log(`   Status: ${row.status}, Amount: ${row.net_amount}`);
        console.log(`   Created: ${row.created_at}\n`);
      });
    }
    
    // Check total orders
    const [total] = await db.query('SELECT COUNT(*) as count FROM orders');
    console.log(`Total orders in database: ${total[0].count}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkOrders();

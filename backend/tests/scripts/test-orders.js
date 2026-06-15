/**
 * Test Orders - Check and Create Sample Orders
 * This script checks if orders exist and creates sample data if needed
 */

require('dotenv').config();
const db = require('./src/config/database');
const Order = require('./src/models/Order');

async function testOrders() {
  console.log('\n🔍 ========== TESTING ORDERS SYSTEM ==========\n');
  
  try {
    // Detect which database is being used
    const useSQLite = process.env.USE_SQLITE === 'true';
    console.log(`📊 Database: ${useSQLite ? 'SQLite' : 'MySQL'}\n`);

    // Check if orders table exists
    console.log('1️⃣ Checking if orders table exists...');
    let tables;
    if (useSQLite) {
      [tables] = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'");
    } else {
      [tables] = await db.query("SHOW TABLES LIKE 'orders'");
    }
    
    if (tables.length === 0) {
      console.error('❌ Orders table does not exist!');
      console.log('   Please run the database migrations first.');
      process.exit(1);
    }
    console.log('✅ Orders table exists\n');

    // Check if order_details table exists
    console.log('2️⃣ Checking if order_details/order_items table exists...');
    let detailTables;
    if (useSQLite) {
      // SQLite uses order_items table
      [detailTables] = await db.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('order_details', 'order_items')");
    } else {
      // MySQL uses order_details table
      [detailTables] = await db.query("SHOW TABLES LIKE 'order_details'");
    }
    
    if (detailTables.length === 0) {
      console.error('❌ Order details table does not exist!');
      console.log('   Please run the database migrations first.');
      process.exit(1);
    }
    const detailsTableName = detailTables[0].name || 'order_details';
    console.log(`✅ Order details table exists: ${detailsTableName}\n`);

    // Count existing orders
    console.log('3️⃣ Counting existing orders...');
    const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = orderCount[0].count;
    console.log(`📊 Found ${totalOrders} orders in database\n`);

    // Get orders by status
    const [statusCounts] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
    `);
    
    if (statusCounts.length > 0) {
      console.log('📋 Orders by status:');
      statusCounts.forEach(row => {
        console.log(`   ${row.status}: ${row.count}`);
      });
      console.log('');
    }

    // Get sample orders
    console.log('4️⃣ Fetching sample orders...');
    const orderDetailsTable = useSQLite ? 'order_items' : 'order_details';
    const [sampleOrders] = await db.query(`
      SELECT 
        o.id,
        o.order_number,
        o.order_date,
        o.status,
        o.net_amount,
        s.full_name as salesman_name,
        sh.shop_name,
        (SELECT COUNT(*) FROM ${orderDetailsTable} WHERE order_id = o.id) as items_count
      FROM orders o
      LEFT JOIN salesmen s ON o.salesman_id = s.id
      LEFT JOIN shops sh ON o.shop_id = sh.id
      ORDER BY o.order_date DESC
      LIMIT 5
    `);

    if (sampleOrders.length > 0) {
      console.log('✅ Sample orders:');
      console.log('─'.repeat(100));
      console.log('ID | Order Number         | Date       | Status    | Salesman         | Shop             | Items | Amount');
      console.log('─'.repeat(100));
      sampleOrders.forEach(order => {
        const orderDate = new Date(order.order_date).toLocaleDateString();
        console.log(
          `${String(order.id).padEnd(2)} | ` +
          `${(order.order_number || 'N/A').padEnd(20)} | ` +
          `${orderDate.padEnd(10)} | ` +
          `${(order.status || 'N/A').padEnd(9)} | ` +
          `${(order.salesman_name || 'N/A').substring(0, 16).padEnd(16)} | ` +
          `${(order.shop_name || 'N/A').substring(0, 16).padEnd(16)} | ` +
          `${String(order.items_count).padEnd(5)} | ` +
          `Rs ${order.net_amount || 0}`
        );
      });
      console.log('─'.repeat(100));
      console.log('');
    } else {
      console.log('⚠️ No orders found in database\n');
    }

    // Check if we have salesmen for creating orders
    console.log('5️⃣ Checking prerequisites for creating orders...');
    const [salesmen] = await db.query('SELECT COUNT(*) as count FROM salesmen WHERE is_active = 1');
    const [shops] = await db.query('SELECT COUNT(*) as count FROM shops WHERE is_active = 1');
    const [products] = await db.query('SELECT COUNT(*) as count FROM products WHERE is_active = 1');

    console.log(`   Active Salesmen: ${salesmen[0].count}`);
    console.log(`   Active Shops: ${shops[0].count}`);
    console.log(`   Active Products: ${products[0].count}`);
    console.log('');

    if (totalOrders === 0 && salesmen[0].count > 0 && shops[0].count > 0 && products[0].count > 0) {
      console.log('6️⃣ Creating sample order...');
      
      // Get first salesman
      const [firstSalesman] = await db.query('SELECT id FROM salesmen WHERE is_active = 1 LIMIT 1');
      // Get first shop
      const [firstShop] = await db.query('SELECT id FROM shops WHERE is_active = 1 LIMIT 1');
      // Get first product with stock
      const [firstProduct] = await db.query('SELECT id, product_name, unit_price FROM products WHERE is_active = 1 AND stock_quantity > 0 LIMIT 1');

      if (firstSalesman.length > 0 && firstShop.length > 0 && firstProduct.length > 0) {
        const sampleOrder = {
          salesman_id: firstSalesman[0].id,
          shop_id: firstShop[0].id,
          order_date: new Date(),
          total_amount: firstProduct[0].unit_price * 10,
          discount: 0,
          net_amount: firstProduct[0].unit_price * 10,
          status: 'placed',
          notes: 'Sample order created by test script',
          items: [
            {
              product_id: firstProduct[0].id,
              quantity: 10,
              unit_price: firstProduct[0].unit_price,
              total_price: firstProduct[0].unit_price * 10,
              discount: 0,
              net_price: firstProduct[0].unit_price * 10
            }
          ]
        };

        const newOrder = await Order.create(sampleOrder);
        console.log(`✅ Sample order created: ${newOrder.order_number}`);
        console.log('');
      } else {
        console.log('⚠️ Cannot create sample order: Missing required data');
        console.log('');
      }
    }

    // Test findAll method
    console.log('7️⃣ Testing Order.findAll() method...');
    const result = await Order.findAll({
      page: 1,
      limit: 10
    });

    console.log(`✅ Order.findAll() works!`);
    console.log(`   Returned ${result.orders.length} orders`);
    console.log(`   Total: ${result.pagination.total}`);
    console.log(`   Pages: ${result.pagination.totalPages}`);
    console.log('');

    console.log('✅ ========== ALL TESTS PASSED ==========\n');
    
  } catch (error) {
    console.error('\n❌ ========== TEST FAILED ==========');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('❌ ====================================\n');
  } finally {
    // Close database connection
    try {
      if (db.end) {
        await db.end();
      }
    } catch (err) {
      // Ignore close errors
    }
    process.exit(0);
  }
}

// Run tests
testOrders();

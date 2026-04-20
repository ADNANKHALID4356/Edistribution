/**
 * Create Sample Orders Script
 * Creates realistic orders with 7+ products each from mobile app perspective
 */

require('dotenv').config();
const db = require('./src/config/database');

console.log('📦 ========== CREATING SAMPLE ORDERS ==========\n');

// Helper function to generate order number
function generateOrderNumber(orderDate, salesmanId, count) {
  const date = new Date(orderDate);
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const salesmanPrefix = `S${String(salesmanId).padStart(3, '0')}`;
  const paddedCount = String(count).padStart(5, '0');
  
  return `ORD-${dateStr}-${salesmanPrefix}-${paddedCount}`;
}

async function createSampleOrders() {
  try {
    // Detect which database is being used
    const useSQLite = process.env.USE_SQLITE === 'true';
    console.log(`📊 Database: ${useSQLite ? 'SQLite' : 'MySQL'}\n`);

    // 1. Get available users as salesmen (any active user can place orders)
    console.log('👤 Fetching users (salesmen)...');
    const [salesmen] = await db.query(`
      SELECT * FROM users WHERE is_active = 1 LIMIT 5
    `);
    console.log(`   ✓ Found ${salesmen.length} active users\n`);
    
    if (salesmen.length === 0) {
      console.log('❌ No active salesmen found! Please create salesmen first.');
      process.exit(1);
    }

    // 2. Get available shops
    console.log('🏪 Fetching shops...');
    const [shops] = await db.query(`SELECT * FROM shops WHERE is_active = 1 LIMIT 10`);
    console.log(`   ✓ Found ${shops.length} active shops\n`);
    
    if (shops.length === 0) {
      console.log('❌ No active shops found! Please create shops first.');
      process.exit(1);
    }

    // 3. Get available products - if not enough, create sample products
    console.log('📦 Fetching products...');
    let [products] = await db.query(`SELECT * FROM products WHERE stock_quantity > 0 LIMIT 20`);
    console.log(`   ✓ Found ${products.length} products in stock\n`);
    
    if (products.length < 7) {
      console.log('⚠️  Not enough products! Creating sample products...\n');
      
      const sampleProducts = [
        { code: 'COKE-1.5L', name: 'Coca Cola 1.5L', category: 'Beverages', price: 120, stock: 500 },
        { code: 'PEPSI-500ML', name: 'Pepsi 500ml', category: 'Beverages', price: 50, stock: 800 },
        { code: 'SPRITE-2L', name: 'Sprite 2L', category: 'Beverages', price: 150, stock: 300 },
        { code: 'FANTA-1L', name: 'Fanta Orange 1L', category: 'Beverages', price: 80, stock: 400 },
        { code: 'WATER-1.5L', name: 'Mineral Water 1.5L', category: 'Beverages', price: 40, stock: 1000 },
        { code: 'JUICE-1L', name: 'Orange Juice 1L', category: 'Beverages', price: 200, stock: 250 },
        { code: 'CHIPS-50G', name: 'Lays Chips 50g', category: 'Snacks', price: 30, stock: 600 },
        { code: 'BISCUIT-PKT', name: 'Biscuit Pack', category: 'Snacks', price: 45, stock: 700 },
        { code: 'CHOCOLATE-BAR', name: 'Chocolate Bar', category: 'Confectionery', price: 100, stock: 400 },
        { code: 'CANDY-PKT', name: 'Candy Pack', category: 'Confectionery', price: 25, stock: 500 }
      ];

      for (const product of sampleProducts) {
        await db.query(`
          INSERT OR IGNORE INTO products (
            product_code, product_name, category, unit_price, 
            stock_quantity, pieces_per_carton, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [
          product.code,
          product.name,
          product.category,
          product.price,
          product.stock,
          12
        ]);
        console.log(`   ✓ Created product: ${product.name}`);
      }

      // Re-fetch products
      [products] = await db.query(`SELECT * FROM products WHERE stock_quantity > 0 LIMIT 20`);
      console.log(`\n   ✅ Now have ${products.length} products available\n`);
    }

    // 4. Get existing orders count per salesman to generate unique order numbers
    const [existingOrdersCount] = await db.query(`
      SELECT salesman_id, COUNT(*) as count 
      FROM orders 
      GROUP BY salesman_id
    `);
    const orderCounts = {};
    existingOrdersCount.forEach(row => {
      orderCounts[row.salesman_id] = row.count;
    });

    // 5. Create 5 sample orders
    const ordersToCreate = 5;
    const useSqliteTable = useSQLite;
    const ORDER_ITEMS_TABLE = useSqliteTable ? 'order_items' : 'order_details';

    console.log(`\n🔨 Creating ${ordersToCreate} sample orders...\n`);

    for (let i = 0; i < ordersToCreate; i++) {
      const salesman = salesmen[i % salesmen.length];
      const shop = shops[i % shops.length];
      
      // Initialize order count for this salesman
      if (!orderCounts[salesman.id]) {
        orderCounts[salesman.id] = 0;
      }
      orderCounts[salesman.id]++;

      // Random date within last 7 days
      const daysAgo = Math.floor(Math.random() * 7);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);
      orderDate.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60), 0, 0);

      // Generate order number
      const orderNumber = generateOrderNumber(orderDate, salesman.id, orderCounts[salesman.id]);

      // Select 7-12 random products for this order
      const numProducts = 7 + Math.floor(Math.random() * 6); // 7 to 12 products
      const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
      const orderProducts = shuffledProducts.slice(0, Math.min(numProducts, products.length));

      // Calculate order items and totals
      const items = orderProducts.map(product => {
        const quantity = Math.floor(Math.random() * 10) + 1; // 1-10 units
        const unitPrice = product.unit_price || product.price || 50; // Use unit_price or price
        const totalPrice = quantity * unitPrice;
        const discount = Math.floor(Math.random() * 3) === 0 ? Math.floor(totalPrice * 0.05) : 0; // 5% discount randomly
        const netPrice = totalPrice - discount;

        return {
          product_id: product.id,
          product_name: product.product_name,
          quantity,
          unitPrice,
          totalPrice,
          discount,
          netPrice
        };
      });

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
      const netAmount = totalAmount - totalDiscount;

      // Vary order status
      const statuses = ['placed', 'placed', 'approved', 'approved', 'delivered'];
      const status = statuses[i % statuses.length];

      console.log(`📋 Order ${i + 1}/${ordersToCreate}:`);
      console.log(`   Order Number: ${orderNumber}`);
      console.log(`   Salesman: ${salesman.full_name}`);
      console.log(`   Shop: ${shop.shop_name}`);
      console.log(`   Date: ${orderDate.toLocaleString()}`);
      console.log(`   Products: ${items.length} items`);
      console.log(`   Status: ${status}`);
      console.log(`   Total: $${totalAmount.toFixed(2)}, Discount: $${totalDiscount.toFixed(2)}, Net: $${netAmount.toFixed(2)}`);

      // Insert order into database
      const notes = `Sample order created with ${items.length} products. ${status === 'delivered' ? 'Order completed successfully.' : 'Awaiting processing.'}`;
      
      const [orderResult] = await db.query(`
        INSERT INTO orders (
          order_number, salesman_id, shop_id, order_date,
          total_amount, discount_amount, net_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNumber,
        salesman.id,
        shop.id,
        orderDate.toISOString().slice(0, 19).replace('T', ' '),
        totalAmount,
        totalDiscount,
        netAmount,
        status,
        notes
      ]);

      const orderId = orderResult.insertId;

      // Insert order items
      console.log(`   Products ordered:`);
      for (const item of items) {
        await db.query(`
          INSERT INTO ${ORDER_ITEMS_TABLE} (
            order_id, product_id, quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          orderId,
          item.product_id,
          item.quantity,
          item.unitPrice,
          item.netPrice
        ]);
        console.log(`      • ${item.product_name} x${item.quantity} = $${item.netPrice.toFixed(2)}`);
      }

      console.log(`   ✅ Order created with ID: ${orderId}\n`);
    }

    // Summary
    console.log('\n✅ ========== SUMMARY ==========');
    console.log(`✓ Created ${ordersToCreate} orders successfully`);
    console.log(`✓ Each order contains 7-12 products`);
    console.log(`✓ Orders spread across ${salesmen.length} salesmen`);
    console.log(`✓ Orders distributed to ${shops.length} shops`);
    console.log('\n📱 Orders are now synced and visible in Desktop App!');
    console.log('🔄 Refresh the Order Management page to see them.\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating orders:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the function
createSampleOrders();

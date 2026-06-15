/**
 * Quick script to check and fix stock levels for testing
 */
const db = require('./src/config/database');

async function checkAndFixStock() {
  try {
    console.log('🔍 Checking product stock levels...\n');
    
    // Get product details
    const [products] = await db.query(
      'SELECT id, product_name, stock_quantity, reserved_stock FROM products WHERE id = 1'
    );
    
    if (products.length === 0) {
      console.log('❌ Product ID 1 not found');
      process.exit(1);
    }
    
    const product = products[0];
    console.log('📦 Product Details:');
    console.log('   ID:', product.id);
    console.log('   Name:', product.product_name);
    console.log('   Current Stock:', product.stock_quantity);
    console.log('   Reserved Stock:', product.reserved_stock || 0);
    
    // Check order details to see what's needed
    const [orderItems] = await db.query(`
      SELECT oi.*, o.order_number, o.status 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.product_id = 1
      ORDER BY oi.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n📋 Recent Orders for this product:');
    if (orderItems.length > 0) {
      orderItems.forEach(item => {
        console.log(`   - Order ${item.order_number}: ${item.quantity} units (Status: ${item.status})`);
      });
    } else {
      console.log('   No orders found');
    }
    
    // Increase stock to 100 for testing
    console.log('\n🔧 Updating stock to 100 units...');
    await db.query(
      'UPDATE products SET stock_quantity = 100 WHERE id = 1'
    );
    
    console.log('✅ Stock updated successfully!');
    
    // Verify
    const [updated] = await db.query(
      'SELECT stock_quantity FROM products WHERE id = 1'
    );
    console.log('✅ New stock level:', updated[0].stock_quantity);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndFixStock();

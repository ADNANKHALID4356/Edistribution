/**
 * Create Test Shop
 */

require('dotenv').config();
const db = require('./src/config/database');

async function createShop() {
  try {
    console.log('✅ Database connected\n');

    // Create Ali General Store (from screenshot)
    console.log('🏪 Creating "Ali General Store"...');
    await db.query(`
      INSERT INTO shops (
        shop_code, shop_name, owner_name, phone, address, city,
        credit_limit, current_balance, opening_balance, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'SHOP003',
      'Ali General Store',
      'Ali',
      '03001234567',
      'Main Bazar',
      'Lahore',
      100000,
      0,
      0,
      1
    ]);
    console.log('✅ Shop created');

    // Verify
    const shops = await db.query('SELECT * FROM shops WHERE shop_name LIKE ?', ['%Ali General%']);
    console.log('\n📋 Shop Details:');
    shops.forEach(shop => {
      console.log(`   - ID: ${shop.id}`);
      console.log(`   - Name: ${shop.shop_name}`);
      console.log(`   - Owner: ${shop.owner_name}`);
      console.log(`   - Balance: Rs ${shop.current_balance}`);
    });

    console.log('\n✅ Shop ready for testing payment!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('UNIQUE constraint failed')) {
      console.log('ℹ️  Shop already exists');
      process.exit(0);
    }
    console.error(error);
    process.exit(1);
  }
}

createShop();

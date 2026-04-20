/**
 * Migration: New Features - March 2026
 *                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          poiuytrelkjhgfdnbvy8765jhgfkjh
 * 1. stock_returns table - Track partial delivery returns
 * 2. company_name column on products - Track product manufacturer/company
 * 3. daily_collections table - Track daily received amounts
 * 
 * Run: node migrations/migrate-new-features.js
 */

const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  console.log('🔄 Running migrations for new features...\n');

  try {
    // =========================================================
    // 1. Add company_name column to products table
    // =========================================================
    console.log('📦 Migration 1: Adding company_name to products table...');
    try {
      await connection.query(`
        ALTER TABLE products ADD COLUMN company_name VARCHAR(200) DEFAULT NULL AFTER brand
      `);
      console.log('   ✅ company_name column added to products');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠️  company_name column already exists - skipping');
      } else {
        throw e;
      }
    }

    // Add index for company_name filtering
    try {
      await connection.query(`
        ALTER TABLE products ADD INDEX idx_company_name (company_name)
      `);
      console.log('   ✅ Index added for company_name');
    } catch (e) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠️  Index already exists - skipping');
      } else {
        console.log('   ⚠️  Index creation note:', e.message);
      }
    }

    // =========================================================
    // 2. Create stock_returns table
    // =========================================================
    console.log('\n📦 Migration 2: Creating stock_returns table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stock_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_number VARCHAR(50) NOT NULL UNIQUE,
        delivery_id INT NOT NULL,
        challan_number VARCHAR(50),
        shop_id INT NOT NULL,
        shop_name VARCHAR(200),
        route_id INT,
        route_name VARCHAR(200),
        salesman_id INT,
        salesman_name VARCHAR(200),
        warehouse_id INT NOT NULL,
        return_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        total_items INT DEFAULT 0,
        total_quantity_returned DECIMAL(15,2) DEFAULT 0,
        total_return_amount DECIMAL(15,2) DEFAULT 0,
        reason VARCHAR(500),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'completed',
        created_by INT,
        created_by_name VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
        FOREIGN KEY (shop_id) REFERENCES shops(id),
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
        INDEX idx_return_number (return_number),
        INDEX idx_delivery_id (delivery_id),
        INDEX idx_shop_id (shop_id),
        INDEX idx_return_date (return_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✅ stock_returns table created');

    // =========================================================
    // 3. Create stock_return_items table
    // =========================================================
    console.log('\n📦 Migration 3: Creating stock_return_items table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS stock_return_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        return_id INT NOT NULL,
        delivery_item_id INT,
        product_id INT NOT NULL,
        product_name VARCHAR(200),
        product_code VARCHAR(50),
        quantity_delivered INT NOT NULL DEFAULT 0,
        quantity_returned INT NOT NULL DEFAULT 0,
        unit_price DECIMAL(15,2) DEFAULT 0,
        return_amount DECIMAL(15,2) DEFAULT 0,
        reason VARCHAR(500),
        condition_status VARCHAR(50) DEFAULT 'good',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES stock_returns(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id),
        INDEX idx_return_id (return_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✅ stock_return_items table created');

    // =========================================================
    // 4. Create daily_collections table
    // =========================================================
    console.log('\n📦 Migration 4: Creating daily_collections table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_collections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        collection_date DATE NOT NULL,
        shop_id INT,
        shop_name VARCHAR(200),
        salesman_id INT,
        salesman_name VARCHAR(200),
        amount DECIMAL(15,2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        reference_number VARCHAR(100),
        description TEXT,
        notes TEXT,
        created_by INT,
        created_by_name VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_collection_date (collection_date),
        INDEX idx_shop_id (shop_id),
        INDEX idx_salesman_id (salesman_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('   ✅ daily_collections table created');

    // =========================================================
    // 5. Ensure discount columns exist in order_details
    // =========================================================
    console.log('\n📦 Migration 5: Ensuring discount columns in order_details...');
    const columnsToCheck = [
      { name: 'discount', type: 'DECIMAL(15,2) DEFAULT 0', after: 'total_price' },
      { name: 'discount_percentage', type: 'DECIMAL(5,2) DEFAULT 0', after: 'discount' },
      { name: 'net_price', type: 'DECIMAL(15,2) DEFAULT 0', after: 'discount_percentage' }
    ];

    for (const col of columnsToCheck) {
      try {
        await connection.query(`ALTER TABLE order_details ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`);
        console.log(`   ✅ ${col.name} column added to order_details`);
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
          console.log(`   ⚠️  ${col.name} already exists in order_details - skipping`);
        } else {
          console.log(`   ⚠️  ${col.name}: ${e.message}`);
        }
      }
    }

    console.log('\n✅ All migrations completed successfully!');
    console.log('\nNew features ready:');
    console.log('  📦 Product company_name field');
    console.log('  🔄 Stock returns system (stock_returns + stock_return_items)');
    console.log('  💰 Daily collections tracking');
    console.log('  💵 Discount columns on order_details');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);

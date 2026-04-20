/**
 * Auto-Migration System
 * Runs on server startup to ensure all required tables/columns exist
 * Safe to run multiple times (idempotent)
 */

const db = require('./database');

async function runMigrations() {
  console.log('🔄 Running auto-migrations...');
  
  try {
    // 1. Add company_name to products
    await safeAddColumn('products', 'company_name', 'VARCHAR(200) DEFAULT NULL', 'brand');
    
    // 2. Create stock_returns table
    await safeCreateTable('stock_returns', `
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
        INDEX idx_return_number (return_number),
        INDEX idx_delivery_id (delivery_id),
        INDEX idx_shop_id (shop_id),
        INDEX idx_return_date (return_date),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // 3. Create stock_return_items table
    await safeCreateTable('stock_return_items', `
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
        INDEX idx_return_id (return_id),
        INDEX idx_product_id (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    // 4. Create daily_collections table
    await safeCreateTable('daily_collections', `
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
        received_from VARCHAR(200),
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

    // 5. Ensure discount columns exist in order_details
    await safeAddColumn('order_details', 'discount', 'DECIMAL(15,2) DEFAULT 0', 'total_price');
    await safeAddColumn('order_details', 'discount_percentage', 'DECIMAL(5,2) DEFAULT 0', 'discount');
    await safeAddColumn('order_details', 'net_price', 'DECIMAL(15,2) DEFAULT 0', 'discount_percentage');

    // 6. Ensure received_from column exists in daily_collections
    await safeAddColumn('daily_collections', 'received_from', 'VARCHAR(200)', 'description');

    // 7. Ensure company_settings has ALL required columns
    //    The VPS table may have been created from an older migration that lacked
    //    extended address, banking, branding, and business-settings columns.
    //    safeAddColumn silently skips columns that already exist (ER_DUP_FIELDNAME).
    await safeAddColumn('company_settings', 'company_city',                'VARCHAR(100)',                   'company_address');
    await safeAddColumn('company_settings', 'company_state',               'VARCHAR(100)',                   'company_city');
    await safeAddColumn('company_settings', 'company_country',             "VARCHAR(100) DEFAULT 'Pakistan'",'company_state');
    await safeAddColumn('company_settings', 'company_postal_code',         'VARCHAR(20)',                    'company_country');
    await safeAddColumn('company_settings', 'company_phone',               'VARCHAR(50)',                    'company_postal_code');
    await safeAddColumn('company_settings', 'company_mobile',              'VARCHAR(50)',                    'company_phone');
    await safeAddColumn('company_settings', 'company_email',               'VARCHAR(255)',                   'company_mobile');
    await safeAddColumn('company_settings', 'company_website',             'VARCHAR(255)',                   'company_email');
    await safeAddColumn('company_settings', 'company_tax_number',          'VARCHAR(100)',                   'company_website');
    await safeAddColumn('company_settings', 'company_registration_number', 'VARCHAR(100)',                   'company_tax_number');
    await safeAddColumn('company_settings', 'company_ntn',                 'VARCHAR(100)',                   'company_registration_number');
    await safeAddColumn('company_settings', 'company_gst_number',          'VARCHAR(100)',                   'company_ntn');
    await safeAddColumn('company_settings', 'bank_name',                   'VARCHAR(255)',                   'company_gst_number');
    await safeAddColumn('company_settings', 'bank_account_title',          'VARCHAR(255)',                   'bank_name');
    await safeAddColumn('company_settings', 'bank_account_number',         'VARCHAR(100)',                   'bank_account_title');
    await safeAddColumn('company_settings', 'bank_branch',                 'VARCHAR(255)',                   'bank_account_number');
    await safeAddColumn('company_settings', 'bank_iban',                   'VARCHAR(100)',                   'bank_branch');
    await safeAddColumn('company_settings', 'bank_swift_code',             'VARCHAR(50)',                    'bank_iban');
    await safeAddColumn('company_settings', 'bank_name_2',                 'VARCHAR(255)',                   'bank_swift_code');
    await safeAddColumn('company_settings', 'bank_account_title_2',        'VARCHAR(255)',                   'bank_name_2');
    await safeAddColumn('company_settings', 'bank_account_number_2',       'VARCHAR(100)',                   'bank_account_title_2');
    await safeAddColumn('company_settings', 'bank_branch_2',               'VARCHAR(255)',                   'bank_account_number_2');
    await safeAddColumn('company_settings', 'bank_iban_2',                 'VARCHAR(100)',                   'bank_branch_2');
    await safeAddColumn('company_settings', 'company_logo_url',            'TEXT',                           'bank_iban_2');
    await safeAddColumn('company_settings', 'company_slogan',              'VARCHAR(255)',                   'company_logo_url');
    await safeAddColumn('company_settings', 'invoice_header_text',         'TEXT',                           'company_slogan');
    await safeAddColumn('company_settings', 'invoice_footer_text',         'TEXT',                           'invoice_header_text');
    await safeAddColumn('company_settings', 'currency_symbol',             "VARCHAR(10) DEFAULT 'Rs.'",     'invoice_footer_text');
    await safeAddColumn('company_settings', 'currency_code',               "VARCHAR(5) DEFAULT 'PKR'",      'currency_symbol');
    await safeAddColumn('company_settings', 'default_tax_percentage',      'DECIMAL(5,2) DEFAULT 0.00',     'currency_code');
    await safeAddColumn('company_settings', 'default_credit_days',         'INT DEFAULT 30',                'default_tax_percentage');

    console.log('✅ Auto-migrations completed successfully');
  } catch (error) {
    console.error('⚠️ Migration error (non-fatal):', error.message);
    // Don't throw - server should still start
  }
}

async function safeAddColumn(table, column, definition, after) {
  try {
    const afterClause = after ? ` AFTER ${after}` : '';
    await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}${afterClause}`);
    console.log(`   ✅ Added ${column} to ${table}`);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      // Column already exists - OK
    } else {
      console.log(`   ⚠️ ${table}.${column}: ${e.message}`);
    }
  }
}

async function safeCreateTable(table, sql) {
  try {
    await db.query(sql);
    console.log(`   ✅ Table ${table} ready`);
  } catch (e) {
    console.log(`   ⚠️ Table ${table}: ${e.message}`);
  }
}

module.exports = { runMigrations };

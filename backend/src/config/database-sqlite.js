const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Determine database location
// In production (packaged), store in user's AppData
// In development, store in backend/data folder
const isDev = process.env.NODE_ENV === 'development' || !process.pkg;
const dbDir = isDev 
  ? path.join(__dirname, '../../data')
  : path.join(process.env.APPDATA || process.env.HOME, 'DistributionSystem');

// Create directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'distribution_system.db');

console.log(`📂 Database location: ${dbPath}`);

// Create database connection
const db = new Database(dbPath, { 
  verbose: console.log,
  fileMustExist: false 
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper function to check if column exists
function columnExists(tableName, columnName) {
  try {
    const columns = db.pragma(`table_info(${tableName})`);
    return columns.some(col => col.name === columnName);
  } catch (e) {
    return false;
  }
}

// Helper function to safely add column
function safeAddColumn(tableName, columnName, columnDef) {
  if (!columnExists(tableName, columnName)) {
    try {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
      console.log(`  ✅ Added column ${columnName} to ${tableName}`);
      return true;
    } catch (e) {
      console.log(`  ⚠️ Could not add ${columnName} to ${tableName}: ${e.message}`);
      return false;
    }
  }
  return false;
}

// Migrate new feature tables (stock returns, daily collections, company_name)
function migrateNewFeatures() {
  console.log('🔄 Checking new feature tables...');

  // Add company_name column to products if missing
  try {
    const productCols = db.pragma('table_info(products)');
    const hasCompanyName = productCols.some(c => c.name === 'company_name');
    if (!hasCompanyName) {
      db.exec("ALTER TABLE products ADD COLUMN company_name TEXT DEFAULT NULL");
      console.log('   ✅ Added company_name to products');
    }
  } catch (e) { console.log('   ⚠️ products.company_name:', e.message); }

  // Create stock_returns table (drop old schema if columns mismatch)
  try {
    const srCols = db.pragma('table_info(stock_returns)');
    const hasChallan = srCols.some(c => c.name === 'challan_number');
    if (srCols.length > 0 && !hasChallan) {
      db.exec('DROP TABLE IF EXISTS stock_returns');
      console.log('   🔄 Recreating stock_returns with full schema');
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_returns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_number TEXT UNIQUE NOT NULL,
        delivery_id INTEGER NOT NULL,
        challan_number TEXT,
        shop_id INTEGER,
        shop_name TEXT,
        route_id INTEGER,
        route_name TEXT,
        salesman_id INTEGER,
        salesman_name TEXT,
        warehouse_id INTEGER,
        return_date DATETIME DEFAULT (datetime('now')),
        total_items INTEGER DEFAULT 0,
        total_quantity_returned INTEGER DEFAULT 0,
        total_return_amount REAL DEFAULT 0,
        reason TEXT,
        notes TEXT,
        status TEXT DEFAULT 'completed',
        created_by INTEGER,
        created_by_name TEXT,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);
    console.log('   ✅ stock_returns table ready');
  } catch (e) { console.log('   ⚠️ stock_returns:', e.message); }

  // Create stock_return_items table (drop old schema if columns mismatch)
  try {
    const sriCols = db.pragma('table_info(stock_return_items)');
    const hasReturnId = sriCols.some(c => c.name === 'return_id');
    if (sriCols.length > 0 && !hasReturnId) {
      db.exec('DROP TABLE IF EXISTS stock_return_items');
      console.log('   🔄 Recreating stock_return_items with full schema');
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS stock_return_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        return_id INTEGER NOT NULL,
        delivery_item_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT,
        product_code TEXT,
        quantity_delivered INTEGER DEFAULT 0,
        quantity_returned INTEGER NOT NULL,
        unit_price REAL DEFAULT 0,
        return_amount REAL DEFAULT 0,
        reason TEXT,
        condition_status TEXT DEFAULT 'good',
        notes TEXT,
        created_at DATETIME DEFAULT (datetime('now'))
      )
    `);
    console.log('   ✅ stock_return_items table ready');
  } catch (e) { console.log('   ⚠️ stock_return_items:', e.message); }

  // Create daily_collections table (drop old schema if columns mismatch)
  try {
    const dcCols = db.pragma('table_info(daily_collections)');
    const hasShopId = dcCols.some(c => c.name === 'shop_id');
    if (dcCols.length > 0 && !hasShopId) {
      db.exec('DROP TABLE IF EXISTS daily_collections');
      console.log('   🔄 Recreating daily_collections with full schema');
    }
    db.exec(`
      CREATE TABLE IF NOT EXISTS daily_collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection_date DATE DEFAULT (date('now')),
        shop_id INTEGER,
        shop_name TEXT,
        salesman_id INTEGER,
        salesman_name TEXT,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        reference_number TEXT,
        description TEXT,
        notes TEXT,
        created_by INTEGER,
        created_by_name TEXT,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now'))
      )
    `);
    console.log('   ✅ daily_collections table ready');
  } catch (e) { console.log('   ⚠️ daily_collections:', e.message); }

  // Ensure discount columns exist in order_details
  try {
    const orderDetailCols = db.pragma('table_info(order_details)');
    if (orderDetailCols.length > 0) {
      const hasDiscPct = orderDetailCols.some(c => c.name === 'discount_percentage');
      const hasDiscAmt = orderDetailCols.some(c => c.name === 'discount_amount');
      if (!hasDiscPct) {
        db.exec("ALTER TABLE order_details ADD COLUMN discount_percentage REAL DEFAULT 0");
      }
      if (!hasDiscAmt) {
        db.exec("ALTER TABLE order_details ADD COLUMN discount_amount REAL DEFAULT 0");
      }
    }
  } catch (e) { console.log('   ⚠️ order_details discount:', e.message); }

  // Ensure quantity_returned column on delivery_items
  try {
    const diCols = db.pragma('table_info(delivery_items)');
    if (diCols.length > 0) {
      const hasQtyReturned = diCols.some(c => c.name === 'quantity_returned');
      if (!hasQtyReturned) {
        db.exec("ALTER TABLE delivery_items ADD COLUMN quantity_returned REAL DEFAULT 0");
        console.log('   ✅ Added quantity_returned to delivery_items');
      }
    }
  } catch (e) { console.log('   ⚠️ delivery_items.quantity_returned:', e.message); }

  console.log('✅ New feature migration complete');
}

// Migrate deliveries table to add missing columns for professional challan management
function migrateDeliveriesTable() {
  console.log('🔄 Checking deliveries table schema...');
  
  // First, check if order_id has NOT NULL constraint and fix it
  try {
    const tableInfo = db.pragma('table_info(deliveries)');
    const orderIdCol = tableInfo.find(col => col.name === 'order_id');
    
    if (orderIdCol && orderIdCol.notnull === 1) {
      console.log('🔄 Fixing order_id NOT NULL constraint in deliveries table...');
      
      // SQLite doesn't support ALTER COLUMN, so we need to recreate the table
      db.exec('BEGIN TRANSACTION');
      
      try {
        // First drop the view that depends on deliveries
        db.exec('DROP VIEW IF EXISTS v_dashboard_stats');
        
        // Create a new table with correct schema
        db.exec(`
          CREATE TABLE IF NOT EXISTS deliveries_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            challan_number TEXT UNIQUE NOT NULL,
            invoice_id INTEGER,
            order_id INTEGER,
            warehouse_id INTEGER,
            load_sheet_id INTEGER,
            delivery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            expected_delivery_time TEXT,
            driver_name TEXT,
            driver_phone TEXT,
            driver_cnic TEXT,
            vehicle_number TEXT,
            vehicle_type TEXT,
            shop_id INTEGER,
            shop_name TEXT,
            shop_address TEXT,
            shop_contact TEXT,
            delivery_address TEXT,
            route_id INTEGER,
            route_name TEXT,
            salesman_id INTEGER,
            salesman_name TEXT,
            receiver_name TEXT,
            receiver_signature TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'delivered', 'returned', 'cancelled')),
            total_items INTEGER DEFAULT 0,
            total_quantity REAL DEFAULT 0,
            total_amount REAL DEFAULT 0,
            subtotal REAL DEFAULT 0,
            discount_percentage REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            tax_percentage REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            shipping_charges REAL DEFAULT 0,
            other_charges REAL DEFAULT 0,
            round_off REAL DEFAULT 0,
            grand_total REAL DEFAULT 0,
            notes TEXT,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (invoice_id) REFERENCES invoices(id),
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
            FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id),
            FOREIGN KEY (shop_id) REFERENCES shops(id),
            FOREIGN KEY (route_id) REFERENCES routes(id),
            FOREIGN KEY (created_by) REFERENCES users(id)
          )
        `);
        
        // Copy data from old table to new table
        db.exec(`
          INSERT INTO deliveries_new 
          SELECT id, challan_number, invoice_id, order_id, warehouse_id, load_sheet_id,
                 delivery_date, expected_delivery_time, driver_name, driver_phone, driver_cnic,
                 vehicle_number, vehicle_type, shop_id, shop_name, shop_address, shop_contact,
                 delivery_address, route_id, route_name, salesman_id, salesman_name,
                 receiver_name, receiver_signature, status, total_items, total_quantity,
                 total_amount, subtotal, discount_percentage, discount_amount, tax_percentage,
                 tax_amount, shipping_charges, other_charges, round_off, grand_total,
                 notes, created_by, created_at, updated_at
          FROM deliveries
        `);
        
        // Drop old table and rename new one
        db.exec('DROP TABLE deliveries');
        db.exec('ALTER TABLE deliveries_new RENAME TO deliveries');
        
        // Recreate the view
        db.exec(`
          CREATE VIEW IF NOT EXISTS v_dashboard_stats AS
          SELECT 
            (SELECT COUNT(*) FROM products) as total_products,
            (SELECT COUNT(*) FROM products WHERE is_active = 1) as active_products,
            (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) as low_stock_count,
            (SELECT COUNT(*) FROM suppliers) as total_suppliers,
            (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as active_suppliers,
            (SELECT COUNT(*) FROM shops) as total_shops,
            (SELECT COUNT(*) FROM shops WHERE is_active = 1) as active_shops,
            (SELECT COUNT(*) FROM routes) as total_routes,
            (SELECT COUNT(*) FROM routes WHERE is_active = 1) as active_routes,
            (SELECT COUNT(*) FROM salesmen) as total_salesmen,
            (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as active_salesmen,
            (SELECT COUNT(*) FROM warehouses) as total_warehouses,
            (SELECT COUNT(*) FROM warehouses WHERE status = 'active') as active_warehouses,
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'placed') as pending_orders,
            (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as completed_orders,
            (SELECT COUNT(*) FROM deliveries) as total_deliveries,
            (SELECT COUNT(*) FROM deliveries WHERE status = 'pending') as pending_deliveries,
            (SELECT COUNT(*) FROM deliveries WHERE status = 'in_transit') as in_transit_deliveries,
            (SELECT COUNT(*) FROM deliveries WHERE status = 'delivered') as delivered_deliveries,
            (SELECT COUNT(*) FROM invoices) as total_invoices,
            (SELECT COUNT(*) FROM invoices WHERE status = 'unpaid') as unpaid_invoices,
            (SELECT COUNT(*) FROM invoices WHERE status = 'paid') as paid_invoices,
            (SELECT COUNT(*) FROM invoices WHERE status = 'partial') as partial_invoices,
            (SELECT COUNT(*) FROM load_sheets) as total_load_sheets,
            (SELECT COUNT(*) FROM load_sheets WHERE status = 'draft') as draft_load_sheets,
            (SELECT COUNT(*) FROM load_sheets WHERE status = 'loaded') as loaded_load_sheets,
            (SELECT COUNT(*) FROM load_sheets WHERE status = 'in_transit') as in_transit_load_sheets,
            0 as total_reserved_stock,
            0 as fully_reserved_count
        `);
        
        db.exec('COMMIT');
        console.log('✅ Fixed order_id constraint - now allows NULL for invoice-based deliveries');
      } catch (migrationError) {
        db.exec('ROLLBACK');
        console.log('⚠️ Migration error, continuing with existing schema:', migrationError.message);
      }
    }
  } catch (e) {
    console.log('⚠️ Could not check order_id constraint:', e.message);
  }
  
  // Add missing columns to deliveries table
  const deliveryColumns = [
    ['invoice_id', 'INTEGER'],
    ['warehouse_id', 'INTEGER'],
    ['expected_delivery_time', 'TEXT'],
    ['driver_name', 'TEXT'],
    ['driver_phone', 'TEXT'],
    ['driver_cnic', 'TEXT'],
    ['vehicle_number', 'TEXT'],
    ['vehicle_type', 'TEXT'],
    ['shop_id', 'INTEGER'],
    ['shop_name', 'TEXT'],
    ['shop_address', 'TEXT'],
    ['shop_contact', 'TEXT'],
    ['delivery_address', 'TEXT'],
    ['route_id', 'INTEGER'],
    ['route_name', 'TEXT'],
    ['salesman_id', 'INTEGER'],
    ['salesman_name', 'TEXT'],
    ['total_items', 'INTEGER DEFAULT 0'],
    ['total_quantity', 'REAL DEFAULT 0'],
    ['total_amount', 'REAL DEFAULT 0'],
    ['subtotal', 'REAL DEFAULT 0'],
    ['discount_percentage', 'REAL DEFAULT 0'],
    ['discount_amount', 'REAL DEFAULT 0'],
    ['tax_percentage', 'REAL DEFAULT 0'],
    ['tax_amount', 'REAL DEFAULT 0'],
    ['shipping_charges', 'REAL DEFAULT 0'],
    ['other_charges', 'REAL DEFAULT 0'],
    ['round_off', 'REAL DEFAULT 0'],
    ['grand_total', 'REAL DEFAULT 0'],
    ['created_by', 'INTEGER']
  ];
  
  let columnsAdded = 0;
  for (const [colName, colDef] of deliveryColumns) {
    if (safeAddColumn('deliveries', colName, colDef)) {
      columnsAdded++;
    }
  }
  
  // Add missing columns to delivery_items table
  const itemColumns = [
    ['product_name', 'TEXT'],
    ['product_code', 'TEXT'],
    ['quantity_returned', 'INTEGER DEFAULT 0'],
    ['discount_percentage', 'REAL DEFAULT 0'],
    ['discount_amount', 'REAL DEFAULT 0'],
    ['tax_percentage', 'REAL DEFAULT 0'],
    ['tax_amount', 'REAL DEFAULT 0'],
    ['net_amount', 'REAL DEFAULT 0'],
    ['batch_number', 'TEXT'],
    ['expiry_date', 'DATE'],
    ['notes', 'TEXT']
  ];
  
  for (const [colName, colDef] of itemColumns) {
    if (safeAddColumn('delivery_items', colName, colDef)) {
      columnsAdded++;
    }
  }
  
  // Make order_id nullable in deliveries (if it was NOT NULL before)
  // SQLite doesn't support ALTER COLUMN, but new entries can be NULL anyway
  
  if (columnsAdded > 0) {
    console.log(`✅ Deliveries schema migration complete - added ${columnsAdded} columns`);
  } else {
    console.log('✅ Deliveries schema is up to date');
  }
}

// Migrate orders table to add delivery tracking columns (NEW)
function migrateOrdersTable() {
  console.log('🔄 Checking orders table schema for delivery tracking...');
  
  const orderColumns = [
    ['route_id', 'INTEGER'],
    ['delivery_status', 'TEXT DEFAULT \'pending\' CHECK(delivery_status IN (\'pending\', \'partial\', \'delivered\'))'],
    ['delivery_generated', 'INTEGER DEFAULT 0']
  ];
  
  let columnsAdded = 0;
  for (const [colName, colDef] of orderColumns) {
    if (safeAddColumn('orders', colName, colDef)) {
      columnsAdded++;
    }
  }
  
  if (columnsAdded > 0) {
    console.log(`✅ Orders delivery tracking migration complete - added ${columnsAdded} columns`);
  } else {
    console.log('✅ Orders table already has delivery tracking columns');
  }
}

// Migrate warehouses table to add missing columns for professional warehouse management
function migrateWarehousesTable() {
  console.log('🔄 Checking warehouses table schema...');
  
  const warehouseColumns = [
    ['code', 'TEXT'],  // Can't add UNIQUE via ALTER TABLE in SQLite
    ['address', 'TEXT'],
    ['city', 'TEXT'],
    ['area', 'TEXT'],
    ['postal_code', 'TEXT'],
    ['manager_phone', 'TEXT'],
    ['contact_number', 'TEXT'],
    ['email', 'TEXT'],
    ['capacity', 'INTEGER DEFAULT 0'],
    ['storage_type', 'TEXT DEFAULT \'general\''],
    ['notes', 'TEXT'],
    ['created_by', 'INTEGER']
  ];
  
  let columnsAdded = 0;
  for (const [colName, colDef] of warehouseColumns) {
    if (safeAddColumn('warehouses', colName, colDef)) {
      columnsAdded++;
    }
  }
  
  // Also add missing columns to warehouse_stock for better inventory tracking
  const stockColumns = [
    ['reserved_quantity', 'INTEGER DEFAULT 0'],
    ['min_stock_level', 'INTEGER DEFAULT 0'],
    ['max_stock_level', 'INTEGER DEFAULT 0'],
    ['reorder_point', 'INTEGER DEFAULT 0'],
    ['location_in_warehouse', 'TEXT'],
    ['batch_number', 'TEXT'],
    ['expiry_date', 'DATE'],
    ['notes', 'TEXT'],
    ['created_by', 'INTEGER'],
    ['created_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP']
  ];
  
  for (const [colName, colDef] of stockColumns) {
    if (safeAddColumn('warehouse_stock', colName, colDef)) {
      columnsAdded++;
    }
  }
  
  if (columnsAdded > 0) {
    console.log(`✅ Warehouses schema migration complete - added ${columnsAdded} columns`);
  } else {
    console.log('✅ Warehouses schema is up to date');
  }
}

// Migrate company_settings table — ensures column names match MySQL production schema
// (009_company_settings.sql). Adds any missing MySQL-named columns and the new
// extended fields. Safe to run on both fresh and existing databases.
function migrateCompanySettingsTable() {
  console.log('🔄 Checking company_settings table schema...');

  // All columns that must exist — named exactly as in the MySQL migration.
  const requiredColumns = [
    // Basic Company Information
    ['company_address',             'TEXT'],
    ['company_city',                'TEXT'],
    ['company_state',               'TEXT'],
    ['company_country',             "TEXT DEFAULT 'Pakistan'"],
    ['company_postal_code',         'TEXT'],
    // Contact Information
    ['company_phone',               'TEXT'],
    ['company_mobile',              'TEXT'],
    ['company_email',               'TEXT'],
    ['company_website',             'TEXT'],
    // Legal & Tax
    ['company_tax_number',          'TEXT'],
    ['company_registration_number', 'TEXT'],
    ['company_ntn',                 'TEXT'],
    ['company_gst_number',          'TEXT'],
    // Primary Bank
    ['bank_name',                   'TEXT'],
    ['bank_account_title',          'TEXT'],
    ['bank_account_number',         'TEXT'],
    ['bank_branch',                 'TEXT'],
    ['bank_iban',                   'TEXT'],
    ['bank_swift_code',             'TEXT'],
    // Secondary Bank
    ['bank_name_2',                 'TEXT'],
    ['bank_account_title_2',        'TEXT'],
    ['bank_account_number_2',       'TEXT'],
    ['bank_branch_2',               'TEXT'],
    ['bank_iban_2',                 'TEXT'],
    // Branding
    ['company_logo_url',            'TEXT'],
    ['company_slogan',              'TEXT'],
    ['invoice_header_text',         'TEXT'],
    ['invoice_footer_text',         'TEXT'],
    // Business Settings
    ['currency_symbol',             "TEXT DEFAULT 'Rs.'"],
    ['currency_code',               "TEXT DEFAULT 'PKR'"],
    ['default_tax_percentage',      'REAL DEFAULT 0'],
    ['default_credit_days',         'INTEGER DEFAULT 30'],
  ];

  let columnsAdded = 0;
  for (const [colName, colDef] of requiredColumns) {
    if (safeAddColumn('company_settings', colName, colDef)) {
      columnsAdded++;
    }
  }

  if (columnsAdded > 0) {
    console.log(`✅ company_settings migration complete - added ${columnsAdded} columns`);
  } else {
    console.log('✅ company_settings schema is up to date');
  }
}

// Initialize database schema
function initializeDatabase() {
  console.log('🔧 Initializing database schema...');

  // Roles table (required for User model)
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default roles
  const rolesCount = db.prepare('SELECT COUNT(*) as count FROM roles').get();
  if (rolesCount.count === 0) {
    console.log('👥 Creating default roles...');
    const insertRole = db.prepare('INSERT INTO roles (id, role_name, description, permissions) VALUES (?, ?, ?, ?)');
    insertRole.run(1, 'Admin', 'Full system access', JSON.stringify(['all']));
    insertRole.run(2, 'Manager', 'Product and order management', JSON.stringify(['products', 'orders', 'reports']));
    insertRole.run(3, 'Salesman', 'Field sales and mobile app', JSON.stringify(['orders', 'shops', 'mobile']));
    insertRole.run(4, 'Warehouse', 'Stock and delivery management', JSON.stringify(['stock', 'deliveries']));
    console.log('✅ Default roles created');
  }

  // Salesmen table (for salesman profile data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS salesmen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      salesman_code TEXT UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      cnic TEXT,
      address TEXT,
      city TEXT,
      hire_date DATETIME,
      monthly_target REAL DEFAULT 0,
      commission_percentage REAL DEFAULT 0,
      vehicle_number TEXT,
      license_number TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Sessions table (for token management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      device_info TEXT,
      ip_address TEXT,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Users table (updated to match MySQL structure with role_id)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT,
      role_id INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    )
  `);

  // Warehouses table (Professional warehouse management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      address TEXT,
      city TEXT,
      area TEXT,
      postal_code TEXT,
      location TEXT,
      manager_name TEXT,
      manager_phone TEXT,
      contact_number TEXT,
      contact TEXT,
      email TEXT,
      capacity INTEGER DEFAULT 0,
      storage_type TEXT DEFAULT 'general' CHECK(storage_type IN ('general', 'cold', 'hazardous', 'bonded')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      is_default INTEGER DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_code TEXT UNIQUE,
      supplier_name TEXT NOT NULL,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      opening_balance REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table (updated to match MySQL schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_code TEXT UNIQUE,
      product_name TEXT NOT NULL,
      category TEXT,
      brand TEXT,
      pack_size TEXT,
      unit_price REAL NOT NULL,
      carton_price REAL,
      pieces_per_carton INTEGER DEFAULT 1,
      purchase_price REAL,
      stock_quantity REAL DEFAULT 0,
      reserved_stock REAL DEFAULT 0,
      reorder_level REAL DEFAULT 0,
      supplier_id INTEGER,
      barcode TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Warehouse Stock table (Professional inventory management per warehouse)
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 0,
      reserved_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 0,
      max_stock_level INTEGER DEFAULT 0,
      reorder_point INTEGER DEFAULT 0,
      location_in_warehouse TEXT,
      batch_number TEXT,
      expiry_date DATE,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id),
      UNIQUE(warehouse_id, product_id)
    )
  `);

  // Routes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_name TEXT NOT NULL,
      route_code TEXT UNIQUE,
      area TEXT,
      city TEXT,
      description TEXT,
      salesman_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL
    )
  `);

  // Shops table (updated to match MySQL schema)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_code TEXT UNIQUE,
      shop_name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      alternate_phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      area TEXT,
      route_id INTEGER,
      credit_limit REAL DEFAULT 0,
      current_balance REAL DEFAULT 0,
      opening_balance REAL DEFAULT 0,
      last_transaction_date DATETIME,
      latitude REAL,
      longitude REAL,
      shop_type TEXT,
      business_license TEXT,
      tax_registration TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      shop_id INTEGER NOT NULL,
      salesman_id INTEGER NOT NULL,
      warehouse_id INTEGER,
      route_id INTEGER,
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'placed' CHECK(status IN ('placed', 'approved', 'finalized', 'rejected', 'delivered')),
      notes TEXT,
      delivery_status TEXT DEFAULT 'pending' CHECK(delivery_status IN ('pending', 'partial', 'delivered')),
      delivery_generated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )
  `);

  // Order Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount_percentage REAL DEFAULT 0,
      total_price REAL NOT NULL,
      discount REAL DEFAULT 0,
      net_price REAL NOT NULL DEFAULT 0,
      unit_purchase_cost REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Load Sheets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS load_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_sheet_number TEXT UNIQUE NOT NULL,
      salesman_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      load_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'loaded')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesman_id) REFERENCES users(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
    )
  `);

  // Load Sheet Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS load_sheet_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_sheet_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Deliveries table (Professional delivery challan management)
  db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challan_number TEXT UNIQUE NOT NULL,
      invoice_id INTEGER,
      order_id INTEGER,
      warehouse_id INTEGER,
      load_sheet_id INTEGER,
      delivery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      expected_delivery_time TEXT,
      driver_name TEXT,
      driver_phone TEXT,
      driver_cnic TEXT,
      vehicle_number TEXT,
      vehicle_type TEXT,
      shop_id INTEGER,
      shop_name TEXT,
      shop_address TEXT,
      shop_contact TEXT,
      delivery_address TEXT,
      route_id INTEGER,
      route_name TEXT,
      salesman_id INTEGER,
      salesman_name TEXT,
      receiver_name TEXT,
      receiver_signature TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'delivered', 'returned', 'cancelled')),
      total_items INTEGER DEFAULT 0,
      total_quantity REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      discount_percentage REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_percentage REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      shipping_charges REAL DEFAULT 0,
      other_charges REAL DEFAULT 0,
      round_off REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      notes TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (route_id) REFERENCES routes(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Delivery Items table (Professional delivery items with all charges)
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT,
      product_code TEXT,
      quantity_ordered INTEGER NOT NULL DEFAULT 0,
      quantity_delivered INTEGER NOT NULL DEFAULT 0,
      quantity_returned INTEGER DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      discount_percentage REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      tax_percentage REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      batch_number TEXT,
      expiry_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Invoices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      shop_id INTEGER NOT NULL,
      delivery_id INTEGER,
      invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME,
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      balance_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partial', 'paid')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
    )
  `);

  // Invoice Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      discount_percentage REAL DEFAULT 0,
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE,
      shop_id INTEGER NOT NULL,
      invoice_id INTEGER,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bank', 'bank_transfer', 'cheque', 'online', 'credit')),
      reference_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  // Shop Ledger table (for tracking all shop transactions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL,
      shop_name TEXT,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      transaction_type TEXT CHECK(transaction_type IN ('invoice', 'payment', 'adjustment', 'opening_balance')),
      reference_type TEXT,
      reference_id INTEGER,
      reference_number TEXT,
      debit_amount REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0,
      balance REAL DEFAULT 0,
      description TEXT,
      notes TEXT,
      created_by INTEGER,
      created_by_name TEXT,
      is_manual INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Salesman Ledger table (for salary/payment records)
  db.exec(`
    CREATE TABLE IF NOT EXISTS salesman_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      salesman_id INTEGER NOT NULL,
      salesman_name TEXT,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      transaction_type TEXT CHECK(transaction_type IN ('salary', 'advance', 'deduction', 'commission', 'adjustment')) DEFAULT 'salary',
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bank_transfer', 'cheque', 'online')),
      reference_number TEXT,
      description TEXT,
      notes TEXT,
      created_by INTEGER,
      created_by_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Company Settings table — column names MUST match MySQL migration 009_company_settings.sql
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      -- Basic Company Information
      company_name          TEXT NOT NULL,
      company_address       TEXT,
      company_city          TEXT,
      company_state         TEXT,
      company_country       TEXT DEFAULT 'Pakistan',
      company_postal_code   TEXT,

      -- Contact Information
      company_phone         TEXT,
      company_mobile        TEXT,
      company_email         TEXT,
      company_website       TEXT,

      -- Legal & Tax Information
      company_tax_number          TEXT,
      company_registration_number TEXT,
      company_ntn                 TEXT,
      company_gst_number          TEXT,

      -- Primary Bank Account
      bank_name           TEXT,
      bank_account_title  TEXT,
      bank_account_number TEXT,
      bank_branch         TEXT,
      bank_iban           TEXT,
      bank_swift_code     TEXT,

      -- Secondary Bank Account
      bank_name_2           TEXT,
      bank_account_title_2  TEXT,
      bank_account_number_2 TEXT,
      bank_branch_2         TEXT,
      bank_iban_2           TEXT,

      -- Branding & Display
      company_logo_url     TEXT,
      company_slogan       TEXT,
      invoice_header_text  TEXT,
      invoice_footer_text  TEXT,

      -- Business Settings
      currency_symbol         TEXT DEFAULT 'Rs.',
      currency_code           TEXT DEFAULT 'PKR',
      default_tax_percentage  REAL DEFAULT 0,
      default_credit_days     INTEGER DEFAULT 30,

      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    )
  `);

  // Dashboard Stats View (for caching dashboard statistics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS _dashboard_stats (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_products INTEGER DEFAULT 0,
      active_products INTEGER DEFAULT 0,
      total_shops INTEGER DEFAULT 0,
      active_shops INTEGER DEFAULT 0,
      total_salesmen INTEGER DEFAULT 0,
      active_salesmen INTEGER DEFAULT 0,
      total_warehouses INTEGER DEFAULT 0,
      pending_orders INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default dashboard stats row
  db.exec(`
    INSERT OR IGNORE INTO _dashboard_stats (id, updated_at) VALUES (1, datetime('now'))
  `);

  // Create comprehensive dashboard view
  db.exec(`
    CREATE VIEW IF NOT EXISTS v_dashboard_stats AS
    SELECT 
      (SELECT COUNT(*) FROM products) as total_products,
      (SELECT COUNT(*) FROM products WHERE is_active = 1) as active_products,
      (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) as low_stock_count,
      (SELECT COUNT(*) FROM suppliers) as total_suppliers,
      (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as active_suppliers,
      (SELECT COUNT(*) FROM shops) as total_shops,
      (SELECT COUNT(*) FROM shops WHERE is_active = 1) as active_shops,
      (SELECT COUNT(*) FROM routes) as total_routes,
      (SELECT COUNT(*) FROM routes WHERE is_active = 1) as active_routes,
      (SELECT COUNT(*) FROM salesmen) as total_salesmen,
      (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as active_salesmen,
      (SELECT COUNT(*) FROM warehouses) as total_warehouses,
      (SELECT COUNT(*) FROM warehouses WHERE status = 'active') as active_warehouses,
      (SELECT COUNT(*) FROM orders) as total_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'placed') as pending_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'delivered') as completed_orders,
      (SELECT COUNT(*) FROM deliveries) as total_deliveries,
      (SELECT COUNT(*) FROM deliveries WHERE status = 'pending') as pending_deliveries,
      (SELECT COUNT(*) FROM deliveries WHERE status = 'in_transit') as in_transit_deliveries,
      (SELECT COUNT(*) FROM deliveries WHERE status = 'delivered') as delivered_deliveries,
      (SELECT COUNT(*) FROM invoices) as total_invoices,
      (SELECT COUNT(*) FROM invoices WHERE status = 'unpaid') as unpaid_invoices,
      (SELECT COUNT(*) FROM invoices WHERE status = 'paid') as paid_invoices,
      (SELECT COUNT(*) FROM invoices WHERE status = 'partial') as partial_invoices,
      (SELECT COUNT(*) FROM load_sheets) as total_load_sheets,
      (SELECT COUNT(*) FROM load_sheets WHERE status = 'draft') as draft_load_sheets,
      (SELECT COUNT(*) FROM load_sheets WHERE status = 'loaded') as loaded_load_sheets,
      (SELECT COUNT(*) FROM load_sheets WHERE status = 'in_transit') as in_transit_load_sheets,
      0 as total_reserved_stock,
      0 as fully_reserved_count
  `);

  console.log('✅ Database schema initialized successfully');

  // MIGRATION: Add missing columns to existing tables
  // This handles existing databases that need schema updates
  migrateDeliveriesTable();
  migrateWarehousesTable();
  migrateOrdersTable(); // NEW: Add delivery tracking columns

  // MIGRATION: New feature tables and columns
  migrateNewFeatures();

  // MIGRATION: Expand company_settings with all frontend fields
  migrateCompanySettingsTable();

  // Check if admin user exists, if not create default admin
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(1);
  
  function migrateOrderItemsTableSchema() {
    console.log('🔄 Checking order_items table schema...');
    const orderItemColumns = [
      ['discount', 'REAL DEFAULT 0'],
      ['net_price', 'REAL DEFAULT 0'],
      ['unit_purchase_cost', 'REAL DEFAULT 0']
    ];
    let columnsAdded = 0;
    for (const [colName, colDef] of orderItemColumns) {
      if (safeAddColumn('order_items', colName, colDef)) {
        columnsAdded++;
      }
    }
    if (columnsAdded > 0) {
      console.log(`✅ Order Items schema migrated - added ${columnsAdded} columns`);
    }
  }
  migrateOrderItemsTableSchema();

  if (adminExists.count === 0) {
    console.log('👤 Creating default admin user...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    db.prepare(`
      INSERT INTO users (username, password, email, full_name, phone, role_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'admin@system.com', 'System Administrator', null, 1, 1);
    
    console.log('✅ Default admin created (username: admin, password: admin123)');
  }
}

// Initialize on load
initializeDatabase();

// Wrapper functions to match MySQL promise-based API
const dbWrapper = {
  // Convert parameters to SQLite-compatible types
  convertParams: (params) => {
    return params.map(param => {
      if (param instanceof Date) {
        return param.toISOString();
      }
      // Convert boolean to integer (0 or 1) for SQLite
      if (typeof param === 'boolean') {
        return param ? 1 : 0;
      }
      return param;
    });
  },

  execute: (query, params = []) => {
    return new Promise((resolve, reject) => {
      try {
        // Replace MySQL-specific functions with SQLite equivalents
        let sqliteQuery = query
          .replace(/NOW\(\)/gi, "datetime('now')")
          .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");
        
        // Convert Date objects to ISO strings
        const convertedParams = dbWrapper.convertParams(params);
        
        const stmt = db.prepare(sqliteQuery);
        
        if (sqliteQuery.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...convertedParams);
          resolve([rows, null]);
        } else {
          const info = stmt.run(...convertedParams);
          resolve([{ insertId: info.lastInsertRowid, affectedRows: info.changes }, null]);
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  query: function(query, params = []) {
    return this.execute(query, params);
  },

  // Transaction support
  beginTransaction: () => db.prepare('BEGIN TRANSACTION').run(),
  commit: () => db.prepare('COMMIT').run(),
  rollback: () => db.prepare('ROLLBACK').run(),

  // For compatibility with MySQL connection pool API
  getConnection: async () => {
    // Return a connection-like object with transaction support
    return {
      query: async (query, params = []) => {
        return dbWrapper.execute(query, params);
      },
      beginTransaction: async () => {
        db.prepare('BEGIN TRANSACTION').run();
      },
      commit: async () => {
        db.prepare('COMMIT').run();
      },
      rollback: async () => {
        db.prepare('ROLLBACK').run();
      },
      release: () => {
        // No-op for SQLite (no connection pooling needed)
      }
    };
  }
};

module.exports = dbWrapper;

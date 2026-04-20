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
      cnic TEXT,
      address TEXT,
      city TEXT,
      joining_date DATETIME,
      monthly_target REAL DEFAULT 0,
      commission_rate REAL DEFAULT 0,
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

  // Warehouses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      manager_name TEXT,
      contact TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Warehouse Stock table
  db.exec(`
    CREATE TABLE IF NOT EXISTS warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
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
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_amount REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'placed' CHECK(status IN ('placed', 'approved', 'rejected', 'delivered')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
      FOREIGN KEY (salesman_id) REFERENCES users(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
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

  // Deliveries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challan_number TEXT UNIQUE NOT NULL,
      order_id INTEGER NOT NULL,
      load_sheet_id INTEGER,
      delivery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      receiver_name TEXT,
      receiver_signature TEXT,
      notes TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'delivered', 'returned')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id)
    )
  `);

  // Delivery Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity_ordered INTEGER NOT NULL,
      quantity_delivered INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
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
      receipt_number TEXT UNIQUE NOT NULL,
      shop_id INTEGER NOT NULL,
      invoice_id INTEGER,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'bank', 'cheque', 'online')),
      reference_number TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    )
  `);

  // Company Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      address TEXT,
      contact TEXT,
      email TEXT,
      website TEXT,
      tax_number TEXT,
      currency TEXT DEFAULT 'PKR',
      logo_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Check if admin user exists, if not create default admin
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role_id = ?').get(1);
  
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
};

module.exports = dbWrapper;

/**
 * SQLite Database Schema for Mobile App
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Define local SQLite database structure for offline data storage
 * Used by: React Native Mobile Application
 */

// Products Table Schema
export const CREATE_PRODUCTS_TABLE = `
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    product_code TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    pack_size TEXT,
    unit_price REAL NOT NULL DEFAULT 0.00,
    carton_price REAL DEFAULT 0.00,
    pieces_per_carton INTEGER DEFAULT 1,
    purchase_price REAL DEFAULT 0.00,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    supplier_id INTEGER,
    supplier_name TEXT,
    barcode TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    synced_at TEXT,
    last_modified TEXT
  );
`;

// Suppliers Table Schema
export const CREATE_SUPPLIERS_TABLE = `
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    opening_balance REAL DEFAULT 0.00,
    current_balance REAL DEFAULT 0.00,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    synced_at TEXT,
    last_modified TEXT
  );
`;

// Routes Table Schema
export const CREATE_ROUTES_TABLE = `
  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY,
    route_name TEXT NOT NULL,
    route_code TEXT UNIQUE,
    description TEXT,
    salesman_id INTEGER,
    salesman_name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    synced_at TEXT
  );
`;

// Shops Table Schema
export const CREATE_SHOPS_TABLE = `
  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY,
    shop_code TEXT NOT NULL UNIQUE,
    shop_name TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    route_id INTEGER,
    route_name TEXT,
    credit_limit REAL DEFAULT 0.00,
    opening_balance REAL DEFAULT 0.00,
    current_balance REAL DEFAULT 0.00,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    synced_at TEXT,
    last_modified TEXT,
    FOREIGN KEY (route_id) REFERENCES routes(id)
  );
`;

// Salesmen Table Schema - Sprint 4
export const CREATE_SALESMEN_TABLE = `
  CREATE TABLE IF NOT EXISTS salesmen (
    id INTEGER PRIMARY KEY,
    salesman_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    cnic TEXT,
    city TEXT,
    address TEXT,
    username TEXT UNIQUE,
    route_id INTEGER,
    route_name TEXT,
    monthly_target REAL DEFAULT 0.00,
    achieved_sales REAL DEFAULT 0.00,
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT,
    synced_at TEXT,
    last_modified TEXT,
    FOREIGN KEY (route_id) REFERENCES routes(id)
  );
`;

// Orders Table Schema - Sprint 5
export const CREATE_ORDERS_TABLE = `
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE,
    salesman_id INTEGER NOT NULL,
    salesman_name TEXT,
    shop_id INTEGER NOT NULL,
    shop_name TEXT,
    route_id INTEGER,
    route_name TEXT,
    order_date TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    subtotal REAL DEFAULT 0.00,
    discount_amount REAL DEFAULT 0.00,
    discount_percentage REAL DEFAULT 0.00,
    tax_amount REAL DEFAULT 0.00,
    total_amount REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    synced INTEGER DEFAULT 0,
    synced_at TEXT,
    backend_id INTEGER,
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id),
    FOREIGN KEY (shop_id) REFERENCES shops(id),
    FOREIGN KEY (route_id) REFERENCES routes(id)
  );
`;

// Order Details Table Schema - Sprint 5
export const CREATE_ORDER_DETAILS_TABLE = `
  CREATE TABLE IF NOT EXISTS order_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_code TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    discount_amount REAL DEFAULT 0.00,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`;

// Sync Metadata Table - Track sync status
export const CREATE_SYNC_METADATA_TABLE = `
  CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL UNIQUE,
    last_sync_at TEXT,
    sync_status TEXT DEFAULT 'pending',
    total_records INTEGER DEFAULT 0,
    synced_records INTEGER DEFAULT 0,
    error_message TEXT
  );
`;

// Indexes for better performance
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);',
  'CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);',
  'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);',
  'CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);',
  'CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);',
  'CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);',
  'CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_shops_code ON shops(shop_code);',
  'CREATE INDEX IF NOT EXISTS idx_shops_route ON shops(route_id);',
  'CREATE INDEX IF NOT EXISTS idx_shops_active ON shops(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_salesmen_code ON salesmen(salesman_code);',
  'CREATE INDEX IF NOT EXISTS idx_salesmen_username ON salesmen(username);',
  'CREATE INDEX IF NOT EXISTS idx_salesmen_active ON salesmen(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);',
  'CREATE INDEX IF NOT EXISTS idx_orders_salesman ON orders(salesman_id);',
  'CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);',
  'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);',
  'CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);',
  'CREATE INDEX IF NOT EXISTS idx_orders_synced ON orders(synced);',
  'CREATE INDEX IF NOT EXISTS idx_order_details_order ON order_details(order_id);',
  'CREATE INDEX IF NOT EXISTS idx_order_details_product ON order_details(product_id);',
];

// All table creation statements
export const ALL_TABLES = [
  CREATE_PRODUCTS_TABLE,
  CREATE_SUPPLIERS_TABLE,
  CREATE_ROUTES_TABLE,
  CREATE_SHOPS_TABLE,
  CREATE_SALESMEN_TABLE,
  CREATE_ORDERS_TABLE,
  CREATE_ORDER_DETAILS_TABLE,
  CREATE_SYNC_METADATA_TABLE,
];

// Initialize sync metadata
export const INIT_SYNC_METADATA = `
  INSERT OR IGNORE INTO sync_metadata (table_name, sync_status) VALUES 
  ('products', 'pending'),
  ('suppliers', 'pending'),
  ('routes', 'pending'),
  ('shops', 'pending'),
  ('salesmen', 'pending'),
  ('orders', 'pending');
`;

// Database version for migrations
export const DATABASE_VERSION = 3;
export const DATABASE_NAME = 'distribution_system.db';

// Table names constants
export const TABLES = {
  PRODUCTS: 'products',
  SUPPLIERS: 'suppliers',
  ROUTES: 'routes',
  SHOPS: 'shops',
  SALESMEN: 'salesmen',
  ORDERS: 'orders',
  ORDER_DETAILS: 'order_details',
  SYNC_METADATA: 'sync_metadata',
};

// Order status constants - Sprint 5
export const ORDER_STATUS = {
  DRAFT: 'draft',
  PLACED: 'placed',
  APPROVED: 'approved',
  FINALIZED: 'finalized',
  REJECTED: 'rejected',
  DELIVERED: 'delivered',
};

// Sync status constants
export const SYNC_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

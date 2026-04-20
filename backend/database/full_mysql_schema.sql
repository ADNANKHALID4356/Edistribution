-- =====================================================
-- DISTRIBUTION SYSTEM - COMPLETE MYSQL DATABASE SCHEMA
-- For Production VPS Server
-- Company: Ummahtechinnovations.com
-- Date: January 28, 2026
-- =====================================================

-- Disable foreign key checks during migration
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- =====================================================
-- DROP ALL EXISTING TABLES (Clean Slate)
-- =====================================================
DROP TABLE IF EXISTS sync_statistics;
DROP TABLE IF EXISTS sync_queue;
DROP TABLE IF EXISTS sync_conflicts;
DROP TABLE IF EXISTS sync_logs;
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS shop_ledger;
DROP TABLE IF EXISTS invoice_payments;
DROP TABLE IF EXISTS invoice_details;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS delivery_items;
DROP TABLE IF EXISTS deliveries;
DROP TABLE IF EXISTS load_sheet_items;
DROP TABLE IF EXISTS load_sheet_deliveries;
DROP TABLE IF EXISTS load_sheets;
DROP TABLE IF EXISTS order_details;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS warehouse_stock;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS shops;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS salesmen;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS company_settings;
DROP TABLE IF EXISTS _dashboard_stats;

-- Also drop SQLite-named tables if they exist
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS payments;

-- Drop views
DROP VIEW IF EXISTS v_dashboard_stats;
DROP VIEW IF EXISTS v_salesmen_summary;
DROP VIEW IF EXISTS vw_invoice_complete;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Roles Table
CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  permissions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users Table
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role_id INT NOT NULL DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessions Table
CREATE TABLE sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token TEXT NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(50),
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Company Settings Table
CREATE TABLE company_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL,
  address TEXT,
  contact VARCHAR(50),
  email VARCHAR(100),
  website VARCHAR(200),
  tax_number VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'PKR',
  logo_path VARCHAR(500),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- MASTER DATA TABLES
-- =====================================================

-- Suppliers Table
CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_code VARCHAR(50),
  supplier_name VARCHAR(200) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  opening_balance DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products Table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(50),
  product_name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  brand VARCHAR(100),
  pack_size VARCHAR(50),
  unit_price DECIMAL(15,2) NOT NULL,
  carton_price DECIMAL(15,2),
  pieces_per_carton INT DEFAULT 1,
  purchase_price DECIMAL(15,2),
  stock_quantity DECIMAL(15,2) DEFAULT 0,
  reserved_stock DECIMAL(15,2) DEFAULT 0,
  reorder_level DECIMAL(15,2) DEFAULT 0,
  supplier_id INT,
  barcode VARCHAR(100),
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_product_code (product_code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Routes Table
CREATE TABLE routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_name VARCHAR(100) NOT NULL,
  route_code VARCHAR(50),
  area VARCHAR(100),
  city VARCHAR(100),
  description TEXT,
  salesman_id INT,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Warehouses Table
CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  location TEXT,
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  postal_code VARCHAR(20),
  manager_name VARCHAR(100),
  manager_phone VARCHAR(20),
  contact VARCHAR(20),
  contact_number VARCHAR(20),
  email VARCHAR(100),
  capacity INT DEFAULT 0,
  storage_type VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'active',
  is_default TINYINT(1) DEFAULT 0,
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Salesmen Table
CREATE TABLE salesmen (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  salesman_code VARCHAR(50),
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  cnic VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  hire_date DATETIME,
  monthly_target DECIMAL(15,2) DEFAULT 0,
  commission_percentage DECIMAL(5,2) DEFAULT 0,
  vehicle_number VARCHAR(50),
  license_number VARCHAR(50),
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update routes table to add salesman foreign key
ALTER TABLE routes ADD FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL;

-- Shops Table
CREATE TABLE shops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_code VARCHAR(50),
  shop_name VARCHAR(200) NOT NULL,
  owner_name VARCHAR(100),
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  area VARCHAR(100),
  route_id INT,
  credit_limit DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  last_transaction_date DATETIME,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  shop_type VARCHAR(50),
  business_license VARCHAR(100),
  tax_registration VARCHAR(100),
  notes TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  INDEX idx_is_active (is_active),
  INDEX idx_route_id (route_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Warehouse Stock Table
CREATE TABLE warehouse_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  warehouse_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 0,
  reserved_quantity INT DEFAULT 0,
  min_stock_level INT DEFAULT 0,
  max_stock_level INT DEFAULT 0,
  reorder_point INT DEFAULT 0,
  location_in_warehouse VARCHAR(100),
  batch_number VARCHAR(100),
  expiry_date DATE,
  notes TEXT,
  created_by INT,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY unique_warehouse_product (warehouse_id, product_id),
  INDEX idx_warehouse_id (warehouse_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- TRANSACTION TABLES
-- =====================================================

-- Orders Table (MySQL Schema with sync columns)
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  shop_id INT NOT NULL,
  salesman_id INT NOT NULL,
  warehouse_id INT,
  route_id INT,
  order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  status ENUM('draft', 'placed', 'approved', 'finalized', 'rejected', 'delivered') DEFAULT 'placed',
  notes TEXT,
  -- Delivery tracking columns (NEW - replaces invoice tracking)
  delivery_status ENUM('pending', 'partial', 'delivered') DEFAULT 'pending',
  delivery_generated TINYINT(1) DEFAULT 0,
  -- Sync columns for mobile
  is_synced TINYINT(1) DEFAULT 0,
  sync_status ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
  sync_error TEXT,
  mobile_order_id VARCHAR(100),
  stock_reserved TINYINT(1) DEFAULT 0,
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  synced_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id),
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  INDEX idx_order_number (order_number),
  INDEX idx_shop_id (shop_id),
  INDEX idx_salesman_id (salesman_id),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date),
  INDEX idx_is_synced (is_synced),
  INDEX idx_mobile_order_id (mobile_order_id),
  INDEX idx_delivery_status (delivery_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order Details Table (MySQL naming convention)
CREATE TABLE order_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  net_price DECIMAL(15,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Load Sheets Table
CREATE TABLE load_sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_sheet_number VARCHAR(50) NOT NULL UNIQUE,
  salesman_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  load_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Load Sheet Items Table
CREATE TABLE load_sheet_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_sheet_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Load Sheet Deliveries Table
CREATE TABLE load_sheet_deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  load_sheet_id INT NOT NULL,
  delivery_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoices Table (MySQL Schema)
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  order_id INT,
  shop_id INT NOT NULL,
  shop_name VARCHAR(255),
  salesman_id INT,
  salesman_name VARCHAR(255),
  delivery_id INT,
  -- Financial Details
  subtotal DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  -- Payment Details
  paid_amount DECIMAL(15,2) DEFAULT 0,
  balance_amount DECIMAL(15,2) DEFAULT 0,
  payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
  status ENUM('draft', 'issued', 'cancelled', 'unpaid', 'partial', 'paid') DEFAULT 'issued',
  payment_type ENUM('cash', 'credit', 'bank_transfer', 'cheque') DEFAULT 'credit',
  -- Dates
  invoice_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME,
  notes TEXT,
  terms_conditions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id),
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_shop_id (shop_id),
  INDEX idx_payment_status (payment_status),
  INDEX idx_invoice_date (invoice_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoice Details Table (MySQL naming convention)
CREATE TABLE invoice_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255),
  product_code VARCHAR(100),
  quantity DECIMAL(15,2) NOT NULL,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Invoice Payments Table (MySQL naming convention)
CREATE TABLE invoice_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  receipt_number VARCHAR(50),
  payment_amount DECIMAL(15,2) NOT NULL,
  amount DECIMAL(15,2),
  payment_method ENUM('cash', 'credit', 'bank_transfer', 'cheque') DEFAULT 'cash',
  payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  reference_number VARCHAR(100),
  bank_name VARCHAR(255),
  cheque_number VARCHAR(100),
  cheque_date DATE,
  notes TEXT,
  received_by VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Deliveries Table
CREATE TABLE deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  challan_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_id INT,
  order_id INT,
  warehouse_id INT,
  load_sheet_id INT,
  delivery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  expected_delivery_time VARCHAR(50),
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  driver_cnic VARCHAR(20),
  vehicle_number VARCHAR(50),
  vehicle_type VARCHAR(50),
  shop_id INT,
  shop_name VARCHAR(200),
  shop_address TEXT,
  shop_contact VARCHAR(20),
  delivery_address TEXT,
  route_id INT,
  route_name VARCHAR(100),
  salesman_id INT,
  salesman_name VARCHAR(100),
  receiver_name VARCHAR(100),
  receiver_signature TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  total_items INT DEFAULT 0,
  total_quantity DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  shipping_charges DECIMAL(15,2) DEFAULT 0,
  other_charges DECIMAL(15,2) DEFAULT 0,
  round_off DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE SET NULL,
  FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id) ON DELETE SET NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL,
  INDEX idx_shop_id (shop_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key for delivery_id in invoices
ALTER TABLE invoices ADD FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL;

-- Delivery Items Table
CREATE TABLE delivery_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  delivery_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200),
  product_code VARCHAR(50),
  quantity_ordered INT NOT NULL,
  quantity_delivered INT NOT NULL,
  quantity_returned INT DEFAULT 0,
  unit_price DECIMAL(15,2) NOT NULL,
  total_price DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  net_amount DECIMAL(15,2) DEFAULT 0,
  batch_number VARCHAR(100),
  expiry_date DATE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_delivery_id (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Shop Ledger Table
CREATE TABLE shop_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shop_id INT NOT NULL,
  shop_name VARCHAR(200),
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  transaction_type VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id INT,
  reference_number VARCHAR(100),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  notes TEXT,
  created_by INT,
  created_by_name VARCHAR(100),
  is_manual TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_shop_id (shop_id),
  INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Stock Movements Table
CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT,
  movement_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(15,2) NOT NULL,
  stock_before DECIMAL(15,2),
  stock_after DECIMAL(15,2),
  reserved_before DECIMAL(15,2),
  reserved_after DECIMAL(15,2),
  available_before DECIMAL(15,2),
  available_after DECIMAL(15,2),
  reference_type VARCHAR(50),
  reference_id INT,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_product_id (product_id),
  INDEX idx_movement_type (movement_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SYNC TABLES (for Mobile App)
-- =====================================================

-- Sync Logs Table
CREATE TABLE sync_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesman_id INT,
  entity_type VARCHAR(50),
  action VARCHAR(50),
  status VARCHAR(20),
  records_count INT DEFAULT 0,
  sync_duration INT,
  device_info TEXT,
  error_message TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_salesman_id (salesman_id),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sync Queue Table
CREATE TABLE sync_queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50),
  entity_id INT,
  action VARCHAR(50),
  data TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sync Conflicts Table
CREATE TABLE sync_conflicts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50),
  entity_id INT,
  server_data TEXT,
  mobile_data TEXT,
  resolution VARCHAR(50),
  resolved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sync Statistics Table
CREATE TABLE sync_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesman_id INT,
  date DATE,
  total_syncs INT DEFAULT 0,
  successful_syncs INT DEFAULT 0,
  failed_syncs INT DEFAULT 0,
  total_orders INT DEFAULT 0,
  avg_sync_duration INT,
  UNIQUE KEY unique_salesman_date (salesman_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dashboard Stats Table (Cache)
CREATE TABLE _dashboard_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  total_products INT DEFAULT 0,
  active_products INT DEFAULT 0,
  total_shops INT DEFAULT 0,
  active_shops INT DEFAULT 0,
  total_salesmen INT DEFAULT 0,
  active_salesmen INT DEFAULT 0,
  total_warehouses INT DEFAULT 0,
  active_warehouses INT DEFAULT 0,
  pending_orders INT DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- VIEWS
-- =====================================================

-- Dashboard Stats View
CREATE VIEW v_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM products) as total_products,
  (SELECT COUNT(*) FROM products WHERE is_active = 1) as active_products,
  (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level AND stock_quantity > 0) as low_stock_count,
  (SELECT COUNT(*) FROM shops) as total_shops,
  (SELECT COUNT(*) FROM shops WHERE is_active = 1) as active_shops,
  (SELECT COUNT(*) FROM salesmen) as total_salesmen,
  (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as active_salesmen,
  (SELECT COUNT(*) FROM warehouses) as total_warehouses,
  (SELECT COUNT(*) FROM warehouses WHERE status = 'active') as active_warehouses,
  (SELECT COUNT(*) FROM orders WHERE status = 'placed') as pending_orders,
  (SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE DATE(order_date) = CURDATE()) as today_sales,
  (SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE MONTH(order_date) = MONTH(CURDATE()) AND YEAR(order_date) = YEAR(CURDATE())) as monthly_sales;

-- Salesmen Summary View
CREATE VIEW v_salesmen_summary AS
SELECT 
  s.id,
  s.salesman_code,
  s.full_name,
  s.phone,
  s.monthly_target,
  s.is_active,
  COALESCE(SUM(o.net_amount), 0) as achieved_sales,
  COUNT(DISTINCT o.id) as total_orders,
  r.route_name
FROM salesmen s
LEFT JOIN orders o ON s.id = o.salesman_id AND MONTH(o.order_date) = MONTH(CURDATE())
LEFT JOIN routes r ON r.salesman_id = s.id
GROUP BY s.id;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- SEED DATA
-- =====================================================

-- Roles
INSERT INTO roles (id, role_name, description, permissions) VALUES
(1, 'Admin', 'Full system access', 'all'),
(2, 'Manager', 'Office management access', 'manage_orders,manage_inventory,view_reports'),
(3, 'Salesman', 'Field salesman access', 'create_orders,view_own_orders,view_products'),
(4, 'Viewer', 'Read-only access', 'view_only');

-- Default Admin User (password: admin123)
INSERT INTO users (id, username, password, email, full_name, phone, role_id, is_active) VALUES
(1, 'admin', '$2b$10$1VlDgPmzdM08zf907Qm0/O4/3XKxqIaU8Uy/fcbwwzMOcU9G33k/2', 'admin@ummahtechinnovations.com', 'System Administrator', '+92-300-1234567', 1, 1);

-- Company Settings
INSERT INTO company_settings (company_name, address, contact, email, website, currency) VALUES
('Ummahtechinnovations', 'Lahore, Pakistan', '+92-300-1234567', 'info@ummahtechinnovations.com', 'ummahtechinnovations.com', 'PKR');

-- Dashboard Stats Initial Record
INSERT INTO _dashboard_stats (total_products, active_products, total_shops, active_shops, total_salesmen, active_salesmen, total_warehouses, pending_orders) VALUES
(0, 0, 0, 0, 0, 0, 0, 0);

-- Default Warehouse
INSERT INTO warehouses (id, code, name, location, city, status, is_default) VALUES
(1, 'WH001', 'Main Warehouse', 'Lahore', 'Lahore', 'active', 1);

SELECT 'MySQL Database Schema Created Successfully!' AS status;

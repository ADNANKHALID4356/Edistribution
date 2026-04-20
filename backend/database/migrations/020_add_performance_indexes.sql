/**
 * Database Migration: Add Performance Indexes
 * Comprehensive indexing strategy for optimal query performance
 * 
 * Indexes are created based on:
 * - Common WHERE clause columns
 * - JOIN conditions
 * - ORDER BY columns
 * - Foreign key relationships
 */

-- ============================================
-- USERS & AUTHENTICATION INDEXES
-- ============================================

-- Fast user lookup by username (login)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Fast user lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Filter active users efficiently
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, role_id);

-- Fast session validation
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, expires_at);

-- ============================================
-- PRODUCTS & INVENTORY INDEXES
-- ============================================

-- Fast product search
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(product_name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Category and brand filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, is_active);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand, is_active);

-- Stock level queries
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity, is_active);
CREATE INDEX IF NOT EXISTS idx_products_reorder ON products(reorder_level, stock_quantity);

-- Supplier relationship
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id, is_active);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_products_search ON products(is_active, category, brand, created_at);

-- ============================================
-- SUPPLIERS INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(supplier_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active, city);

-- ============================================
-- ROUTES & SHOPS INDEXES
-- ============================================

-- Route lookups
CREATE INDEX IF NOT EXISTS idx_routes_code ON routes(route_code);
CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(is_active, city);

-- Shop search and filtering
CREATE INDEX IF NOT EXISTS idx_shops_code ON shops(shop_code);
CREATE INDEX IF NOT EXISTS idx_shops_name ON shops(shop_name);
CREATE INDEX IF NOT EXISTS idx_shops_route ON shops(route_id, is_active);
CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city, is_active);

-- Credit limit monitoring
CREATE INDEX IF NOT EXISTS idx_shops_balance ON shops(current_balance, credit_limit);

-- GPS coordinates for location queries
CREATE INDEX IF NOT EXISTS idx_shops_location ON shops(latitude, longitude);

-- ============================================
-- SALESMEN INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_salesmen_code ON salesmen(salesman_code);
CREATE INDEX IF NOT EXISTS idx_salesmen_user ON salesmen(user_id);
CREATE INDEX IF NOT EXISTS idx_salesmen_active ON salesmen(is_active, city);

-- Route assignments
CREATE INDEX IF NOT EXISTS idx_route_salesmen_route ON route_salesmen(route_id, salesman_id);
CREATE INDEX IF NOT EXISTS idx_route_salesmen_salesman ON route_salesmen(salesman_id, is_active);

-- ============================================
-- ORDERS INDEXES
-- ============================================

-- Order number lookup (unique but indexed for speed)
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

-- Status-based queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);

-- Salesman orders
CREATE INDEX IF NOT EXISTS idx_orders_salesman ON orders(salesman_id, order_date DESC);

-- Shop orders
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id, order_date DESC);

-- Route orders
CREATE INDEX IF NOT EXISTS idx_orders_route ON orders(route_id, order_date DESC);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date DESC);

-- Composite for dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_dashboard ON orders(status, order_date DESC, salesman_id);

-- Sync tracking
CREATE INDEX IF NOT EXISTS idx_orders_sync ON orders(synced, salesman_id);

-- Mobile order tracking
CREATE INDEX IF NOT EXISTS idx_orders_mobile ON orders(mobile_order_id, salesman_id);

-- Order items for aggregations
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ============================================
-- INVOICES INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_shop ON invoices(shop_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);

-- Due date tracking
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date, payment_status);

-- Payment amount queries
CREATE INDEX IF NOT EXISTS idx_invoices_balance ON invoices(balance_due, payment_status);

-- Invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items(product_id);

-- ============================================
-- WAREHOUSES & STOCK INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(is_active);

-- Stock movements (critical for performance)
CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse ON stock_movements(warehouse_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id, movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type, created_at DESC);

-- Reserved stock
CREATE INDEX IF NOT EXISTS idx_reserved_stock_product ON reserved_stock(product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_reserved_stock_order ON reserved_stock(order_id);

-- Warehouse stock composite
CREATE INDEX IF NOT EXISTS idx_warehouse_stock_lookup ON warehouse_stock(warehouse_id, product_id);

-- ============================================
-- DELIVERIES & LOAD SHEETS INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deliveries_challan ON deliveries(challan_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_invoice ON deliveries(invoice_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status, delivery_date DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_warehouse ON deliveries(warehouse_id, delivery_date DESC);

-- Delivery items
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_product ON delivery_items(product_id);

-- Load sheets
CREATE INDEX IF NOT EXISTS idx_loadsheets_number ON load_sheets(load_sheet_number);
CREATE INDEX IF NOT EXISTS idx_loadsheets_salesman ON load_sheets(salesman_id, load_date DESC);
CREATE INDEX IF NOT EXISTS idx_loadsheets_warehouse ON load_sheets(warehouse_id, load_date DESC);
CREATE INDEX IF NOT EXISTS idx_loadsheets_status ON load_sheets(status, load_date DESC);

-- Load sheet items
CREATE INDEX IF NOT EXISTS idx_loadsheet_items_sheet ON load_sheet_items(load_sheet_id);
CREATE INDEX IF NOT EXISTS idx_loadsheet_items_product ON load_sheet_items(product_id);

-- ============================================
-- SYNC & MOBILE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sync_logs_salesman ON sync_logs(salesman_id, sync_date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_entity ON sync_logs(entity_type, sync_status);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_sync_queue_salesman ON sync_queue(salesman_id, created_at);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_salesman ON sync_conflicts(salesman_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity ON sync_conflicts(entity_type, entity_id);

-- ============================================
-- PAYMENTS INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payments_shop ON payments(shop_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- ============================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ============================================

-- Dashboard active entities count
CREATE INDEX IF NOT EXISTS idx_active_products_count ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_active_shops_count ON shops(is_active);
CREATE INDEX IF NOT EXISTS idx_active_salesmen_count ON salesmen(is_active);
CREATE INDEX IF NOT EXISTS idx_active_warehouses_count ON warehouses(is_active);

-- Date range queries with status
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(order_date, status);
CREATE INDEX IF NOT EXISTS idx_invoices_date_status ON invoices(invoice_date, payment_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_date_status ON deliveries(delivery_date, status);

-- Performance monitoring
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updated_at DESC);

-- ============================================
-- FULL-TEXT SEARCH INDEXES (MySQL only)
-- ============================================
-- Note: These are for MySQL. For SQLite, they will be ignored gracefully

-- Product search
CREATE FULLTEXT INDEX IF NOT EXISTS idx_products_fulltext 
ON products(product_name, product_code, barcode, description);

-- Shop search
CREATE FULLTEXT INDEX IF NOT EXISTS idx_shops_fulltext 
ON shops(shop_name, owner_name, address);

-- Supplier search
CREATE FULLTEXT INDEX IF NOT EXISTS idx_suppliers_fulltext 
ON suppliers(supplier_name, contact_person);

-- ============================================
-- CLEANUP OLD INDEXES (if any inefficient ones exist)
-- ============================================

-- Drop any duplicate or inefficient indexes here
-- Example:
-- DROP INDEX IF EXISTS old_inefficient_index ON table_name;

-- ============================================
-- INDEX STATISTICS
-- ============================================

SELECT 'Performance indexes created successfully!' as status;
SELECT COUNT(*) as total_indexes FROM information_schema.statistics 
WHERE table_schema = DATABASE();

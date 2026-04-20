-- Migration: Sprint 8 - Delivery Challan & Warehouse Management
-- Date: November 24, 2025
-- Purpose: Support delivery tracking, warehouse management, and load sheets

-- ============================================
-- 1. WAREHOUSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS warehouses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    
    -- Location Details
    address TEXT,
    city VARCHAR(100),
    area VARCHAR(100),
    postal_code VARCHAR(20),
    
    -- Contact Information
    manager_name VARCHAR(255),
    manager_phone VARCHAR(50),
    contact_number VARCHAR(50),
    email VARCHAR(255),
    
    -- Warehouse Specs
    capacity DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Total capacity in square meters or units',
    storage_type VARCHAR(50) DEFAULT 'general' COMMENT 'general, cold_storage, hazardous',
    
    -- Status
    status ENUM('active', 'inactive', 'maintenance') DEFAULT 'active',
    is_default BOOLEAN DEFAULT FALSE COMMENT 'Mark as default warehouse',
    
    -- Additional Info
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_warehouse_status (status),
    INDEX idx_warehouse_city (city),
    INDEX idx_warehouse_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. WAREHOUSE STOCK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_stock (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    warehouse_id INT NOT NULL,
    product_id INT NOT NULL,
    
    -- Stock Levels
    quantity DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    reserved_quantity DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Quantity reserved for pending deliveries',
    available_quantity DECIMAL(12, 2) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    
    -- Thresholds
    minimum_stock DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Reorder level',
    maximum_stock DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Maximum stock level',
    
    -- Location in Warehouse
    rack_number VARCHAR(50),
    bin_location VARCHAR(50),
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_warehouse_product (warehouse_id, product_id),
    INDEX idx_stock_warehouse (warehouse_id),
    INDEX idx_stock_product (product_id),
    INDEX idx_stock_available (available_quantity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. DELIVERIES TABLE (Delivery Challans)
-- ============================================
CREATE TABLE IF NOT EXISTS deliveries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Reference
    challan_number VARCHAR(100) UNIQUE NOT NULL COMMENT 'Auto-generated: DC-YYYYMMDD-XXXX',
    invoice_id INT COMMENT 'Link to invoice if delivery is for an invoice',
    order_id INT COMMENT 'Link to order',
    warehouse_id INT NOT NULL,
    
    -- Delivery Details
    delivery_date DATE NOT NULL,
    expected_delivery_time TIME,
    actual_delivery_time TIME,
    
    -- Vehicle & Driver
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    driver_cnic VARCHAR(50),
    vehicle_number VARCHAR(50),
    vehicle_type VARCHAR(50) COMMENT 'truck, van, bike, etc.',
    
    -- Customer/Destination
    shop_id INT,
    shop_name VARCHAR(255),
    shop_address TEXT,
    shop_contact VARCHAR(50),
    delivery_address TEXT COMMENT 'Alternative delivery address if different from shop',
    
    -- Route Information
    route_id INT,
    route_name VARCHAR(255),
    salesman_id INT,
    salesman_name VARCHAR(255),
    
    -- Status Tracking
    status ENUM('pending', 'in_transit', 'delivered', 'returned', 'cancelled') DEFAULT 'pending',
    
    -- Amounts
    total_items INT DEFAULT 0,
    total_quantity DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Signature & Proof
    received_by VARCHAR(255) COMMENT 'Name of person who received',
    received_at TIMESTAMP NULL COMMENT 'Actual delivery timestamp',
    signature_url TEXT COMMENT 'URL to signature image',
    proof_of_delivery_url TEXT COMMENT 'URL to delivery proof photo',
    
    -- Notes
    notes TEXT COMMENT 'Special delivery instructions',
    remarks TEXT COMMENT 'Delivery remarks/issues',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE SET NULL,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_delivery_challan (challan_number),
    INDEX idx_delivery_status (status),
    INDEX idx_delivery_date (delivery_date),
    INDEX idx_delivery_invoice (invoice_id),
    INDEX idx_delivery_order (order_id),
    INDEX idx_delivery_warehouse (warehouse_id),
    INDEX idx_delivery_shop (shop_id),
    INDEX idx_delivery_route (route_id),
    INDEX idx_delivery_driver (driver_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. DELIVERY ITEMS TABLE (Challan Details)
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    delivery_id INT NOT NULL,
    product_id INT NOT NULL,
    
    -- Product Info (denormalized for historical record)
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    
    -- Quantities
    quantity_ordered DECIMAL(12, 2) NOT NULL COMMENT 'Original order quantity',
    quantity_delivered DECIMAL(12, 2) NOT NULL COMMENT 'Actual delivered quantity',
    quantity_returned DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Returned quantity',
    
    -- Pricing (optional - may not show on challan)
    unit_price DECIMAL(12, 2) DEFAULT 0.00,
    total_price DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Batch/Serial Tracking
    batch_number VARCHAR(100),
    serial_numbers TEXT COMMENT 'JSON array of serial numbers',
    expiry_date DATE,
    
    -- Notes
    notes TEXT COMMENT 'Item-specific delivery notes',
    
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    
    INDEX idx_delivery_item_delivery (delivery_id),
    INDEX idx_delivery_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. STOCK MOVEMENTS TABLE (Inventory Transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    warehouse_id INT NOT NULL,
    product_id INT NOT NULL,
    
    -- Movement Details
    movement_type ENUM(
        'purchase', 'sale', 'transfer', 'adjustment', 
        'return', 'damage', 'delivery', 'production'
    ) NOT NULL,
    
    quantity DECIMAL(12, 2) NOT NULL COMMENT 'Positive for IN, Negative for OUT',
    
    -- Reference Documents
    reference_type VARCHAR(50) COMMENT 'invoice, order, delivery, purchase, etc.',
    reference_id INT COMMENT 'ID of the reference document',
    reference_number VARCHAR(100) COMMENT 'Document number',
    
    -- Stock Levels After Movement
    quantity_before DECIMAL(12, 2) DEFAULT 0.00,
    quantity_after DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Additional Info
    unit_cost DECIMAL(12, 2) DEFAULT 0.00,
    notes TEXT,
    
    -- Metadata
    movement_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_movement_warehouse (warehouse_id),
    INDEX idx_movement_product (product_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_movement_date (movement_date),
    INDEX idx_movement_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. LOAD SHEETS TABLE (Consolidated Loading Plans)
-- ============================================
CREATE TABLE IF NOT EXISTS load_sheets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Reference
    load_sheet_number VARCHAR(100) UNIQUE NOT NULL COMMENT 'LS-YYYYMMDD-XXXX',
    
    -- Basic Info
    loading_date DATE NOT NULL,
    warehouse_id INT NOT NULL,
    
    -- Vehicle & Driver
    vehicle_number VARCHAR(50),
    driver_name VARCHAR(255),
    driver_phone VARCHAR(50),
    
    -- Route/Area Coverage
    route_id INT,
    route_name VARCHAR(255),
    salesman_id INT,
    salesman_name VARCHAR(255),
    
    -- Summary
    total_deliveries INT DEFAULT 0 COMMENT 'Number of delivery stops',
    total_products INT DEFAULT 0 COMMENT 'Number of unique products',
    total_quantity DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Total quantity of all products',
    total_weight DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Total weight in KG',
    total_value DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Total value of goods',
    
    -- Status
    status ENUM('draft', 'confirmed', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    
    -- Timestamps
    prepared_at TIMESTAMP NULL,
    loaded_at TIMESTAMP NULL,
    departed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_loadsheet_number (load_sheet_number),
    INDEX idx_loadsheet_date (loading_date),
    INDEX idx_loadsheet_warehouse (warehouse_id),
    INDEX idx_loadsheet_route (route_id),
    INDEX idx_loadsheet_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. LOAD SHEET DELIVERIES (Link to Deliveries)
-- ============================================
CREATE TABLE IF NOT EXISTS load_sheet_deliveries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    load_sheet_id INT NOT NULL,
    delivery_id INT NOT NULL,
    
    -- Sequence
    delivery_sequence INT DEFAULT 1 COMMENT 'Order of delivery on route',
    
    -- Status
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (load_sheet_id) REFERENCES load_sheets(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_loadsheet_delivery (load_sheet_id, delivery_id),
    INDEX idx_loadsheet_delivery_sheet (load_sheet_id),
    INDEX idx_loadsheet_delivery_delivery (delivery_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. TRIGGERS FOR AUTOMATIC CALCULATIONS
-- ============================================

-- Trigger: Auto-calculate delivery totals
DELIMITER //
CREATE TRIGGER after_delivery_item_insert
AFTER INSERT ON delivery_items
FOR EACH ROW
BEGIN
    UPDATE deliveries 
    SET 
        total_items = (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = NEW.delivery_id),
        total_quantity = (SELECT SUM(quantity_delivered) FROM delivery_items WHERE delivery_id = NEW.delivery_id),
        total_amount = (SELECT SUM(total_price) FROM delivery_items WHERE delivery_id = NEW.delivery_id)
    WHERE id = NEW.delivery_id;
END//

CREATE TRIGGER after_delivery_item_update
AFTER UPDATE ON delivery_items
FOR EACH ROW
BEGIN
    UPDATE deliveries 
    SET 
        total_items = (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = NEW.delivery_id),
        total_quantity = (SELECT SUM(quantity_delivered) FROM delivery_items WHERE delivery_id = NEW.delivery_id),
        total_amount = (SELECT SUM(total_price) FROM delivery_items WHERE delivery_id = NEW.delivery_id)
    WHERE id = NEW.delivery_id;
END//

CREATE TRIGGER after_delivery_item_delete
AFTER DELETE ON delivery_items
FOR EACH ROW
BEGIN
    UPDATE deliveries 
    SET 
        total_items = (SELECT COUNT(*) FROM delivery_items WHERE delivery_id = OLD.delivery_id),
        total_quantity = (SELECT COALESCE(SUM(quantity_delivered), 0) FROM delivery_items WHERE delivery_id = OLD.delivery_id),
        total_amount = (SELECT COALESCE(SUM(total_price), 0) FROM delivery_items WHERE delivery_id = OLD.delivery_id)
    WHERE id = OLD.delivery_id;
END//
DELIMITER ;

-- ============================================
-- 9. INSERT DEFAULT DATA
-- ============================================

-- Insert default main warehouse
INSERT INTO warehouses (name, code, address, city, manager_name, contact_number, status, is_default, created_at)
VALUES 
    ('Main Warehouse', 'WH-001', 'Main Office Location, City', 'Lahore', 'Warehouse Manager', '+92-XXX-XXXXXXX', 'active', TRUE, NOW()),
    ('Secondary Warehouse', 'WH-002', 'Secondary Location', 'Karachi', 'Manager 2', '+92-XXX-XXXXXXX', 'active', FALSE, NOW());

-- Create indexes for better query performance
CREATE INDEX idx_delivery_created_at ON deliveries(created_at);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_loadsheet_created_at ON load_sheets(created_at);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- Tables created: 7 main tables
-- - warehouses
-- - warehouse_stock  
-- - deliveries
-- - delivery_items
-- - stock_movements
-- - load_sheets
-- - load_sheet_deliveries
--
-- Features:
-- ✅ Warehouse management with capacity tracking
-- ✅ Real-time stock levels with reserved quantities
-- ✅ Delivery challan generation and tracking
-- ✅ Complete delivery lifecycle (pending → in_transit → delivered)
-- ✅ Stock movement history
-- ✅ Load sheet planning for vehicles
-- ✅ Driver and vehicle assignment
-- ✅ Proof of delivery support
-- ✅ Automatic calculations via triggers

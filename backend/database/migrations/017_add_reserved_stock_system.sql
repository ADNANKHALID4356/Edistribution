-- =====================================================
-- Migration: Reserved Stock Management System
-- Sprint: Stock Management Enhancement
-- Date: November 30, 2025
-- Purpose: Implement professional reserved stock tracking
--          to prevent overselling and manage stock lifecycle
-- =====================================================

USE distribution_system_db;

-- =====================================================
-- STEP 1: Add reserved_stock column to products table
-- =====================================================
-- Check if column exists and add if not
SET @dbname = 'distribution_system_db';
SET @tablename = 'products';
SET @columnname = 'reserved_stock';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column already exists' AS Status",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Stock reserved for pending orders' AFTER stock_quantity")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing products to have 0 reserved stock
UPDATE products SET reserved_stock = 0.00 WHERE reserved_stock IS NULL;

-- =====================================================
-- STEP 2: Create computed column helper (via view)
-- =====================================================
-- Drop existing view if it exists
DROP VIEW IF EXISTS vw_product_stock_status;

-- Create comprehensive stock status view
CREATE OR REPLACE VIEW vw_product_stock_status AS
SELECT 
    p.id,
    p.product_code,
    p.product_name,
    p.category,
    p.brand,
    p.stock_quantity,
    p.reserved_stock,
    (p.stock_quantity - p.reserved_stock) AS available_stock,
    p.reorder_level,
    
    -- Stock status indicators
    CASE 
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN (p.stock_quantity - p.reserved_stock) <= 0 THEN 'FULLY_RESERVED'
        WHEN (p.stock_quantity - p.reserved_stock) <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    
    -- Stock health metrics
    CASE 
        WHEN p.stock_quantity = 0 THEN 'CRITICAL'
        WHEN (p.stock_quantity - p.reserved_stock) <= 0 THEN 'CRITICAL'
        WHEN (p.stock_quantity - p.reserved_stock) <= p.reorder_level THEN 'WARNING'
        ELSE 'HEALTHY'
    END AS stock_health,
    
    -- Reservation percentage
    CASE 
        WHEN p.stock_quantity > 0 THEN ROUND((p.reserved_stock / p.stock_quantity) * 100, 2)
        ELSE 0
    END AS reservation_percentage,
    
    p.unit_price,
    p.carton_price,
    p.is_active,
    s.supplier_name,
    s.supplier_code
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id;

-- =====================================================
-- STEP 3: Enhance stock_movements table
-- =====================================================
-- Check if stock_movements table exists
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Product reference
    product_id INT NOT NULL,
    
    -- Movement details
    movement_type ENUM(
        'RESERVE',           -- Stock reserved for order
        'RELEASE',           -- Reserved stock released (order cancelled/rejected)
        'DEDUCT',            -- Actual stock deduction (order finalized)
        'PURCHASE',          -- Stock added from purchase
        'ADJUSTMENT',        -- Manual adjustment
        'RETURN',            -- Customer return
        'DAMAGE',            -- Damaged/expired stock removal
        'TRANSFER'           -- Warehouse transfer
    ) NOT NULL,
    
    -- Quantities
    quantity DECIMAL(12, 2) NOT NULL COMMENT 'Change amount (positive or negative)',
    
    -- Stock levels tracking
    stock_before DECIMAL(12, 2) NOT NULL COMMENT 'Stock quantity before movement',
    stock_after DECIMAL(12, 2) NOT NULL COMMENT 'Stock quantity after movement',
    reserved_before DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Reserved stock before movement',
    reserved_after DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Reserved stock after movement',
    available_before DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Available stock before movement',
    available_after DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Available stock after movement',
    
    -- Reference to source document
    reference_type VARCHAR(50) COMMENT 'order, delivery, invoice, purchase, etc.',
    reference_id INT COMMENT 'ID of the source document',
    reference_number VARCHAR(100) COMMENT 'Document number for display',
    
    -- Additional information
    notes TEXT,
    movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT COMMENT 'User who initiated the movement',
    
    -- Foreign keys
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_stock_product (product_id),
    INDEX idx_stock_movement_type (movement_type),
    INDEX idx_stock_date (movement_date),
    INDEX idx_stock_reference (reference_type, reference_id),
    INDEX idx_stock_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Audit trail for all stock movements including reservations';

-- =====================================================
-- STEP 4: Add order-level stock tracking
-- =====================================================
-- Add stock_reserved flag to orders table
SET @tablename = 'orders';
SET @columnname = 'stock_reserved';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column stock_reserved already exists' AS Status",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN DEFAULT FALSE COMMENT 'Whether stock has been reserved for this order' AFTER status")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add stock_deducted flag to orders table
SET @columnname = 'stock_deducted';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column stock_deducted already exists' AS Status",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " BOOLEAN DEFAULT FALSE COMMENT 'Whether stock has been deducted (order finalized)' AFTER stock_reserved")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- =====================================================
-- STEP 5: Create helper functions for stock operations
-- =====================================================

-- Drop existing procedures if they exist
DROP PROCEDURE IF EXISTS sp_reserve_stock_for_order;
DROP PROCEDURE IF EXISTS sp_release_stock_for_order;
DROP PROCEDURE IF EXISTS sp_deduct_stock_for_order;
DROP PROCEDURE IF EXISTS sp_check_stock_availability;

DELIMITER //

-- Procedure: Reserve stock for an order
CREATE PROCEDURE sp_reserve_stock_for_order(
    IN p_order_id INT,
    IN p_user_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12, 2);
    DECLARE v_stock_qty DECIMAL(12, 2);
    DECLARE v_reserved_qty DECIMAL(12, 2);
    DECLARE v_available DECIMAL(12, 2);
    DECLARE v_product_name VARCHAR(255);
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity 
        FROM order_details 
        WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Error reserving stock - transaction rolled back';
    END;
    
    START TRANSACTION;
    
    -- Check if already reserved
    SELECT stock_reserved INTO @already_reserved FROM orders WHERE id = p_order_id;
    IF @already_reserved = TRUE THEN
        SET p_success = FALSE;
        SET p_message = 'Stock already reserved for this order';
        ROLLBACK;
    ELSE
        OPEN order_items;
        
        read_loop: LOOP
            FETCH order_items INTO v_product_id, v_quantity;
            IF done THEN
                LEAVE read_loop;
            END IF;
            
            -- Get current stock levels
            SELECT stock_quantity, reserved_stock, product_name
            INTO v_stock_qty, v_reserved_qty, v_product_name
            FROM products 
            WHERE id = v_product_id;
            
            SET v_available = v_stock_qty - v_reserved_qty;
            
            -- Check if enough stock available
            IF v_available < v_quantity THEN
                SET p_success = FALSE;
                SET p_message = CONCAT('Insufficient stock for ', v_product_name, 
                                      '. Available: ', v_available, ', Required: ', v_quantity);
                ROLLBACK;
                LEAVE read_loop;
            END IF;
            
            -- Reserve the stock
            UPDATE products 
            SET reserved_stock = reserved_stock + v_quantity 
            WHERE id = v_product_id;
            
            -- Log the movement
            INSERT INTO stock_movements (
                product_id, movement_type, quantity,
                stock_before, stock_after,
                reserved_before, reserved_after,
                available_before, available_after,
                reference_type, reference_id,
                notes, created_by
            ) VALUES (
                v_product_id, 'RESERVE', v_quantity,
                v_stock_qty, v_stock_qty,
                v_reserved_qty, v_reserved_qty + v_quantity,
                v_available, v_available - v_quantity,
                'order', p_order_id,
                CONCAT('Stock reserved for order: ', (SELECT order_number FROM orders WHERE id = p_order_id)),
                p_user_id
            );
            
        END LOOP;
        
        CLOSE order_items;
        
        -- Mark order as having stock reserved
        UPDATE orders SET stock_reserved = TRUE WHERE id = p_order_id;
        
        SET p_success = TRUE;
        SET p_message = 'Stock reserved successfully';
        COMMIT;
    END IF;
END //

-- Procedure: Release reserved stock (order cancelled/rejected)
CREATE PROCEDURE sp_release_stock_for_order(
    IN p_order_id INT,
    IN p_user_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12, 2);
    DECLARE v_stock_qty DECIMAL(12, 2);
    DECLARE v_reserved_qty DECIMAL(12, 2);
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity 
        FROM order_details 
        WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Error releasing stock - transaction rolled back';
    END;
    
    START TRANSACTION;
    
    -- Check if stock was reserved
    SELECT stock_reserved INTO @was_reserved FROM orders WHERE id = p_order_id;
    IF @was_reserved = FALSE THEN
        SET p_success = FALSE;
        SET p_message = 'No stock reservation found for this order';
        ROLLBACK;
    ELSE
        OPEN order_items;
        
        read_loop: LOOP
            FETCH order_items INTO v_product_id, v_quantity;
            IF done THEN
                LEAVE read_loop;
            END IF;
            
            -- Get current stock levels
            SELECT stock_quantity, reserved_stock
            INTO v_stock_qty, v_reserved_qty
            FROM products 
            WHERE id = v_product_id;
            
            -- Release the reservation
            UPDATE products 
            SET reserved_stock = GREATEST(0, reserved_stock - v_quantity)
            WHERE id = v_product_id;
            
            -- Log the movement
            INSERT INTO stock_movements (
                product_id, movement_type, quantity,
                stock_before, stock_after,
                reserved_before, reserved_after,
                available_before, available_after,
                reference_type, reference_id,
                notes, created_by
            ) VALUES (
                v_product_id, 'RELEASE', v_quantity,
                v_stock_qty, v_stock_qty,
                v_reserved_qty, GREATEST(0, v_reserved_qty - v_quantity),
                v_stock_qty - v_reserved_qty, v_stock_qty - GREATEST(0, v_reserved_qty - v_quantity),
                'order', p_order_id,
                CONCAT('Stock released for cancelled/rejected order: ', (SELECT order_number FROM orders WHERE id = p_order_id)),
                p_user_id
            );
            
        END LOOP;
        
        CLOSE order_items;
        
        -- Mark order as having no stock reservation
        UPDATE orders SET stock_reserved = FALSE WHERE id = p_order_id;
        
        SET p_success = TRUE;
        SET p_message = 'Reserved stock released successfully';
        COMMIT;
    END IF;
END //

-- Procedure: Deduct stock when order is finalized
CREATE PROCEDURE sp_deduct_stock_for_order(
    IN p_order_id INT,
    IN p_user_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(500)
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12, 2);
    DECLARE v_stock_qty DECIMAL(12, 2);
    DECLARE v_reserved_qty DECIMAL(12, 2);
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity 
        FROM order_details 
        WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'Error deducting stock - transaction rolled back';
    END;
    
    START TRANSACTION;
    
    -- Check if already deducted
    SELECT stock_deducted INTO @already_deducted FROM orders WHERE id = p_order_id;
    IF @already_deducted = TRUE THEN
        SET p_success = FALSE;
        SET p_message = 'Stock already deducted for this order';
        ROLLBACK;
    ELSE
        OPEN order_items;
        
        read_loop: LOOP
            FETCH order_items INTO v_product_id, v_quantity;
            IF done THEN
                LEAVE read_loop;
            END IF;
            
            -- Get current stock levels
            SELECT stock_quantity, reserved_stock
            INTO v_stock_qty, v_reserved_qty
            FROM products 
            WHERE id = v_product_id;
            
            -- Deduct actual stock and release reservation
            UPDATE products 
            SET stock_quantity = stock_quantity - v_quantity,
                reserved_stock = GREATEST(0, reserved_stock - v_quantity)
            WHERE id = v_product_id;
            
            -- Log the movement
            INSERT INTO stock_movements (
                product_id, movement_type, quantity,
                stock_before, stock_after,
                reserved_before, reserved_after,
                available_before, available_after,
                reference_type, reference_id,
                notes, created_by
            ) VALUES (
                v_product_id, 'DEDUCT', v_quantity,
                v_stock_qty, v_stock_qty - v_quantity,
                v_reserved_qty, GREATEST(0, v_reserved_qty - v_quantity),
                v_stock_qty - v_reserved_qty, (v_stock_qty - v_quantity) - GREATEST(0, v_reserved_qty - v_quantity),
                'order', p_order_id,
                CONCAT('Stock deducted for finalized order: ', (SELECT order_number FROM orders WHERE id = p_order_id)),
                p_user_id
            );
            
        END LOOP;
        
        CLOSE order_items;
        
        -- Mark order as having stock deducted
        UPDATE orders SET stock_deducted = TRUE WHERE id = p_order_id;
-- =====================================================
-- STEP 7: Create indexes for performance
-- =====================================================
-- Add indexes only if they don't exist
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname AND table_name = 'products' AND index_name = 'idx_reserved_stock') > 0,
    "SELECT 'Index idx_reserved_stock exists' AS Status",
    "CREATE INDEX idx_reserved_stock ON products(reserved_stock)"));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname AND table_name = 'orders' AND index_name = 'idx_stock_reserved') > 0,
    "SELECT 'Index idx_stock_reserved exists' AS Status",
    "CREATE INDEX idx_stock_reserved ON orders(stock_reserved)"));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname AND table_name = 'orders' AND index_name = 'idx_stock_deducted') > 0,
    "SELECT 'Index idx_stock_deducted exists' AS Status",
    "CREATE INDEX idx_stock_deducted ON orders(stock_deducted)"));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
DELIMITER ;

-- =====================================================
-- STEP 6: Update dashboard view to include reserved stock
-- =====================================================
DROP VIEW IF EXISTS v_dashboard_stats;

CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
    (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as total_suppliers,
    (SELECT COUNT(*) FROM shops WHERE is_active = 1) as total_shops,
    (SELECT COUNT(*) FROM routes WHERE is_active = 1) as total_routes,
    (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as total_salesmen,
    (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) as low_stock_count,
    (SELECT COUNT(*) FROM products WHERE (stock_quantity - reserved_stock) <= reorder_level) as low_available_stock_count,
    (SELECT COUNT(*) FROM products WHERE (stock_quantity - reserved_stock) <= 0) as fully_reserved_count,
    (SELECT SUM(reserved_stock) FROM products) as total_reserved_stock;

-- =====================================================
-- STEP 7: Create indexes for performance
-- =====================================================
ALTER TABLE products ADD INDEX IF NOT EXISTS idx_reserved_stock (reserved_stock);
ALTER TABLE products ADD INDEX IF NOT EXISTS idx_available_stock ((stock_quantity - reserved_stock));
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_stock_reserved (stock_reserved);
ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_stock_deducted (stock_deducted);

-- =====================================================
-- STEP 8: Data integrity checks
-- =====================================================
-- Ensure no negative reserved stock
UPDATE products SET reserved_stock = 0 WHERE reserved_stock < 0;

-- Ensure reserved stock doesn't exceed actual stock
UPDATE products 
SET reserved_stock = stock_quantity 
WHERE reserved_stock > stock_quantity;

-- =====================================================
-- STEP 9: Create comprehensive stock report view
-- =====================================================
CREATE OR REPLACE VIEW vw_stock_summary_report AS
SELECT 
    p.id,
    p.product_code,
    p.product_name,
    p.category,
    p.brand,
    p.stock_quantity AS total_stock,
    p.reserved_stock,
    (p.stock_quantity - p.reserved_stock) AS available_stock,
    p.reorder_level,
    
    -- Orders with reserved stock
    (SELECT COUNT(*) 
     FROM order_details od 
     JOIN orders o ON od.order_id = o.id 
     WHERE od.product_id = p.id AND o.stock_reserved = TRUE AND o.status IN ('placed', 'approved')
    ) AS pending_orders_count,
    
    (SELECT COALESCE(SUM(od.quantity), 0)
     FROM order_details od 
     JOIN orders o ON od.order_id = o.id 
     WHERE od.product_id = p.id AND o.stock_reserved = TRUE AND o.status IN ('placed', 'approved')
    ) AS reserved_in_orders,
    
    -- Stock status
    CASE 
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN (p.stock_quantity - p.reserved_stock) <= 0 THEN 'FULLY_RESERVED'
        WHEN (p.stock_quantity - p.reserved_stock) <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    
    -- Value calculations
    p.unit_price,
    (p.stock_quantity * p.unit_price) AS total_stock_value,
    (p.reserved_stock * p.unit_price) AS reserved_stock_value,
    ((p.stock_quantity - p.reserved_stock) * p.unit_price) AS available_stock_value,
    
    p.is_active,
    s.supplier_name
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 
    'Reserved Stock System Migration Completed Successfully!' AS Status,
    (SELECT COUNT(*) FROM products WHERE reserved_stock IS NOT NULL) AS products_updated,
    (SELECT COUNT(*) FROM stock_movements) AS stock_movements_logged,
    NOW() AS migration_completed_at;

-- =====================================================
-- INSTRUCTIONS FOR ROLLBACK (if needed)
-- =====================================================
-- To rollback this migration, run:
-- ALTER TABLE products DROP COLUMN reserved_stock;
-- ALTER TABLE orders DROP COLUMN stock_reserved;
-- ALTER TABLE orders DROP COLUMN stock_deducted;
-- DROP PROCEDURE IF EXISTS sp_reserve_stock_for_order;
-- DROP PROCEDURE IF EXISTS sp_release_stock_for_order;
-- DROP PROCEDURE IF EXISTS sp_deduct_stock_for_order;
-- DROP VIEW IF EXISTS vw_product_stock_status;
-- DROP VIEW IF EXISTS vw_stock_summary_report;
-- =====================================================

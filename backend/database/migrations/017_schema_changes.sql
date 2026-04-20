-- =====================================================
-- Reserved Stock System - Schema Changes
-- Part 1: Table alterations and basic setup
-- =====================================================

USE distribution_system_db;

-- Add reserved_stock column to products
SET @dbname = DATABASE();
SET @tablename = 'products';
SET @columnname = 'reserved_stock';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = @tablename AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 'reserved_stock column exists' AS info",
  "ALTER TABLE products ADD COLUMN reserved_stock DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Stock reserved for pending orders' AFTER stock_quantity"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Initialize reserved_stock for existing products
UPDATE products SET reserved_stock = 0.00 WHERE reserved_stock IS NULL;

-- Add stock tracking columns to orders
SET @columnname = 'stock_reserved';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = 'orders' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 'stock_reserved column exists' AS info",
  "ALTER TABLE orders ADD COLUMN stock_reserved BOOLEAN DEFAULT FALSE COMMENT 'Stock reserved for this order' AFTER status"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'stock_deducted';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE table_name = 'orders' AND table_schema = @dbname AND column_name = @columnname) > 0,
  "SELECT 'stock_deducted column exists' AS info",
  "ALTER TABLE orders ADD COLUMN stock_deducted BOOLEAN DEFAULT FALSE COMMENT 'Stock deducted (finalized)' AFTER stock_reserved"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ensure stock_movements table exists with proper structure
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    movement_type ENUM('RESERVE', 'RELEASE', 'DEDUCT', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'TRANSFER') NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    stock_before DECIMAL(12, 2) NOT NULL,
    stock_after DECIMAL(12, 2) NOT NULL,
    reserved_before DECIMAL(12, 2) DEFAULT 0.00,
    reserved_after DECIMAL(12, 2) DEFAULT 0.00,
    available_before DECIMAL(12, 2) DEFAULT 0.00,
    available_after DECIMAL(12, 2) DEFAULT 0.00,
    reference_type VARCHAR(50),
    reference_id INT,
    reference_number VARCHAR(100),
    notes TEXT,
    movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_stock_product (product_id),
    INDEX idx_stock_movement_type (movement_type),
    INDEX idx_stock_date (movement_date),
    INDEX idx_stock_reference (reference_type, reference_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data integrity checks
UPDATE products SET reserved_stock = 0 WHERE reserved_stock < 0;
UPDATE products SET reserved_stock = stock_quantity WHERE reserved_stock > stock_quantity;

-- Update existing stock_movements table structure
ALTER TABLE stock_movements 
  ADD COLUMN IF NOT EXISTS stock_before DECIMAL(12, 2) AFTER quantity,
  ADD COLUMN IF NOT EXISTS stock_after DECIMAL(12, 2) AFTER stock_before,
  ADD COLUMN IF NOT EXISTS reserved_before DECIMAL(12, 2) DEFAULT 0.00 AFTER stock_after,
  ADD COLUMN IF NOT EXISTS reserved_after DECIMAL(12, 2) DEFAULT 0.00 AFTER reserved_before,
  ADD COLUMN IF NOT EXISTS available_before DECIMAL(12, 2) DEFAULT 0.00 AFTER reserved_after,
  ADD COLUMN IF NOT EXISTS available_after DECIMAL(12, 2) DEFAULT 0.00 AFTER available_before,
  ADD COLUMN IF NOT EXISTS reference_number VARCHAR(100) AFTER reference_id,
  ADD COLUMN IF NOT EXISTS movement_date DATETIME DEFAULT CURRENT_TIMESTAMP AFTER notes;

-- Modify quantity column to DECIMAL
ALTER TABLE stock_movements MODIFY COLUMN quantity DECIMAL(12, 2) NOT NULL;

-- Update movement_type enum to include new types
ALTER TABLE stock_movements 
  MODIFY COLUMN movement_type ENUM('RESERVE', 'RELEASE', 'DEDUCT', 'PURCHASE', 'ADJUSTMENT', 'RETURN', 'DAMAGE', 'TRANSFER') NOT NULL;

SELECT 'Schema changes completed successfully' AS Status;

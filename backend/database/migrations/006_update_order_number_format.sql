-- Sprint 5: Update Order Number Format for Multi-Salesman Support
-- Distribution Management System
-- Company: Ummahtechinnovations.com
-- Purpose: Ensure order_number field can accommodate salesman-specific format

-- Increase order_number length if needed (VARCHAR(50) already sufficient)
-- New format: ORD-YYYYMMDD-SXXX-NNNNN (e.g., ORD-20251119-S014-00001)

-- Add comment to orders table documenting the format
ALTER TABLE orders 
MODIFY COLUMN order_number VARCHAR(50) UNIQUE NOT NULL 
COMMENT 'Format: ORD-YYYYMMDD-SXXX-NNNNN where SXXX is salesman ID';

-- Add index for salesman_id + order_date for efficient order number generation
CREATE INDEX idx_salesman_date ON orders(salesman_id, order_date);

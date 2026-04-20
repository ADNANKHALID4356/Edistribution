-- Migration: Add discount and tax columns to delivery_items
-- Date: November 27, 2025
-- Purpose: Support complete pricing breakdown matching invoices

ALTER TABLE delivery_items 
ADD COLUMN discount_percentage DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Discount percentage per item' AFTER unit_price,
ADD COLUMN discount_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Discount amount per item' AFTER discount_percentage,
ADD COLUMN tax_percentage DECIMAL(5, 2) DEFAULT 0.00 COMMENT 'Tax percentage per item' AFTER discount_amount,
ADD COLUMN tax_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Tax amount per item' AFTER tax_percentage,
ADD COLUMN net_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Net amount after discount and tax' AFTER tax_amount;

-- Update total_price to be calculated column comment
ALTER TABLE delivery_items 
MODIFY COLUMN total_price DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Gross amount (quantity * unit_price)';

-- Add index for performance
CREATE INDEX idx_delivery_items_amounts ON delivery_items(total_price, discount_amount, tax_amount, net_amount);

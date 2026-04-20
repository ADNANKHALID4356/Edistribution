-- Migration: Add invoice-level charges to deliveries table
-- Purpose: Store tax, shipping, other charges from invoice at delivery level

USE distribution_system_db;

-- Add invoice-level charge columns to deliveries table
ALTER TABLE deliveries 
ADD COLUMN subtotal DECIMAL(12,2) DEFAULT 0.00 AFTER net_amount,
ADD COLUMN tax_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER subtotal,
ADD COLUMN tax_amount DECIMAL(12,2) DEFAULT 0.00 AFTER tax_percentage,
ADD COLUMN shipping_charges DECIMAL(12,2) DEFAULT 0.00 AFTER tax_amount,
ADD COLUMN other_charges DECIMAL(12,2) DEFAULT 0.00 AFTER shipping_charges,
ADD COLUMN round_off DECIMAL(12,2) DEFAULT 0.00 AFTER other_charges,
ADD COLUMN grand_total DECIMAL(12,2) DEFAULT 0.00 AFTER round_off;

-- Add index for better query performance
CREATE INDEX idx_deliveries_grand_total ON deliveries(grand_total);

SELECT '✅ Successfully added invoice-level charges columns to deliveries table' AS status;

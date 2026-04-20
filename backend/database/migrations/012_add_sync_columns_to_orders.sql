-- Sprint 9: Add Sync Columns to Orders Table
-- Distribution Management System - Mobile Order Syncing Part 1
-- Company: Ummahtechinnovations.com

-- Step 1: Add sync tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN is_synced BOOLEAN DEFAULT FALSE COMMENT 'Indicates if order is synced from mobile',
ADD COLUMN sync_status ENUM('pending', 'synced', 'failed') DEFAULT 'pending' COMMENT 'Current sync status',
ADD COLUMN sync_error TEXT NULL COMMENT 'Error message if sync failed',
ADD COLUMN mobile_order_id VARCHAR(100) NULL COMMENT 'Original order ID from mobile device',
ADD COLUMN last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last modification timestamp for conflict resolution';

-- Step 2: Add indexes for sync queries (after columns are created)
CREATE INDEX idx_is_synced ON orders(is_synced);
CREATE INDEX idx_sync_status ON orders(sync_status);
CREATE INDEX idx_salesman_synced ON orders(salesman_id, is_synced);
CREATE INDEX idx_last_modified ON orders(last_modified);
CREATE INDEX idx_mobile_order_id ON orders(mobile_order_id);

-- Step 3: Update table comment
ALTER TABLE orders 
COMMENT = 'Stores customer orders from salesmen - includes mobile sync tracking';

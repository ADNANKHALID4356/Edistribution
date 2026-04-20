-- Migration: Add discount columns to deliveries table
-- Purpose: Store discount percentage and amount from invoice at delivery level

USE distribution_system_db;

-- Check if discount columns exist, if not add them
SET @dbname = 'distribution_system_db';
SET @tablename = 'deliveries';
SET @columnname = 'discount_percentage';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)
  ) > 0,
  'SELECT "Column discount_percentage already exists" AS status;',
  'ALTER TABLE deliveries ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0.00 AFTER subtotal;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname = 'discount_amount';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE (table_name = @tablename)
   AND (table_schema = @dbname)
   AND (column_name = @columnname)
  ) > 0,
  'SELECT "Column discount_amount already exists" AS status;',
  'ALTER TABLE deliveries ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0.00 AFTER discount_percentage;'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SELECT '✅ Successfully added discount columns to deliveries table' AS status;

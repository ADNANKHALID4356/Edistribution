-- ============================================
-- PHASE 1: DATA QUALITY FIX SCRIPTS
-- Purpose: Fix existing data quality issues in load sheets
-- Date: November 29, 2025
-- ============================================

USE distribution_system_db;

-- Backup existing data before making changes
CREATE TABLE IF NOT EXISTS load_sheets_backup_20251129 AS SELECT * FROM load_sheets;
CREATE TABLE IF NOT EXISTS deliveries_backup_20251129 AS SELECT * FROM deliveries;
CREATE TABLE IF NOT EXISTS delivery_items_backup_20251129 AS SELECT * FROM delivery_items;

SELECT '✅ Backup tables created' AS Status;

-- ============================================
-- STEP 1: Fix Missing Prices in Delivery Items
-- ============================================

SELECT '🔄 Step 1: Fixing missing prices in delivery_items...' AS Status;

-- Show items with missing prices BEFORE fix
SELECT '❌ Items with zero/null prices BEFORE fix:' AS Status;
SELECT COUNT(*) as count, 
       CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM delivery_items), 2), '%') as percentage
FROM delivery_items
WHERE unit_price = 0 OR unit_price IS NULL;

-- Update delivery_items with prices from products table
UPDATE delivery_items di
INNER JOIN products p ON di.product_id = p.id
SET 
  di.unit_price = COALESCE(NULLIF(di.unit_price, 0), p.unit_price, p.purchase_price, 0),
  di.total_price = di.quantity_delivered * COALESCE(NULLIF(di.unit_price, 0), p.unit_price, p.purchase_price, 0),
  di.net_amount = di.quantity_delivered * COALESCE(NULLIF(di.unit_price, 0), p.unit_price, p.purchase_price, 0)
WHERE di.unit_price = 0 OR di.unit_price IS NULL;

-- Show items with missing prices AFTER fix
SELECT '✅ Items with zero/null prices AFTER fix:' AS Status;
SELECT COUNT(*) as count,
       CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM delivery_items), 2), '%') as percentage
FROM delivery_items
WHERE unit_price = 0 OR unit_price IS NULL;

SELECT '✅ Step 1 completed: Delivery item prices fixed' AS Status;

-- ============================================
-- STEP 2: Recalculate Delivery Totals
-- ============================================

SELECT '🔄 Step 2: Recalculating delivery totals...' AS Status;

-- Show deliveries with wrong totals BEFORE fix
SELECT '❌ Deliveries with zero totals BEFORE fix:' AS Status;
SELECT COUNT(*) as count
FROM deliveries
WHERE total_items = 0 OR total_quantity = 0 OR total_amount = 0;

-- Update delivery totals from delivery_items
UPDATE deliveries d
SET 
  d.total_items = (
    SELECT COUNT(*) 
    FROM delivery_items di 
    WHERE di.delivery_id = d.id
  ),
  d.total_quantity = (
    SELECT COALESCE(SUM(di.quantity_delivered), 0) 
    FROM delivery_items di 
    WHERE di.delivery_id = d.id
  ),
  d.total_amount = (
    SELECT COALESCE(SUM(di.total_price), 0) 
    FROM delivery_items di 
    WHERE di.delivery_id = d.id
  ),
  d.subtotal = (
    SELECT COALESCE(SUM(di.total_price), 0) 
    FROM delivery_items di 
    WHERE di.delivery_id = d.id
  );

-- Recalculate grand_total with discounts, taxes, and charges
UPDATE deliveries d
SET d.grand_total = 
  d.subtotal 
  - COALESCE(d.discount_amount, 0)
  + COALESCE(d.tax_amount, 0)
  + COALESCE(d.shipping_charges, 0)
  + COALESCE(d.other_charges, 0)
  + COALESCE(d.round_off, 0);

-- Show deliveries with zero totals AFTER fix
SELECT '✅ Deliveries with zero totals AFTER fix:' AS Status;
SELECT COUNT(*) as count
FROM deliveries
WHERE total_items = 0 OR total_quantity = 0 OR total_amount = 0;

SELECT '✅ Step 2 completed: Delivery totals recalculated' AS Status;

-- ============================================
-- STEP 3: Recalculate Load Sheet Totals
-- ============================================

SELECT '🔄 Step 3: Recalculating load sheet totals...' AS Status;

-- Show load sheets with wrong totals BEFORE fix
SELECT '❌ Load sheet totals BEFORE fix:' AS Status;
SELECT 
  ls.id,
  ls.load_sheet_number,
  ls.total_deliveries as recorded_deliveries,
  (SELECT COUNT(*) FROM load_sheet_deliveries WHERE load_sheet_id = ls.id) as actual_deliveries,
  ls.total_value as recorded_value,
  (SELECT COALESCE(SUM(d.grand_total), 0) 
   FROM load_sheet_deliveries lsd 
   INNER JOIN deliveries d ON lsd.delivery_id = d.id 
   WHERE lsd.load_sheet_id = ls.id) as actual_value
FROM load_sheets ls
LIMIT 5;

-- Update load sheet totals from deliveries
UPDATE load_sheets ls
SET 
  -- Total deliveries count
  ls.total_deliveries = (
    SELECT COUNT(*) 
    FROM load_sheet_deliveries lsd 
    WHERE lsd.load_sheet_id = ls.id
  ),
  
  -- Total unique products
  ls.total_products = (
    SELECT COUNT(DISTINCT di.product_id)
    FROM load_sheet_deliveries lsd
    INNER JOIN delivery_items di ON lsd.delivery_id = di.delivery_id
    WHERE lsd.load_sheet_id = ls.id
  ),
  
  -- Total quantity of all products
  ls.total_quantity = (
    SELECT COALESCE(SUM(di.quantity_delivered), 0)
    FROM load_sheet_deliveries lsd
    INNER JOIN delivery_items di ON lsd.delivery_id = di.delivery_id
    WHERE lsd.load_sheet_id = ls.id
  ),
  
  -- Total weight (if products have weight)
  ls.total_weight = (
    SELECT COALESCE(SUM(di.quantity_delivered * 0), 0)
    FROM load_sheet_deliveries lsd
    INNER JOIN delivery_items di ON lsd.delivery_id = di.delivery_id
    WHERE lsd.load_sheet_id = ls.id
  ),
  
  -- Total value from delivery grand totals
  ls.total_value = (
    SELECT COALESCE(SUM(d.grand_total), 0)
    FROM load_sheet_deliveries lsd
    INNER JOIN deliveries d ON lsd.delivery_id = d.id
    WHERE lsd.load_sheet_id = ls.id
  ),
  
  -- Update timestamp
  ls.updated_at = CURRENT_TIMESTAMP;

-- Show load sheets with totals AFTER fix
SELECT '✅ Load sheet totals AFTER fix:' AS Status;
SELECT 
  ls.id,
  ls.load_sheet_number,
  ls.total_deliveries,
  ls.total_products,
  ls.total_quantity,
  ls.total_weight,
  ls.total_value,
  ls.status
FROM load_sheets ls
LIMIT 5;

SELECT '✅ Step 3 completed: Load sheet totals recalculated' AS Status;

-- ============================================
-- STEP 4: Data Quality Report
-- ============================================

SELECT '📊 Data Quality Report:' AS Status;

-- Items with missing prices
SELECT 
  'Items with zero/null prices' as metric,
  COUNT(*) as count,
  CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM delivery_items), 2), '%') as percentage
FROM delivery_items
WHERE unit_price = 0 OR unit_price IS NULL

UNION ALL

-- Deliveries without shops
SELECT 
  'Deliveries without shops' as metric,
  COUNT(*) as count,
  CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM deliveries), 2), '%') as percentage
FROM deliveries
WHERE shop_id IS NULL

UNION ALL

-- Deliveries without items
SELECT 
  'Deliveries without items' as metric,
  COUNT(*) as count,
  CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM deliveries), 2), '%') as percentage
FROM deliveries d
LEFT JOIN delivery_items di ON d.id = di.delivery_id
WHERE di.id IS NULL

UNION ALL

-- Load sheets without vehicle
SELECT 
  'Load sheets without vehicle' as metric,
  COUNT(*) as count,
  CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM load_sheets), 2), '%') as percentage
FROM load_sheets
WHERE vehicle_number IS NULL OR vehicle_number = ''

UNION ALL

-- Load sheets without driver
SELECT 
  'Load sheets without driver' as metric,
  COUNT(*) as count,
  CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM load_sheets), 2), '%') as percentage
FROM load_sheets
WHERE driver_name IS NULL OR driver_name = '';

-- ============================================
-- STEP 5: Verify Specific Load Sheet
-- ============================================

SELECT '🔍 Verification: Load Sheet ID 6' AS Status;

SELECT 
  ls.load_sheet_number,
  ls.total_deliveries,
  ls.total_products,
  ls.total_quantity,
  CONCAT('Rs. ', FORMAT(ls.total_value, 2)) as total_value,
  ls.status,
  CASE 
    WHEN ls.vehicle_number IS NULL THEN '❌ Missing'
    ELSE CONCAT('✅ ', ls.vehicle_number)
  END as vehicle_status,
  CASE 
    WHEN ls.driver_name IS NULL THEN '❌ Missing'
    ELSE CONCAT('✅ ', ls.driver_name)
  END as driver_status
FROM load_sheets ls
WHERE ls.id = 6;

-- Show consolidated products for verification
SELECT 
  '  Product Breakdown:' as section,
  di.product_name,
  CONCAT(SUM(di.quantity_delivered), ' units') as total_qty,
  CONCAT('Rs. ', FORMAT(SUM(di.total_price), 2)) as total_value
FROM load_sheet_deliveries lsd
INNER JOIN delivery_items di ON lsd.delivery_id = di.delivery_id
WHERE lsd.load_sheet_id = 6
GROUP BY di.product_id, di.product_name
ORDER BY SUM(di.total_price) DESC;

-- Show deliveries for verification
SELECT 
  '  Delivery Breakdown:' as section,
  d.challan_number,
  s.shop_name,
  d.total_items as items,
  CONCAT(d.total_quantity, ' units') as quantity,
  CONCAT('Rs. ', FORMAT(d.grand_total, 2)) as value
FROM load_sheet_deliveries lsd
INNER JOIN deliveries d ON lsd.delivery_id = d.id
LEFT JOIN shops s ON d.shop_id = s.id
WHERE lsd.load_sheet_id = 6
ORDER BY lsd.delivery_sequence;

SELECT '✅ All data quality fixes completed successfully!' AS Status;
SELECT 'ℹ️ Backup tables created: load_sheets_backup_20251129, deliveries_backup_20251129, delivery_items_backup_20251129' AS Info;

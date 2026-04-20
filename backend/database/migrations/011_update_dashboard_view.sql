-- Migration: Update Dashboard View with Sprint 8 Statistics
-- Purpose: Add warehouse and delivery counts to dashboard view
-- Date: 2025-11-24

USE distribution_system;

-- Drop existing view
DROP VIEW IF EXISTS v_dashboard_stats;

-- Recreate with Sprint 8 fields
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
  (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as total_suppliers,
  (SELECT COUNT(*) FROM shops WHERE is_active = 1) as total_shops,
  (SELECT COUNT(*) FROM routes WHERE is_active = 1) as total_routes,
  (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as total_salesmen,
  (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) as low_stock_count,
  (SELECT COUNT(*) FROM warehouses WHERE status = 'active') as total_warehouses,
  (SELECT COUNT(*) FROM deliveries WHERE status = 'pending') as pending_deliveries,
  (SELECT COUNT(*) FROM deliveries WHERE status = 'in_transit') as in_transit_deliveries,
  (SELECT COUNT(*) FROM deliveries WHERE status = 'delivered') as delivered_count,
  (SELECT COUNT(*) FROM deliveries) as total_deliveries;

-- Verify view
SELECT * FROM v_dashboard_stats;

SELECT '✅ Dashboard view updated successfully!' as status;

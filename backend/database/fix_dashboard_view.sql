-- Fix Dashboard Stats View
-- This view provides all statistics needed for the dashboard

DROP VIEW IF EXISTS v_dashboard_stats;

CREATE VIEW v_dashboard_stats AS
SELECT
  -- Products
  (SELECT COUNT(*) FROM products) AS total_products,
  (SELECT COUNT(*) FROM products WHERE is_active = 1) AS active_products,
  (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level AND stock_quantity > 0) AS low_stock_count,
  
  -- Shops
  (SELECT COUNT(*) FROM shops) AS total_shops,
  (SELECT COUNT(*) FROM shops WHERE is_active = 1) AS active_shops,
  
  -- Salesmen
  (SELECT COUNT(*) FROM salesmen) AS total_salesmen,
  (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) AS active_salesmen,
  
  -- Warehouses
  (SELECT COUNT(*) FROM warehouses) AS total_warehouses,
  (SELECT COUNT(*) FROM warehouses WHERE status = 'active') AS active_warehouses,
  
  -- Orders (THIS WAS MISSING!)
  (SELECT COUNT(*) FROM orders) AS total_orders,
  (SELECT COUNT(*) FROM orders WHERE status IN ('placed', 'pending', 'processing')) AS pending_orders,
  (SELECT COUNT(*) FROM orders WHERE status IN ('completed', 'delivered')) AS completed_orders,
  
  -- Routes
  (SELECT COUNT(*) FROM routes) AS total_routes,
  (SELECT COUNT(*) FROM routes WHERE is_active = 1) AS active_routes,
  
  -- Deliveries
  (SELECT COUNT(*) FROM deliveries) AS total_deliveries,
  (SELECT COUNT(*) FROM deliveries WHERE status = 'pending') AS pending_deliveries,
  (SELECT COUNT(*) FROM deliveries WHERE status = 'in_transit') AS in_transit_deliveries,
  (SELECT COUNT(*) FROM deliveries WHERE status = 'delivered') AS delivered_deliveries,
  
  -- Invoices
  (SELECT COUNT(*) FROM invoices) AS total_invoices,
  (SELECT COUNT(*) FROM invoices WHERE status = 'unpaid') AS unpaid_invoices,
  (SELECT COUNT(*) FROM invoices WHERE status = 'paid') AS paid_invoices,
  (SELECT COUNT(*) FROM invoices WHERE status = 'partial') AS partial_invoices,
  
  -- Load Sheets
  (SELECT COUNT(*) FROM load_sheets) AS total_load_sheets,
  (SELECT COUNT(*) FROM load_sheets WHERE status = 'draft') AS draft_load_sheets,
  (SELECT COUNT(*) FROM load_sheets WHERE status = 'loaded') AS loaded_load_sheets,
  (SELECT COUNT(*) FROM load_sheets WHERE status = 'in_transit') AS in_transit_load_sheets,
  
  -- Suppliers
  (SELECT COUNT(*) FROM suppliers) AS total_suppliers,
  (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) AS active_suppliers,
  
  -- Stock metrics
  (SELECT COALESCE(SUM(reserved_quantity), 0) FROM warehouse_stock) AS total_reserved_stock,
  (SELECT COUNT(*) FROM products WHERE reserved_stock >= stock_quantity AND stock_quantity > 0) AS fully_reserved_count,
  
  -- Sales
  (SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE DATE(order_date) = CURDATE()) AS today_sales,
  (SELECT COALESCE(SUM(net_amount), 0) FROM orders WHERE MONTH(order_date) = MONTH(CURDATE()) AND YEAR(order_date) = YEAR(CURDATE())) AS monthly_sales;

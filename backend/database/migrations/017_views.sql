-- =====================================================
-- Reserved Stock System - Views and Indexes
-- Part 3: Reporting views and performance indexes
-- =====================================================

USE distribution_system_db;

-- Drop existing views
DROP VIEW IF EXISTS vw_product_stock_status;
DROP VIEW IF EXISTS vw_stock_summary_report;
DROP VIEW IF EXISTS v_dashboard_stats;

-- Product stock status view
CREATE VIEW vw_product_stock_status AS
SELECT 
    p.id, p.product_code, p.product_name, p.category, p.brand,
    p.stock_quantity, p.reserved_stock,
    (p.stock_quantity - p.reserved_stock) AS available_stock,
    p.reorder_level,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN (p.stock_quantity - p.reserved_stock) <= 0 THEN 'FULLY_RESERVED'
        WHEN (p.stock_quantity - p.reserved_stock) <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'CRITICAL'
        WHEN (p.stock_quantity - p.reserved_stock) <= 0 THEN 'CRITICAL'
        WHEN (p.stock_quantity - p.reserved_stock) <= p.reorder_level THEN 'WARNING'
        ELSE 'HEALTHY'
    END AS stock_health,
    CASE 
        WHEN p.stock_quantity > 0 THEN ROUND((p.reserved_stock / p.stock_quantity) * 100, 2)
        ELSE 0
    END AS reservation_percentage,
    p.unit_price, p.carton_price, p.is_active,
    s.supplier_name, s.supplier_code
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id;

-- Stock summary report view
CREATE VIEW vw_stock_summary_report AS
SELECT 
    p.id, p.product_code, p.product_name, p.category, p.brand,
    p.stock_quantity AS total_stock, p.reserved_stock,
    (p.stock_quantity - p.reserved_stock) AS available_stock,
    p.reorder_level,
    (SELECT COUNT(*) FROM order_details od 
     JOIN orders o ON od.order_id = o.id 
     WHERE od.product_id = p.id AND o.stock_reserved = TRUE 
     AND o.status IN ('placed', 'approved')) AS pending_orders_count,
    (SELECT COALESCE(SUM(od.quantity), 0) FROM order_details od 
     JOIN orders o ON od.order_id = o.id 
     WHERE od.product_id = p.id AND o.stock_reserved = TRUE 
     AND o.status IN ('placed', 'approved')) AS reserved_in_orders,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
        WHEN (p.stock_quantity - p.reserved_stock) <= 0 THEN 'FULLY_RESERVED'
        WHEN (p.stock_quantity - p.reserved_stock) <= p.reorder_level THEN 'LOW_STOCK'
        ELSE 'IN_STOCK'
    END AS stock_status,
    p.unit_price,
    (p.stock_quantity * p.unit_price) AS total_stock_value,
    (p.reserved_stock * p.unit_price) AS reserved_stock_value,
    ((p.stock_quantity - p.reserved_stock) * p.unit_price) AS available_stock_value,
    p.is_active, s.supplier_name
FROM products p
LEFT JOIN suppliers s ON p.supplier_id = s.id;

-- Dashboard statistics view
CREATE VIEW v_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
    (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as total_suppliers,
    (SELECT COUNT(*) FROM shops WHERE is_active = 1) as total_shops,
    (SELECT COUNT(*) FROM routes WHERE is_active = 1) as total_routes,
    (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as total_salesmen,
    (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) as low_stock_count,
    (SELECT COUNT(*) FROM products WHERE (stock_quantity - reserved_stock) <= reorder_level) as low_available_stock_count,
    (SELECT COUNT(*) FROM products WHERE (stock_quantity - reserved_stock) <= 0) as fully_reserved_count,
    (SELECT COALESCE(SUM(reserved_stock), 0) FROM products) as total_reserved_stock;

-- Create indexes
SET @dbname = DATABASE();

-- Index for reserved_stock
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname AND table_name = 'products' AND index_name = 'idx_reserved_stock') > 0,
    "SELECT 'Index idx_reserved_stock exists' AS info",
    "CREATE INDEX idx_reserved_stock ON products(reserved_stock)"));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for stock_reserved in orders
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname AND table_name = 'orders' AND index_name = 'idx_stock_reserved') > 0,
    "SELECT 'Index idx_stock_reserved exists' AS info",
    "CREATE INDEX idx_stock_reserved ON orders(stock_reserved)"));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for stock_deducted in orders
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE table_schema = @dbname AND table_name = 'orders' AND index_name = 'idx_stock_deducted') > 0,
    "SELECT 'Index idx_stock_deducted exists' AS info",
    "CREATE INDEX idx_stock_deducted ON orders(stock_deducted)"));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Views and indexes created successfully' AS Status;

-- Sprint 4: Salesman Management Database Schema
-- Distribution Management System
-- Company: Ummahtechinnovations.com

-- ========================================
-- SALESMEN TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS salesmen (
  id INT PRIMARY KEY AUTO_INCREMENT,
  salesman_code VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  cnic VARCHAR(15) UNIQUE,
  address TEXT,
  city VARCHAR(100),
  hire_date DATE DEFAULT (CURRENT_DATE),
  monthly_target DECIMAL(15,2) DEFAULT 0.00,
  commission_percentage DECIMAL(5,2) DEFAULT 0.00,
  user_id INT UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- UPDATE ROUTES TABLE
-- ========================================
-- Add salesman_id column to routes table
ALTER TABLE routes 
ADD COLUMN salesman_id INT,
ADD CONSTRAINT fk_routes_salesman 
FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL;

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_salesmen_code ON salesmen(salesman_code);
CREATE INDEX idx_salesmen_active ON salesmen(is_active);
CREATE INDEX idx_salesmen_user ON salesmen(user_id);
CREATE INDEX idx_routes_salesman ON routes(salesman_id);

-- ========================================
-- VIEWS FOR DASHBOARD ANALYTICS
-- ========================================

-- View: Salesman with assigned routes count
CREATE OR REPLACE VIEW v_salesmen_summary AS
SELECT 
  s.id,
  s.salesman_code,
  s.full_name,
  s.phone,
  s.city,
  s.monthly_target,
  s.commission_percentage,
  s.is_active,
  COUNT(r.id) as assigned_routes,
  u.username as login_username,
  s.created_at
FROM salesmen s
LEFT JOIN routes r ON r.salesman_id = s.id AND r.is_active = 1
LEFT JOIN users u ON u.id = s.user_id
GROUP BY s.id;

-- View: Dashboard statistics
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
  (SELECT COUNT(*) FROM suppliers WHERE is_active = 1) as total_suppliers,
  (SELECT COUNT(*) FROM shops WHERE is_active = 1) as total_shops,
  (SELECT COUNT(*) FROM routes WHERE is_active = 1) as total_routes,
  (SELECT COUNT(*) FROM salesmen WHERE is_active = 1) as total_salesmen,
  (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) as low_stock_count;

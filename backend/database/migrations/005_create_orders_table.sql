-- Sprint 5: Orders Table Migration
-- Distribution Management System
-- Company: Ummahtechinnovations.com

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    salesman_id INT NOT NULL,
    shop_id INT NOT NULL,
    route_id INT,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'placed', 'approved', 'finalized', 'rejected', 'delivered') NOT NULL DEFAULT 'placed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE RESTRICT,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
    
    -- Indexes for performance
    INDEX idx_order_number (order_number),
    INDEX idx_salesman_id (salesman_id),
    INDEX idx_shop_id (shop_id),
    INDEX idx_route_id (route_id),
    INDEX idx_status (status),
    INDEX idx_order_date (order_date),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create order_details table
CREATE TABLE IF NOT EXISTS order_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    net_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: Order numbers will be generated in application code
-- Format: ORD-YYYYMMDD-XXXXX (e.g., ORD-20241114-00001)

-- Add comments for documentation
ALTER TABLE orders 
    COMMENT = 'Stores customer orders from salesmen';

ALTER TABLE order_details 
    COMMENT = 'Stores line items for each order';

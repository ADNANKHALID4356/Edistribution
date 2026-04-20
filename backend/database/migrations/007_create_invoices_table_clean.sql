-- =============================================
-- SPRINT 7: INVOICE & BILL MANAGEMENT (CLEAN VERSION)
-- Migration: Create Invoices Tables
-- =============================================

-- Drop existing tables if needed (for clean migration)
-- DROP TABLE IF EXISTS invoice_payments;
-- DROP TABLE IF EXISTS invoice_details;
-- DROP TABLE IF EXISTS invoices;

-- 1. Invoices/Bills Table
CREATE TABLE IF NOT EXISTS invoices (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  order_id INT,
  shop_id INT NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  salesman_id INT,
  salesman_name VARCHAR(255),
  
  -- Financial Details
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
  tax_amount DECIMAL(10, 2) DEFAULT 0.00,
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  
  -- Payment Details
  paid_amount DECIMAL(10, 2) DEFAULT 0.00,
  balance_amount DECIMAL(10, 2) DEFAULT 0.00,
  payment_status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid',
  payment_type ENUM('cash', 'credit', 'bank_transfer', 'cheque') DEFAULT 'credit',
  
  -- Invoice Details
  invoice_date DATE NOT NULL,
  due_date DATE,
  notes TEXT,
  terms_conditions TEXT,
  
  -- Status
  status ENUM('draft', 'issued', 'cancelled') DEFAULT 'issued',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE RESTRICT,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE SET NULL,
  
  -- Indexes for performance
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_shop_id (shop_id),
  INDEX idx_salesman_id (salesman_id),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_status (status)
);

-- 2. Invoice Details/Line Items Table
CREATE TABLE IF NOT EXISTS invoice_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(100),
  
  -- Quantity and Pricing
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  discount_percentage DECIMAL(5, 2) DEFAULT 0.00,
  discount_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  
  -- Indexes
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_product_id (product_id)
);

-- 3. Invoice Payments Table
CREATE TABLE IF NOT EXISTS invoice_payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT NOT NULL,
  
  -- Payment Details
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('cash', 'credit', 'bank_transfer', 'cheque') NOT NULL,
  payment_date DATE NOT NULL,
  reference_number VARCHAR(100),
  
  -- Bank/Cheque Details
  bank_name VARCHAR(255),
  cheque_number VARCHAR(100),
  cheque_date DATE,
  
  -- Additional Info
  notes TEXT,
  received_by VARCHAR(255),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Key
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Index
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_payment_date (payment_date)
);

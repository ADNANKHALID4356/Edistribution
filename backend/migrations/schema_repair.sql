-- 1) Fix current error
ALTER TABLE stock_returns MODIFY COLUMN warehouse_id INT NULL;

-- 2) Add missing column used by Warehouse stock movement history
ALTER TABLE stock_movements ADD COLUMN movement_date DATETIME DEFAULT CURRENT_TIMESTAMP AFTER notes;

-- 3) Create missing salesman_ledger table
CREATE TABLE IF NOT EXISTS salesman_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesman_id INT NOT NULL,
  salesman_name VARCHAR(200),
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  transaction_type ENUM('salary','advance','deduction','commission','adjustment') DEFAULT 'salary',
  amount DECIMAL(15,2) NOT NULL,
  payment_method ENUM('cash','bank_transfer','cheque','online') DEFAULT 'cash',
  reference_number VARCHAR(100),
  description TEXT,
  notes TEXT,
  created_by INT,
  created_by_name VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_salesman_id (salesman_id),
  INDEX idx_transaction_date (transaction_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4) Rebuild company_settings with the correct (009 migration) schema
DROP TABLE IF EXISTS company_settings;
CREATE TABLE company_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL DEFAULT 'Ummahtechinnovations Distribution',
    company_address TEXT, company_city VARCHAR(100), company_state VARCHAR(100),
    company_country VARCHAR(100) DEFAULT 'Pakistan', company_postal_code VARCHAR(20),
    company_phone VARCHAR(50), company_mobile VARCHAR(50), company_email VARCHAR(255), company_website VARCHAR(255),
    company_tax_number VARCHAR(100), company_registration_number VARCHAR(100), company_ntn VARCHAR(100), company_gst_number VARCHAR(100),
    bank_name VARCHAR(255), bank_account_title VARCHAR(255), bank_account_number VARCHAR(100), bank_branch VARCHAR(255), bank_iban VARCHAR(100), bank_swift_code VARCHAR(50),
    bank_name_2 VARCHAR(255), bank_account_title_2 VARCHAR(255), bank_account_number_2 VARCHAR(100), bank_branch_2 VARCHAR(255), bank_iban_2 VARCHAR(100),
    company_logo_url TEXT, company_slogan VARCHAR(255), invoice_header_text TEXT, invoice_footer_text TEXT,
    currency_symbol VARCHAR(10) DEFAULT 'Rs.', currency_code VARCHAR(5) DEFAULT 'PKR',
    default_tax_percentage DECIMAL(5,2) DEFAULT 0.00, default_credit_days INT DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO company_settings (company_name, company_address, company_city, company_country, company_phone, company_email, currency_symbol, currency_code, default_tax_percentage, default_credit_days, invoice_footer_text)
VALUES ('Ummahtechinnovations Distribution', 'Office Address, City, Pakistan', 'Lahore', 'Pakistan', '+92-XXX-XXXXXXX', 'info@ummahtechinnovations.com', 'Rs.', 'PKR', 0.00, 30, 'Thank you for your business! Payment terms apply as per agreement.');

CREATE INDEX idx_company_settings_updated_at ON company_settings(updated_at);
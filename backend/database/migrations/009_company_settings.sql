-- Migration: Company Settings Table
-- Sprint: 7 Enhancement - Company Configuration
-- Date: November 24, 2025
-- Purpose: Store company information for invoices, reports, and branding

-- Create company_settings table (single row configuration)
CREATE TABLE IF NOT EXISTS company_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Basic Company Information
    company_name VARCHAR(255) NOT NULL DEFAULT 'Ummahtechinnovations Distribution',
    company_address TEXT,
    company_city VARCHAR(100),
    company_state VARCHAR(100),
    company_country VARCHAR(100) DEFAULT 'Pakistan',
    company_postal_code VARCHAR(20),
    
    -- Contact Information
    company_phone VARCHAR(50),
    company_mobile VARCHAR(50),
    company_email VARCHAR(255),
    company_website VARCHAR(255),
    
    -- Legal & Tax Information
    company_tax_number VARCHAR(100),
    company_registration_number VARCHAR(100),
    company_ntn VARCHAR(100),  -- National Tax Number (Pakistan)
    company_gst_number VARCHAR(100),  -- GST Number
    
    -- Bank Details (Primary Account)
    bank_name VARCHAR(255),
    bank_account_title VARCHAR(255),
    bank_account_number VARCHAR(100),
    bank_branch VARCHAR(255),
    bank_iban VARCHAR(100),
    bank_swift_code VARCHAR(50),
    
    -- Secondary Bank Account (Optional)
    bank_name_2 VARCHAR(255),
    bank_account_title_2 VARCHAR(255),
    bank_account_number_2 VARCHAR(100),
    bank_branch_2 VARCHAR(255),
    bank_iban_2 VARCHAR(100),
    
    -- Branding & Display
    company_logo_url TEXT,  -- Path to logo image
    company_slogan VARCHAR(255),
    invoice_header_text TEXT,  -- Custom header text for invoices
    invoice_footer_text TEXT,  -- Custom footer text for invoices
    
    -- Business Settings
    currency_symbol VARCHAR(10) DEFAULT 'Rs.',
    currency_code VARCHAR(5) DEFAULT 'PKR',
    default_tax_percentage DECIMAL(5, 2) DEFAULT 0.00,
    default_credit_days INT DEFAULT 30,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,  -- User ID who last updated
    
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default company settings (single row - company wide)
INSERT INTO company_settings (
    company_name,
    company_address,
    company_city,
    company_country,
    company_phone,
    company_email,
    currency_symbol,
    currency_code,
    default_tax_percentage,
    default_credit_days,
    invoice_footer_text
) VALUES (
    'Ummahtechinnovations Distribution',
    'Office Address, City, Pakistan',
    'Lahore',
    'Pakistan',
    '+92-XXX-XXXXXXX',
    'info@ummahtechinnovations.com',
    'Rs.',
    'PKR',
    0.00,
    30,
    'Thank you for your business! Payment terms apply as per agreement.'
);

-- Create index for faster lookups (single row table, but good practice)
CREATE INDEX idx_company_settings_updated_at ON company_settings(updated_at);

-- Add comment explaining this is a singleton table
ALTER TABLE company_settings COMMENT = 'Company-wide settings (single row only - system configuration)';

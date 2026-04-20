-- =============================================
-- SPRINT 7 ENHANCEMENT: Professional Invoice Format
-- Migration: Add Professional Fields to Invoices
-- Based on comprehensive analysis of order-to-invoice workflow
-- =============================================

-- Add Company/Distributor Information
ALTER TABLE invoices
  ADD COLUMN company_name VARCHAR(255) DEFAULT 'Ummahtechinnovations Distribution' AFTER salesman_name,
  ADD COLUMN company_address TEXT AFTER company_name,
  ADD COLUMN company_city VARCHAR(100) AFTER company_address,
  ADD COLUMN company_phone VARCHAR(20) AFTER company_city,
  ADD COLUMN company_email VARCHAR(255) AFTER company_phone,
  ADD COLUMN company_tax_number VARCHAR(50) COMMENT 'NTN/Tax Registration Number' AFTER company_email,
  ADD COLUMN company_logo_url VARCHAR(500) AFTER company_tax_number;

-- Add Complete Customer/Shop Details
ALTER TABLE invoices
  ADD COLUMN shop_owner_name VARCHAR(255) AFTER shop_name,
  ADD COLUMN shop_address TEXT AFTER shop_owner_name,
  ADD COLUMN shop_city VARCHAR(100) AFTER shop_address,
  ADD COLUMN shop_area VARCHAR(100) AFTER shop_city,
  ADD COLUMN shop_phone VARCHAR(20) AFTER shop_area;

-- Add Complete Salesman Details
ALTER TABLE invoices
  ADD COLUMN salesman_phone VARCHAR(20) AFTER salesman_name,
  ADD COLUMN salesman_code VARCHAR(50) AFTER salesman_phone,
  ADD COLUMN route_id INT AFTER salesman_code,
  ADD COLUMN route_name VARCHAR(255) AFTER route_id;

-- Add Financial Enhancement Fields
ALTER TABLE invoices
  ADD COLUMN shipping_charges DECIMAL(10, 2) DEFAULT 0.00 AFTER tax_amount,
  ADD COLUMN other_charges DECIMAL(10, 2) DEFAULT 0.00 AFTER shipping_charges,
  ADD COLUMN round_off DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Rounding adjustment' AFTER other_charges,
  ADD COLUMN credit_days INT DEFAULT 30 COMMENT 'Credit period in days' AFTER due_date,
  ADD COLUMN previous_balance DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Customer outstanding balance' AFTER balance_amount,
  ADD COLUMN total_payable DECIMAL(10, 2) DEFAULT 0.00 COMMENT 'Net amount + previous balance' AFTER previous_balance;

-- Add Bank & Payment Information
ALTER TABLE invoices
  ADD COLUMN bank_name VARCHAR(255) AFTER terms_conditions,
  ADD COLUMN bank_account_title VARCHAR(255) AFTER bank_name,
  ADD COLUMN bank_account_number VARCHAR(50) AFTER bank_account_title,
  ADD COLUMN bank_branch VARCHAR(255) AFTER bank_account_number,
  ADD COLUMN bank_iban VARCHAR(50) AFTER bank_branch;

-- Add Additional Professional Fields
ALTER TABLE invoices
  ADD COLUMN reference_number VARCHAR(100) COMMENT 'PO/Reference number' AFTER order_id,
  ADD COLUMN delivery_date DATE COMMENT 'Goods delivery date' AFTER invoice_date,
  ADD COLUMN prepared_by VARCHAR(255) COMMENT 'Invoice prepared by' AFTER salesman_name,
  ADD COLUMN approved_by VARCHAR(255) COMMENT 'Invoice approved by' AFTER prepared_by,
  ADD COLUMN signature_url VARCHAR(500) COMMENT 'Digital signature image' AFTER bank_iban,
  ADD COLUMN qr_code_data TEXT COMMENT 'QR code for invoice verification' AFTER signature_url,
  ADD COLUMN invoice_footer TEXT COMMENT 'Footer text/legal disclaimer' AFTER terms_conditions;

-- Add Indexes for New Fields
ALTER TABLE invoices
  ADD INDEX idx_shop_phone (shop_phone),
  ADD INDEX idx_salesman_phone (salesman_phone),
  ADD INDEX idx_route_id (route_id),
  ADD INDEX idx_delivery_date (delivery_date),
  ADD INDEX idx_reference_number (reference_number);

-- Add Foreign Key for route_id
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_route
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL;

-- Update invoice_details to add more product information
ALTER TABLE invoice_details
  ADD COLUMN product_category VARCHAR(100) AFTER product_code,
  ADD COLUMN product_brand VARCHAR(100) AFTER product_category,
  ADD COLUMN pack_size VARCHAR(50) AFTER product_brand,
  ADD COLUMN tax_percentage DECIMAL(5, 2) DEFAULT 0.00 AFTER discount_amount,
  ADD COLUMN tax_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER tax_percentage,
  ADD COLUMN notes TEXT COMMENT 'Item specific notes' AFTER total_amount;

-- Add Comments for Documentation
ALTER TABLE invoices 
  COMMENT = 'Professional invoices with complete company, customer, and legal details';

ALTER TABLE invoice_details 
  COMMENT = 'Invoice line items with detailed product information';

ALTER TABLE invoice_payments 
  COMMENT = 'Payment history and tracking for invoices';

-- Create view for complete invoice data (for easy querying)
CREATE OR REPLACE VIEW vw_invoice_complete AS
SELECT 
  i.*,
  o.order_number,
  o.order_date,
  r.route_name as order_route_name,
  COUNT(DISTINCT id_items.id) as total_items,
  SUM(id_items.quantity) as total_quantity,
  COALESCE(SUM(ip.payment_amount), 0) as total_paid,
  CASE 
    WHEN i.balance_amount = 0 THEN 'Fully Paid'
    WHEN i.paid_amount > 0 THEN 'Partially Paid'
    ELSE 'Unpaid'
  END as payment_status_text
FROM invoices i
LEFT JOIN orders o ON i.order_id = o.id
LEFT JOIN routes r ON i.route_id = r.id
LEFT JOIN invoice_details id_items ON i.id = id_items.invoice_id
LEFT JOIN invoice_payments ip ON i.id = ip.invoice_id
GROUP BY i.id;

-- Add trigger to calculate total_payable automatically
DELIMITER //

CREATE TRIGGER before_invoice_update_totals
BEFORE UPDATE ON invoices
FOR EACH ROW
BEGIN
  -- Calculate total_payable (net_amount + previous_balance - paid_amount)
  SET NEW.total_payable = NEW.net_amount + NEW.previous_balance;
  
  -- Recalculate balance_amount
  SET NEW.balance_amount = NEW.total_payable - NEW.paid_amount;
  
  -- Update payment_status based on balance
  IF NEW.balance_amount <= 0 THEN
    SET NEW.payment_status = 'paid';
  ELSEIF NEW.paid_amount > 0 THEN
    SET NEW.payment_status = 'partial';
  ELSE
    SET NEW.payment_status = 'unpaid';
  END IF;
  
  -- Auto-calculate credit due date if not set
  IF NEW.due_date IS NULL AND NEW.credit_days IS NOT NULL THEN
    SET NEW.due_date = DATE_ADD(NEW.invoice_date, INTERVAL NEW.credit_days DAY);
  END IF;
END//

DELIMITER ;

-- =============================================
-- SUMMARY OF ENHANCEMENTS
-- =============================================
-- ✅ Company branding fields (7 fields)
-- ✅ Complete customer details (5 fields)
-- ✅ Salesman contact information (4 fields)
-- ✅ Route information (2 fields)
-- ✅ Enhanced financial fields (7 fields)
-- ✅ Bank payment details (5 fields)
-- ✅ Professional fields (7 fields)
-- ✅ Product detail enhancements in line items (6 fields)
-- ✅ Automatic calculations via trigger
-- ✅ Complete invoice view for reporting
-- =============================================

-- Migration: Expand Company Settings Table
-- Purpose: Add new fields for extended address, bank accounts, and branding.

-- Extended Address
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS state VARCHAR(100);
-- default country was added in original, let's ensure it exists
-- skipping country if it's already there, but let's be safe
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- Extra Contact
-- mobile was added in original 009, so skip

-- Legal / Tax
-- registration_number, ntn, gst_number were in original 009! 

-- Primary Bank Account
-- bank_name, bank_account_title, etc were in original 009!

-- Secondary Bank Account
-- bank_name_2, etc were in original 009!

-- Branding
-- company_slogan, invoice_header_text, invoice_footer_text were in original 009!
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS slogan VARCHAR(255);

-- Business Settings
-- default_tax_percentage, default_credit_days were in original 009!

-- WAIT a moment...

-- Sprint 4: Seed Data for Salesmen
-- Distribution Management System
-- Company: Ummahtechinnovations.com

-- Sample Salesmen Data
INSERT INTO salesmen (salesman_code, full_name, phone, email, cnic, address, city, hire_date, monthly_target, commission_percentage, is_active) VALUES
('SM001', 'Ahmed Khan', '+92-300-1234567', 'ahmed.khan@example.com', '35202-1234567-1', 'House 123, Street 5, Block A', 'Karachi', '2024-01-15', 500000.00, 2.50, 1),
('SM002', 'Hassan Ali', '+92-301-2345678', 'hassan.ali@example.com', '35202-2345678-1', 'Flat 45, Building B, Sector 7', 'Lahore', '2024-02-01', 450000.00, 2.00, 1),
('SM003', 'Bilal Ahmed', '+92-302-3456789', 'bilal.ahmed@example.com', '35202-3456789-1', 'Plot 67, Phase 2, DHA', 'Islamabad', '2024-03-10', 400000.00, 2.25, 1),
('SM004', 'Usman Malik', '+92-303-4567890', 'usman.malik@example.com', '35202-4567890-1', 'House 89, Street 12, F-Block', 'Rawalpindi', '2024-04-20', 350000.00, 2.00, 1),
('SM005', 'Faisal Raza', '+92-304-5678901', 'faisal.raza@example.com', '35202-5678901-1', 'Apartment 34, Tower C, Bahria', 'Karachi', '2024-05-15', 480000.00, 2.75, 1);

-- Assign salesmen to routes
-- Note: This assumes routes with IDs 1-5 exist from Sprint 3
UPDATE routes SET salesman_id = 1 WHERE id = 1;  -- Ahmed Khan -> North Zone
UPDATE routes SET salesman_id = 2 WHERE id = 2;  -- Hassan Ali -> South Zone
UPDATE routes SET salesman_id = 3 WHERE id = 3;  -- Bilal Ahmed -> East Zone
UPDATE routes SET salesman_id = 4 WHERE id = 4;  -- Usman Malik -> West Zone
UPDATE routes SET salesman_id = 5 WHERE id = 5;  -- Faisal Raza -> Central Zone

-- =====================================================
-- SPRINT 2: SEED DATA - Suppliers and Products
-- Distribution Management System
-- =====================================================

USE distribution_system_db;

-- =====================================================
-- SUPPLIERS - Test Data
-- =====================================================
INSERT INTO suppliers (supplier_code, supplier_name, contact_person, phone, email, address, city, opening_balance, current_balance, is_active) VALUES
('SUP001', 'ABC Trading Company', 'Ahmed Khan', '03001234567', 'ahmed@abctrading.com', 'Shop # 45, Main Market, Saddar', 'Karachi', 50000.00, 50000.00, TRUE),
('SUP002', 'XYZ Distributors', 'Bilal Ahmed', '03009876543', 'bilal@xyzdist.com', 'Warehouse 12, Industrial Area', 'Lahore', 75000.00, 75000.00, TRUE),
('SUP003', 'PQR Wholesale', 'Zainab Ali', '03005554444', 'zainab@pqr.com', 'Plaza 3, Blue Area', 'Islamabad', 30000.00, 30000.00, TRUE),
('SUP004', 'Global Imports Ltd', 'Hassan Raza', '03007778888', 'hassan@global.com', 'Building 5, Port Area', 'Karachi', 100000.00, 100000.00, TRUE),
('SUP005', 'Local Products Co', 'Fatima Sheikh', '03003332222', 'fatima@localproducts.pk', 'Market Street 10', 'Faisalabad', 25000.00, 25000.00, TRUE);

-- =====================================================
-- PRODUCTS - Test Data (Various Categories)
-- =====================================================

-- Beverages
INSERT INTO products (product_code, product_name, category, brand, pack_size, unit_price, carton_price, pieces_per_carton, purchase_price, stock_quantity, reorder_level, supplier_id, barcode, is_active) VALUES
('PROD001', 'Coca Cola Regular', 'Beverages', 'Coca Cola', '1.5 Liter', 120.00, 1200.00, 12, 90.00, 150, 20, 1, '8888000001', TRUE),
('PROD002', 'Pepsi Regular', 'Beverages', 'Pepsi', '1.5 Liter', 115.00, 1150.00, 12, 85.00, 200, 20, 1, '8888000002', TRUE),
('PROD003', 'Sprite', 'Beverages', 'Coca Cola', '1.5 Liter', 120.00, 1200.00, 12, 90.00, 100, 20, 1, '8888000003', TRUE),
('PROD004', 'Fanta Orange', 'Beverages', 'Coca Cola', '1.5 Liter', 120.00, 1200.00, 12, 90.00, 80, 20, 1, '8888000004', TRUE),
('PROD005', 'Mountain Dew', 'Beverages', 'Pepsi', '1.5 Liter', 115.00, 1150.00, 12, 85.00, 120, 20, 1, '8888000005', TRUE),

-- Snacks
('PROD006', 'Lays Chips Masala', 'Snacks', 'Lays', '45g', 30.00, 360.00, 24, 22.00, 300, 50, 2, '8888000006', TRUE),
('PROD007', 'Lays Chips Salt', 'Snacks', 'Lays', '45g', 30.00, 360.00, 24, 22.00, 250, 50, 2, '8888000007', TRUE),
('PROD008', 'Kurkure Chutney', 'Snacks', 'Kurkure', '40g', 25.00, 300.00, 24, 18.00, 200, 50, 2, '8888000008', TRUE),
('PROD009', 'Cheetos Flamin Hot', 'Snacks', 'Cheetos', '50g', 35.00, 420.00, 24, 26.00, 150, 40, 2, '8888000009', TRUE),
('PROD010', 'Pringles Original', 'Snacks', 'Pringles', '100g', 180.00, 1800.00, 12, 140.00, 60, 15, 2, '8888000010', TRUE),

-- Dairy Products
('PROD011', 'Olpers Milk', 'Dairy', 'Olpers', '1 Liter', 260.00, 2600.00, 12, 240.00, 80, 20, 3, '8888000011', TRUE),
('PROD012', 'Nestle Everyday', 'Dairy', 'Nestle', '400g', 450.00, 4500.00, 12, 410.00, 100, 25, 3, '8888000012', TRUE),
('PROD013', 'Haleeb Yogurt', 'Dairy', 'Haleeb', '500ml', 140.00, 1400.00, 12, 120.00, 70, 20, 3, '8888000013', TRUE),
('PROD014', 'Tarang Dahi', 'Dairy', 'Tarang', '1kg', 280.00, 2800.00, 12, 250.00, 50, 15, 3, '8888000014', TRUE),

-- Bakery
('PROD015', 'Sooper Biscuit', 'Bakery', 'Sooper', '200g', 50.00, 600.00, 24, 38.00, 200, 40, 4, '8888000015', TRUE),
('PROD016', 'Prince Biscuit', 'Bakery', 'Prince', '150g', 40.00, 480.00, 24, 30.00, 180, 40, 4, '8888000016', TRUE),
('PROD017', 'Peek Freans Cake', 'Bakery', 'Peek Freans', '200g', 90.00, 1080.00, 24, 70.00, 100, 30, 4, '8888000017', TRUE),
('PROD018', 'English Biscuit', 'Bakery', 'English Biscuit', '250g', 60.00, 720.00, 24, 45.00, 150, 35, 4, '8888000018', TRUE),

-- Personal Care
('PROD019', 'Lifebuoy Soap', 'Personal Care', 'Lifebuoy', '100g', 85.00, 850.00, 12, 70.00, 120, 25, 5, '8888000019', TRUE),
('PROD020', 'Lux Soap', 'Personal Care', 'Lux', '100g', 90.00, 900.00, 12, 75.00, 100, 25, 5, '8888000020', TRUE),
('PROD021', 'Colgate Toothpaste', 'Personal Care', 'Colgate', '150ml', 180.00, 1800.00, 12, 150.00, 80, 20, 5, '8888000021', TRUE),
('PROD022', 'Head & Shoulders', 'Personal Care', 'H&S', '200ml', 450.00, 4500.00, 12, 390.00, 60, 15, 5, '8888000022', TRUE),
('PROD023', 'Dove Soap', 'Personal Care', 'Dove', '100g', 120.00, 1200.00, 12, 100.00, 90, 20, 5, '8888000023', TRUE),

-- Cleaning Products
('PROD024', 'Surf Excel', 'Cleaning', 'Surf Excel', '1kg', 350.00, 3500.00, 12, 310.00, 70, 20, 5, '8888000024', TRUE),
('PROD025', 'Ariel Powder', 'Cleaning', 'Ariel', '1kg', 380.00, 3800.00, 12, 340.00, 60, 15, 5, '8888000025', TRUE),
('PROD026', 'Harpic Toilet Cleaner', 'Cleaning', 'Harpic', '500ml', 180.00, 1800.00, 12, 150.00, 50, 15, 5, '8888000026', TRUE),
('PROD027', 'Colin Glass Cleaner', 'Cleaning', 'Colin', '500ml', 220.00, 2200.00, 12, 190.00, 40, 10, 5, '8888000027', TRUE),

-- Frozen Foods
('PROD028', 'K&Ns Chicken Nuggets', 'Frozen', 'K&N', '500g', 450.00, 4500.00, 12, 400.00, 45, 12, 4, '8888000028', TRUE),
('PROD029', 'Dawn Paratha', 'Frozen', 'Dawn', '400g', 180.00, 1800.00, 12, 155.00, 80, 20, 4, '8888000029', TRUE),
('PROD030', 'Young Fresh Samosa', 'Frozen', 'Young Fresh', '500g', 220.00, 2200.00, 12, 190.00, 60, 15, 4, '8888000030', TRUE);

-- =====================================================
-- LOW STOCK PRODUCTS (for testing low stock alerts)
-- =====================================================
INSERT INTO products (product_code, product_name, category, brand, pack_size, unit_price, carton_price, pieces_per_carton, purchase_price, stock_quantity, reorder_level, supplier_id, barcode, is_active) VALUES
('PROD031', 'Red Bull Energy Drink', 'Beverages', 'Red Bull', '250ml', 280.00, 2800.00, 24, 240.00, 8, 20, 1, '8888000031', TRUE),
('PROD032', 'Nutella Spread', 'Bakery', 'Nutella', '400g', 850.00, 8500.00, 12, 750.00, 5, 10, 4, '8888000032', TRUE),
('PROD033', 'Maggi Noodles', 'Food', 'Maggi', '70g', 40.00, 480.00, 48, 30.00, 10, 50, 2, '8888000033', TRUE);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Sprint 2 seed data inserted successfully!' AS message,
       (SELECT COUNT(*) FROM suppliers) AS total_suppliers,
       (SELECT COUNT(*) FROM products) AS total_products,
       (SELECT COUNT(*) FROM products WHERE stock_quantity <= reorder_level) AS low_stock_products;

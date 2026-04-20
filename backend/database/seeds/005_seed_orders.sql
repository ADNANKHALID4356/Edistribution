-- Sprint 5: Seed Data for Orders
-- Distribution Management System
-- Company: Ummahtechinnovations.com

-- Sample Orders Data
-- Note: Using existing salesmen (1-5) and shops from previous sprints

-- Order 1: Ahmed Khan (Salesman 1) - Shop 1 - Delivered
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241101-00001', 1, 1, 1, '2024-11-01 10:30:00', 25000.00, 500.00, 24500.00, 'delivered', 'First order of the month', '2024-11-01 10:35:00');

-- Order 1 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(1, 1, 50, 300.00, 15000.00, 300.00, 14700.00),  -- 50 units of product 1
(1, 2, 30, 250.00, 7500.00, 150.00, 7350.00),    -- 30 units of product 2
(1, 3, 10, 250.00, 2500.00, 50.00, 2450.00);     -- 10 units of product 3

-- Order 2: Hassan Ali (Salesman 2) - Shop 2 - Finalized
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241102-00002', 2, 2, 2, '2024-11-02 14:15:00', 18500.00, 300.00, 18200.00, 'finalized', 'Ready for delivery', '2024-11-02 14:20:00');

-- Order 2 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(2, 4, 40, 200.00, 8000.00, 150.00, 7850.00),
(2, 5, 35, 300.00, 10500.00, 150.00, 10350.00);

-- Order 3: Bilal Ahmed (Salesman 3) - Shop 3 - Approved
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241103-00003', 3, 3, 3, '2024-11-03 09:45:00', 32000.00, 800.00, 31200.00, 'approved', 'Large order - approved by admin', '2024-11-03 09:50:00');

-- Order 3 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(3, 1, 60, 300.00, 18000.00, 400.00, 17600.00),
(3, 2, 50, 250.00, 12500.00, 300.00, 12200.00),
(3, 6, 5, 300.00, 1500.00, 100.00, 1400.00);

-- Order 4: Usman Malik (Salesman 4) - Shop 4 - Placed (Pending)
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241104-00004', 4, 4, 4, '2024-11-04 11:20:00', 15000.00, 200.00, 14800.00, 'placed', 'Waiting for approval', '2024-11-04 11:25:00');

-- Order 4 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(4, 7, 25, 350.00, 8750.00, 100.00, 8650.00),
(4, 8, 20, 320.00, 6400.00, 100.00, 6300.00);

-- Order 5: Faisal Raza (Salesman 5) - Shop 5 - Placed (Pending)
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241105-00005', 5, 5, 5, '2024-11-05 16:00:00', 28000.00, 500.00, 27500.00, 'placed', 'New order just received', '2024-11-05 16:05:00');

-- Order 5 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(5, 9, 40, 280.00, 11200.00, 200.00, 11000.00),
(5, 10, 45, 380.00, 17100.00, 300.00, 16800.00);

-- Order 6: Ahmed Khan (Salesman 1) - Shop 6 - Draft
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241106-00006', 1, 6, 1, '2024-11-06 10:00:00', 12000.00, 0.00, 12000.00, 'draft', 'Draft order - not finalized yet', NULL);

-- Order 6 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(6, 1, 20, 300.00, 6000.00, 0.00, 6000.00),
(6, 2, 20, 250.00, 5000.00, 0.00, 5000.00),
(6, 3, 4, 250.00, 1000.00, 0.00, 1000.00);

-- Order 7: Hassan Ali (Salesman 2) - Shop 7 - Rejected
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241107-00007', 2, 7, 2, '2024-11-07 13:30:00', 8000.00, 100.00, 7900.00, 'rejected', 'Rejected due to insufficient stock', '2024-11-07 13:40:00');

-- Order 7 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(7, 4, 20, 200.00, 4000.00, 50.00, 3950.00),
(7, 5, 13, 300.00, 3900.00, 50.00, 3850.00);

-- Order 8: Recent order from today
INSERT INTO orders (order_number, salesman_id, shop_id, route_id, order_date, total_amount, discount, net_amount, status, notes, synced_at) VALUES
('ORD-20241114-00008', 1, 1, 1, NOW(), 20000.00, 400.00, 19600.00, 'placed', 'Fresh order today', NOW());

-- Order 8 Details
INSERT INTO order_details (order_id, product_id, quantity, unit_price, total_price, discount, net_price) VALUES
(8, 1, 35, 300.00, 10500.00, 200.00, 10300.00),
(8, 2, 25, 250.00, 6250.00, 125.00, 6125.00),
(8, 3, 13, 250.00, 3250.00, 75.00, 3175.00);

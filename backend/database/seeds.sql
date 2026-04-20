-- Seed Data for Distribution Management System
-- Company: Ummahtechinnovations.com
-- Sprint 1: Test Users

-- Insert Test Admin User
-- Password: admin123 (hashed with bcrypt)
-- Note: This is a temporary password for testing. Change it in production!

INSERT INTO users (username, email, password, full_name, phone, role_id, is_active) VALUES
('admin', 'admin@ummahtechinnovations.com', '$2b$10$1VlDgPmzdM08zf907Qm0/O4/3XKxqIaU8Uy/fcbwwzMOcU9G33k/2', 'System Administrator', '+92-300-1234567', 1, TRUE),
('manager1', 'manager@ummahtechinnovations.com', '$2b$10$1VlDgPmzdM08zf907Qm0/O4/3XKxqIaU8Uy/fcbwwzMOcU9G33k/2', 'Office Manager', '+92-300-7654321', 2, TRUE),
('salesman1', 'salesman@ummahtechinnovations.com', '$2b$10$1VlDgPmzdM08zf907Qm0/O4/3XKxqIaU8Uy/fcbwwzMOcU9G33k/2', 'Field Salesman', '+92-301-9876543', 3, TRUE)
ON DUPLICATE KEY UPDATE username = username;

-- Verification
-- SELECT u.id, u.username, u.email, u.full_name, r.role_name, u.is_active 
-- FROM users u 
-- JOIN roles r ON u.role_id = r.id;

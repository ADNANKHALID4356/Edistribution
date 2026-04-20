-- Fix user passwords - Sprint 1
-- Password for all test users: admin123

UPDATE users 
SET password = '$2b$10$1VlDgPmzdM08zf907Qm0/O4/3XKxqIaU8Uy/fcbwwzMOcU9G33k/2'
WHERE username IN ('admin', 'manager1', 'salesman1');

-- Verify update
SELECT username, email, full_name, LEFT(password, 20) as password_start
FROM users 
WHERE username IN ('admin', 'manager1', 'salesman1');

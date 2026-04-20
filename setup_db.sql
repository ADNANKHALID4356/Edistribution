CREATE DATABASE IF NOT EXISTS distribution_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'dist_user'@'localhost' IDENTIFIED BY 'Dist2025Secure';
GRANT ALL PRIVILEGES ON distribution_db.* TO 'dist_user'@'localhost';
FLUSH PRIVILEGES;

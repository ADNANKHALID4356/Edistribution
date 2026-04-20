-- Migration: Create salesman_ledger table
-- Purpose: Track salary, advances, commissions, and other payments for salesmen

-- Create salesman_ledger table
CREATE TABLE IF NOT EXISTS salesman_ledger (
    id INT PRIMARY KEY AUTO_INCREMENT,
    salesman_id INT NOT NULL,
    salesman_name VARCHAR(255),
    transaction_date DATE NOT NULL,
    transaction_type ENUM('salary', 'advance', 'commission', 'bonus', 'deduction', 'refund', 'adjustment') DEFAULT 'salary',
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100),
    description TEXT,
    notes TEXT,
    created_by INT,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_salesman_id (salesman_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT '✅ Successfully created salesman_ledger table' AS status;

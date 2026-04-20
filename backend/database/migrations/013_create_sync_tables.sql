-- Sprint 9: Create Sync Tracking Tables
-- Distribution Management System - Mobile Order Syncing Part 1
-- Company: Ummahtechinnovations.com

-- Create sync_logs table for audit trail
CREATE TABLE IF NOT EXISTS sync_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    salesman_id INT NOT NULL,
    entity_type ENUM('order', 'product', 'shop', 'route', 'invoice', 'delivery') NOT NULL,
    entity_id VARCHAR(100) NULL COMMENT 'ID of synced entity (mobile_order_id or table ID)',
    action ENUM('upload', 'download', 'update', 'delete') NOT NULL,
    status ENUM('success', 'failed', 'partial') NOT NULL,
    records_count INT DEFAULT 0 COMMENT 'Number of records processed',
    error_message TEXT NULL,
    sync_duration INT NULL COMMENT 'Sync duration in milliseconds',
    device_info JSON NULL COMMENT 'Mobile device information',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_salesman_id (salesman_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_timestamp (timestamp),
    INDEX idx_salesman_entity (salesman_id, entity_type, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Audit trail of all sync operations from mobile devices';

-- Create sync_queue table for offline order queue
CREATE TABLE IF NOT EXISTS sync_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    salesman_id INT NOT NULL,
    entity_type ENUM('order', 'product', 'shop', 'route') NOT NULL,
    entity_data JSON NOT NULL COMMENT 'Complete entity data in JSON format',
    priority TINYINT DEFAULT 5 COMMENT 'Priority 1-10, 1 is highest',
    attempts INT DEFAULT 0 COMMENT 'Number of sync attempts',
    max_attempts INT DEFAULT 5 COMMENT 'Maximum retry attempts',
    last_attempt_at TIMESTAMP NULL,
    last_error TEXT NULL,
    status ENUM('pending', 'processing', 'failed', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_salesman_id (salesman_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_priority (priority),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_salesman_status (salesman_id, status, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Queue for orders waiting to sync when mobile device is offline';

-- Create sync_conflicts table for conflict resolution
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    salesman_id INT NOT NULL,
    entity_type ENUM('order', 'product', 'shop', 'route') NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    mobile_data JSON NOT NULL COMMENT 'Data from mobile device',
    server_data JSON NOT NULL COMMENT 'Current data on server',
    conflict_type ENUM('version', 'timestamp', 'data') NOT NULL,
    resolution_strategy ENUM('server_wins', 'mobile_wins', 'manual', 'merge') DEFAULT 'server_wins',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP NULL,
    resolved_by INT NULL COMMENT 'User ID who resolved conflict',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_salesman_id (salesman_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_resolved (resolved),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Tracks conflicts between mobile and server data during sync';

-- Create sync_statistics table for monitoring
CREATE TABLE IF NOT EXISTS sync_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    salesman_id INT NOT NULL,
    sync_date DATE NOT NULL,
    total_syncs INT DEFAULT 0,
    successful_syncs INT DEFAULT 0,
    failed_syncs INT DEFAULT 0,
    orders_uploaded INT DEFAULT 0,
    products_downloaded INT DEFAULT 0,
    shops_downloaded INT DEFAULT 0,
    routes_downloaded INT DEFAULT 0,
    avg_sync_duration INT NULL COMMENT 'Average sync duration in milliseconds',
    total_data_size INT NULL COMMENT 'Total data transferred in bytes',
    last_sync_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (salesman_id) REFERENCES salesmen(id) ON DELETE CASCADE,
    
    -- Unique constraint
    UNIQUE KEY uk_salesman_date (salesman_id, sync_date),
    
    -- Indexes
    INDEX idx_salesman_id (salesman_id),
    INDEX idx_sync_date (sync_date),
    INDEX idx_last_sync_at (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT = 'Daily sync statistics for monitoring and analytics';

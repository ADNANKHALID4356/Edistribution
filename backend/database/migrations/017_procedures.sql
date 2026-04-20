-- =====================================================
-- Reserved Stock System - Stored Procedures
-- Part 2: Business logic procedures
-- =====================================================

USE distribution_system_db;

-- Drop existing procedures
DROP PROCEDURE IF EXISTS sp_reserve_stock_for_order;
DROP PROCEDURE IF EXISTS sp_release_stock_for_order;
DROP PROCEDURE IF EXISTS sp_deduct_stock_for_order;

DELIMITER $$

CREATE PROCEDURE sp_reserve_stock_for_order(
    IN p_order_id INT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12, 2);
    DECLARE v_stock_qty DECIMAL(12, 2);
    DECLARE v_reserved_qty DECIMAL(12, 2);
    DECLARE v_available DECIMAL(12, 2);
    DECLARE v_product_name VARCHAR(255);
    DECLARE v_order_number VARCHAR(50);
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_error_msg VARCHAR(500);
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity FROM order_details WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    START TRANSACTION;
    
    -- Get order number
    SELECT order_number INTO v_order_number FROM orders WHERE id = p_order_id;
    
    -- Check if already reserved
    SELECT stock_reserved INTO @already_reserved FROM orders WHERE id = p_order_id;
    IF @already_reserved = TRUE THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock already reserved for this order';
    END IF;
    
    OPEN order_items;
    
    read_loop: LOOP
        FETCH order_items INTO v_product_id, v_quantity;
        IF done THEN LEAVE read_loop; END IF;
        
        -- Get current stock
        SELECT stock_quantity, reserved_stock, product_name
        INTO v_stock_qty, v_reserved_qty, v_product_name
        FROM products WHERE id = v_product_id;
        
        SET v_available = v_stock_qty - v_reserved_qty;
        
        -- Check availability
        IF v_available < v_quantity THEN
            SET v_error_msg = CONCAT('Insufficient stock for ', v_product_name, 
                                    '. Available: ', v_available, ', Required: ', v_quantity);
            CLOSE order_items;
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_msg;
        END IF;
        
        -- Reserve stock
        UPDATE products 
        SET reserved_stock = reserved_stock + v_quantity 
        WHERE id = v_product_id;
        
        -- Log movement
        INSERT INTO stock_movements (
            product_id, movement_type, quantity,
            stock_before, stock_after, reserved_before, reserved_after,
            available_before, available_after, reference_type, reference_id,
            reference_number, notes, created_by
        ) VALUES (
            v_product_id, 'RESERVE', v_quantity,
            v_stock_qty, v_stock_qty, v_reserved_qty, v_reserved_qty + v_quantity,
            v_available, v_available - v_quantity, 'order', p_order_id,
            v_order_number, CONCAT('Reserved for order ', v_order_number), p_user_id
        );
    END LOOP;
    
    CLOSE order_items;
    
    -- Mark order
    UPDATE orders SET stock_reserved = TRUE WHERE id = p_order_id;
    
    COMMIT;
END$$

CREATE PROCEDURE sp_release_stock_for_order(
    IN p_order_id INT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12, 2);
    DECLARE v_stock_qty DECIMAL(12, 2);
    DECLARE v_reserved_qty DECIMAL(12, 2);
    DECLARE v_order_number VARCHAR(50);
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity FROM order_details WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    START TRANSACTION;
    
    SELECT order_number INTO v_order_number FROM orders WHERE id = p_order_id;
    
    -- Check if reserved
    SELECT stock_reserved INTO @was_reserved FROM orders WHERE id = p_order_id;
    IF @was_reserved = FALSE THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No stock reservation found';
    END IF;
    
    OPEN order_items;
    
    read_loop: LOOP
        FETCH order_items INTO v_product_id, v_quantity;
        IF done THEN LEAVE read_loop; END IF;
        
        SELECT stock_quantity, reserved_stock
        INTO v_stock_qty, v_reserved_qty
        FROM products WHERE id = v_product_id;
        
        -- Release reservation
        UPDATE products 
        SET reserved_stock = GREATEST(0, reserved_stock - v_quantity)
        WHERE id = v_product_id;
        
        -- Log movement
        INSERT INTO stock_movements (
            product_id, movement_type, quantity,
            stock_before, stock_after, reserved_before, reserved_after,
            available_before, available_after, reference_type, reference_id,
            reference_number, notes, created_by
        ) VALUES (
            v_product_id, 'RELEASE', v_quantity,
            v_stock_qty, v_stock_qty, v_reserved_qty, GREATEST(0, v_reserved_qty - v_quantity),
            v_stock_qty - v_reserved_qty, v_stock_qty - GREATEST(0, v_reserved_qty - v_quantity),
            'order', p_order_id, v_order_number,
            CONCAT('Released for cancelled order ', v_order_number), p_user_id
        );
    END LOOP;
    
    CLOSE order_items;
    
    UPDATE orders SET stock_reserved = FALSE WHERE id = p_order_id;
    
    COMMIT;
END$$

CREATE PROCEDURE sp_deduct_stock_for_order(
    IN p_order_id INT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_product_id INT;
    DECLARE v_quantity DECIMAL(12, 2);
    DECLARE v_stock_qty DECIMAL(12, 2);
    DECLARE v_reserved_qty DECIMAL(12, 2);
    DECLARE v_order_number VARCHAR(50);
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity FROM order_details WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    START TRANSACTION;
    
    SELECT order_number INTO v_order_number FROM orders WHERE id = p_order_id;
    
    -- Check if already deducted
    SELECT stock_deducted INTO @already_deducted FROM orders WHERE id = p_order_id;
    IF @already_deducted = TRUE THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock already deducted';
    END IF;
    
    OPEN order_items;
    
    read_loop: LOOP
        FETCH order_items INTO v_product_id, v_quantity;
        IF done THEN LEAVE read_loop; END IF;
        
        SELECT stock_quantity, reserved_stock
        INTO v_stock_qty, v_reserved_qty
        FROM products WHERE id = v_product_id;
        
        -- Deduct stock and release reservation
        UPDATE products 
        SET stock_quantity = stock_quantity - v_quantity,
            reserved_stock = GREATEST(0, reserved_stock - v_quantity)
        WHERE id = v_product_id;
        
        -- Log movement
        INSERT INTO stock_movements (
            product_id, movement_type, quantity,
            stock_before, stock_after, reserved_before, reserved_after,
            available_before, available_after, reference_type, reference_id,
            reference_number, notes, created_by
        ) VALUES (
            v_product_id, 'DEDUCT', v_quantity,
            v_stock_qty, v_stock_qty - v_quantity, v_reserved_qty, GREATEST(0, v_reserved_qty - v_quantity),
            v_stock_qty - v_reserved_qty, (v_stock_qty - v_quantity) - GREATEST(0, v_reserved_qty - v_quantity),
            'order', p_order_id, v_order_number,
            CONCAT('Deducted for finalized order ', v_order_number), p_user_id
        );
    END LOOP;
    
    CLOSE order_items;
    
    UPDATE orders SET stock_deducted = TRUE WHERE id = p_order_id;
    
    COMMIT;
END$$

DELIMITER ;

SELECT 'Stored procedures created successfully' AS Status;

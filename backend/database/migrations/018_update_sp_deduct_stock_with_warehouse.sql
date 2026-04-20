-- ============================================================
-- UPDATE STORED PROCEDURE TO DEDUCT WAREHOUSE STOCK
-- ============================================================
USE distribution_system_db;

DROP PROCEDURE IF EXISTS sp_deduct_stock_for_order$$

DELIMITER $$

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
    DECLARE v_default_warehouse_id INT;
    DECLARE v_warehouse_stock_qty DECIMAL(12, 2);
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE order_items CURSOR FOR 
        SELECT product_id, quantity FROM order_details WHERE order_id = p_order_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    START TRANSACTION;
    
    SELECT order_number INTO v_order_number FROM orders WHERE id = p_order_id;
    
    -- Get default warehouse ID
    SELECT id INTO v_default_warehouse_id FROM warehouses WHERE is_default = TRUE LIMIT 1;
    
    IF v_default_warehouse_id IS NULL THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No default warehouse configured';
    END IF;
    
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
        
        -- Get product stock
        SELECT stock_quantity, reserved_stock
        INTO v_stock_qty, v_reserved_qty
        FROM products WHERE id = v_product_id;
        
        -- Deduct from products table
        UPDATE products 
        SET stock_quantity = stock_quantity - v_quantity,
            reserved_stock = GREATEST(0, reserved_stock - v_quantity)
        WHERE id = v_product_id;
        
        -- ============================================================
        -- NEW: Deduct from warehouse_stock table
        -- ============================================================
        -- Check if product exists in warehouse
        SELECT quantity INTO v_warehouse_stock_qty
        FROM warehouse_stock
        WHERE warehouse_id = v_default_warehouse_id AND product_id = v_product_id;
        
        IF v_warehouse_stock_qty IS NOT NULL THEN
            -- Deduct from warehouse stock
            UPDATE warehouse_stock
            SET quantity = GREATEST(0, quantity - v_quantity),
                reserved_quantity = GREATEST(0, reserved_quantity - v_quantity)
            WHERE warehouse_id = v_default_warehouse_id AND product_id = v_product_id;
        ELSE
            -- Product doesn't exist in warehouse - create entry with 0 stock
            INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, reserved_quantity)
            VALUES (v_default_warehouse_id, v_product_id, 0, 0);
        END IF;
        
        -- Log movement
        INSERT INTO stock_movements (
            product_id, warehouse_id, movement_type, quantity,
            stock_before, stock_after, reserved_before, reserved_after,
            available_before, available_after, reference_type, reference_id,
            reference_number, notes, created_by
        ) VALUES (
            v_product_id, v_default_warehouse_id, 'DEDUCT', v_quantity,
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

SELECT 'sp_deduct_stock_for_order updated successfully with warehouse stock deduction' AS Status;

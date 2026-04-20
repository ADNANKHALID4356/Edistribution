/**
 * Fix sp_deduct_stock_for_order to validate available stock before deduction
 * This prevents negative stock situations
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixDeductProcedure() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'distribution_system_db',
      multipleStatements: true
    });

    console.log('✅ Connected to database');
    console.log('\n🔧 Dropping existing sp_deduct_stock_for_order procedure...');
    
    await connection.query('DROP PROCEDURE IF EXISTS sp_deduct_stock_for_order');
    console.log('✅ Procedure dropped');

    console.log('\n🔧 Creating updated sp_deduct_stock_for_order with stock validation...');
    
    const procedureSQL = `
CREATE PROCEDURE sp_deduct_stock_for_order(
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
    DECLARE v_error_msg VARCHAR(500);
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
        
        SELECT stock_quantity, reserved_stock, product_name
        INTO v_stock_qty, v_reserved_qty, v_product_name
        FROM products WHERE id = v_product_id;
        
        -- CRITICAL: Calculate available stock
        SET v_available = v_stock_qty - v_reserved_qty;
        
        -- CRITICAL: Validate available stock BEFORE deduction
        -- This prevents negative stock situations
        IF v_stock_qty < v_quantity THEN
            SET v_error_msg = CONCAT('Insufficient stock for ', v_product_name, 
                                    '. Current Stock: ', v_stock_qty, ', Required: ', v_quantity);
            CLOSE order_items;
            ROLLBACK;
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_error_msg;
        END IF;
        
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
            v_available, (v_stock_qty - v_quantity) - GREATEST(0, v_reserved_qty - v_quantity),
            'order', p_order_id, v_order_number,
            CONCAT('Deducted for finalized order ', v_order_number), p_user_id
        );
    END LOOP;
    
    CLOSE order_items;
    
    UPDATE orders SET stock_deducted = TRUE WHERE id = p_order_id;
    
    COMMIT;
END`;

    await connection.query(procedureSQL);
    console.log('✅ Procedure created successfully with stock validation');
    
    console.log('\n✅ ========================================');
    console.log('✅ PROCEDURE UPDATE COMPLETE');
    console.log('✅ ========================================');
    console.log('\n📋 Changes made:');
    console.log('   - Added available stock calculation');
    console.log('   - Added validation before deduction');
    console.log('   - Will now reject finalization if insufficient stock');
    console.log('   - Prevents negative stock situations');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Database connection closed');
    }
  }
}

fixDeductProcedure();

/**
 * Stock Return Model
 * Handles partial delivery returns and stock re-addition
 * Company: Ummahtechinnovations.com
 */

const db = require('../config/database');

class StockReturn {
  /**
   * Generate unique return number
   */
  static async generateReturnNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const prefix = `RET-${dateStr}`;

    const [result] = await db.query(
      `SELECT return_number FROM stock_returns WHERE return_number LIKE ? ORDER BY return_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let sequence = 1;
    if (result && result.length > 0) {
      const matches = result[0].return_number.match(/-(\d{4})$/);
      if (matches) {
        sequence = parseInt(matches[1]) + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Process a stock return from a delivery
   * @param {Object} returnData - Return header data
   * @param {Array} returnItems - Array of items being returned
   * @param {Number} userId - User processing the return
   */
  static async processReturn(returnData, returnItems, userId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();
      console.log('\n🔄 ========== STOCK RETURN: PROCESSING ==========');
      console.log('📥 Return Data:', JSON.stringify(returnData, null, 2));
      console.log('📥 Items:', JSON.stringify(returnItems, null, 2));

      // 1. Validate delivery exists and is delivered
      const [deliveries] = await connection.query(
        'SELECT * FROM deliveries WHERE id = ?',
        [returnData.delivery_id]
      );

      if (deliveries.length === 0) {
        throw new Error('Delivery not found');
      }

      const delivery = deliveries[0];

      if (delivery.status === 'cancelled') {
        throw new Error(`Cannot process return for delivery with status: ${delivery.status}. Delivery must not be "cancelled".`);
      }

      // 2. Get delivery items
      const [deliveryItems] = await connection.query(
        'SELECT * FROM delivery_items WHERE delivery_id = ?',
        [returnData.delivery_id]
      );

      // 3. Validate return quantities
      for (const returnItem of returnItems) {
        if (returnItem.quantity_returned <= 0) continue;

        const deliveryItem = deliveryItems.find(di => di.id === returnItem.delivery_item_id);
        if (!deliveryItem) {
          throw new Error(`Delivery item ID ${returnItem.delivery_item_id} not found`);
        }

        const alreadyReturned = parseInt(deliveryItem.quantity_returned) || 0;
        const maxReturnable = parseInt(deliveryItem.quantity_delivered) - alreadyReturned;

        if (returnItem.quantity_returned > maxReturnable) {
          throw new Error(
            `Cannot return ${returnItem.quantity_returned} of ${deliveryItem.product_name}. ` +
            `Max returnable: ${maxReturnable} (delivered: ${deliveryItem.quantity_delivered}, already returned: ${alreadyReturned})`
          );
        }
      }

      // 4. Generate return number
      const returnNumber = await StockReturn.generateReturnNumber();
      console.log('📋 Generated return number:', returnNumber);

      // 5. Calculate totals
      const validItems = returnItems.filter(i => i.quantity_returned > 0);
      const totalItems = validItems.length;
      const totalQuantityReturned = validItems.reduce((sum, i) => sum + parseInt(i.quantity_returned), 0);
      const totalReturnAmount = validItems.reduce((sum, i) => {
        const itemVal = i.return_amount !== undefined ? parseFloat(i.return_amount) : 0;
        return sum + itemVal;
      }, 0);

      // 6. Insert stock_returns header
      // Convert return_date to MySQL-compatible format
      let returnDate = returnData.return_date || new Date();
      if (typeof returnDate === 'string') {
        returnDate = new Date(returnDate);
      }
      const mysqlDate = returnDate.toISOString().slice(0, 19).replace('T', ' ');

      const [result] = await connection.query(`
        INSERT INTO stock_returns (
          return_number, delivery_id, challan_number,
          shop_id, shop_name, route_id, route_name,
          salesman_id, salesman_name, warehouse_id,
          return_date, total_items, total_quantity_returned,
          total_return_amount, reason, notes, status,
          created_by, created_by_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        returnNumber,
        returnData.delivery_id,
        delivery.challan_number,
        delivery.shop_id,
        delivery.shop_name,
        delivery.route_id,
        delivery.route_name,
        delivery.salesman_id,
        delivery.salesman_name,
        delivery.warehouse_id,
        mysqlDate,
        totalItems,
        totalQuantityReturned,
        totalReturnAmount,
        returnData.reason || null,
        returnData.notes || null,
        'completed',
        userId,
        returnData.created_by_name || null
      ]);

      const returnId = result.insertId;
      console.log('✅ Return header created with ID:', returnId);

      // 7. Insert return items and update stock
      for (const returnItem of validItems) {
        const deliveryItem = deliveryItems.find(di => di.id === returnItem.delivery_item_id);

        // Insert return item
        await connection.query(`
          INSERT INTO stock_return_items (
            return_id, delivery_item_id, product_id, product_name, product_code,
            quantity_delivered, quantity_returned, unit_price, return_amount,
            reason, condition_status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          returnId,
          returnItem.delivery_item_id,
          deliveryItem.product_id,
          deliveryItem.product_name,
          deliveryItem.product_code,
          deliveryItem.quantity_delivered,
          returnItem.quantity_returned,
          deliveryItem.unit_price,
            returnItem.return_amount !== undefined ? returnItem.return_amount : (returnItem.quantity_returned * parseFloat(deliveryItem.unit_price)),
        ]);

        // 8. Update delivery_items quantity_returned
        await connection.query(`
          UPDATE delivery_items
          SET quantity_returned = quantity_returned + ?
          WHERE id = ?
        `, [returnItem.quantity_returned, returnItem.delivery_item_id]);

        // 9. Re-add stock to warehouse
        await connection.query(`
          UPDATE warehouse_stock
          SET quantity = quantity + ?
          WHERE warehouse_id = ? AND product_id = ?
        `, [returnItem.quantity_returned, delivery.warehouse_id, deliveryItem.product_id]);

        // 10. Update product main stock_quantity
        await connection.query(`
          UPDATE products
          SET stock_quantity = stock_quantity + ?
          WHERE id = ?
        `, [returnItem.quantity_returned, deliveryItem.product_id]);

        // 11. Log stock movement
        await connection.query(`
          INSERT INTO stock_movements (
            product_id, warehouse_id, movement_type, quantity,
            reference_type, reference_id, reference_number,
            notes, created_by
          ) VALUES (?, ?, 'RETURN', ?, 'stock_return', ?, ?, ?, ?)
        `, [
          deliveryItem.product_id,
          delivery.warehouse_id,
          returnItem.quantity_returned,
          returnId,
          returnNumber,
          `Return from delivery ${delivery.challan_number}: ${returnItem.quantity_returned} units of ${deliveryItem.product_name}`,
          userId
        ]);

        console.log(`   ✅ Returned ${returnItem.quantity_returned}x ${deliveryItem.product_name} → warehouse stock updated`);
      }

      // 12. Update delivery totals
      const [updatedItems] = await connection.query(
        'SELECT * FROM delivery_items WHERE delivery_id = ?',
        [returnData.delivery_id]
      );

      const newTotalQuantity = updatedItems.reduce((sum, i) => sum + (parseInt(i.quantity_delivered) - parseInt(i.quantity_returned || 0)), 0);
      const newTotalAmount = updatedItems.reduce((sum, i) => {
        const effectiveQty = parseInt(i.quantity_delivered) - parseInt(i.quantity_returned || 0);
        return sum + (effectiveQty * parseFloat(i.unit_price));
      }, 0);

      await connection.query(`
        UPDATE deliveries
        SET total_quantity = ?, total_amount = ?, grand_total = ?
        WHERE id = ?
      `, [newTotalQuantity, newTotalAmount, newTotalAmount, returnData.delivery_id]);

      // 13. Create reverse ledger entry (credit to reduce shop debt)
      const ShopLedger = require('./ShopLedger');
      await ShopLedger.createEntry({
        shop_id: delivery.shop_id,
        shop_name: delivery.shop_name,
        transaction_date: mysqlDate,
        transaction_type: 'return',
        reference_type: 'stock_return',
        reference_id: returnId,
        reference_number: returnNumber,
        debit_amount: 0,
        credit_amount: 0,
        description: `Stock Return ${returnNumber} - ${totalQuantityReturned} items returned from ${delivery.challan_number}`,
        notes: returnData.reason || 'Partial delivery return',
        created_by: userId,
        is_manual: 0
      }, connection);

      // Reduce shop balance by return amount
      const [prevEntries] = await connection.query(`
        SELECT balance FROM shop_ledger
        WHERE shop_id = ?
        ORDER BY id DESC
        LIMIT 1
      `, [delivery.shop_id]);

      const previousBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
      const newBalance = previousBalance - totalReturnAmount;

      // Update ledger entry we just created with correct amounts
      await connection.query(`
        UPDATE shop_ledger
        SET debit_amount = 0, credit_amount = 0, balance = ?
        WHERE reference_type = 'stock_return' AND reference_id = ?
        ORDER BY id DESC LIMIT 1
      `, [newBalance, returnId]);

      // Actually create a proper debit entry (reduces shop's debt)
      // Delete the placeholder and create correct one
      await connection.query(`
        DELETE FROM shop_ledger
        WHERE reference_type = 'stock_return' AND reference_id = ?
      `, [returnId]);

      await ShopLedger.createEntry({
        shop_id: delivery.shop_id,
        shop_name: delivery.shop_name,
        transaction_date: mysqlDate,
        transaction_type: 'return',
        reference_type: 'stock_return',
        reference_id: returnId,
        reference_number: returnNumber,
        debit_amount: totalReturnAmount, // Debit = reduces shop debt
        credit_amount: 0,
        description: `Stock Return ${returnNumber} - ${totalQuantityReturned} items returned from delivery ${delivery.challan_number}`,
        notes: returnData.reason || 'Partial delivery return',
        created_by: userId,
        is_manual: 0
      }, connection);

      await connection.commit();

      console.log('✅ Stock return processed successfully');
      console.log(`   Return #: ${returnNumber}`);
      console.log(`   Items: ${totalItems}, Qty: ${totalQuantityReturned}`);
      console.log(`   Amount: ${totalReturnAmount}`);
      console.log('🔄 ========== STOCK RETURN: COMPLETE ==========\n');

      return await StockReturn.getById(returnId);
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error processing stock return:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get return by ID with items
   */
  static async getById(id) {
    const [returns] = await db.query(
      'SELECT * FROM stock_returns WHERE id = ?',
      [id]
    );

    if (returns.length === 0) return null;

    const stockReturn = returns[0];
    const [items] = await db.query(
      'SELECT * FROM stock_return_items WHERE return_id = ? ORDER BY id',
      [id]
    );

    stockReturn.items = items;
    return stockReturn;
  }

  /**
   * Get all returns with pagination and filters
   */
  static async getAll(filters = {}) {
    let query = 'SELECT * FROM stock_returns WHERE 1=1';
    const params = [];

    if (filters.delivery_id) {
      query += ' AND delivery_id = ?';
      params.push(filters.delivery_id);
    }

    if (filters.shop_id) {
      query += ' AND shop_id = ?';
      params.push(filters.shop_id);
    }

    if (filters.start_date) {
      query += ' AND return_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND return_date <= ?';
      params.push(filters.end_date);
    }

    if (filters.search) {
      query += ' AND (return_number LIKE ? OR shop_name LIKE ? OR challan_number LIKE ?)';
      const s = `%${filters.search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY created_at DESC';

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const offset = (page - 1) * limit;

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [returns] = await db.query(query, params);

    // Load items for each return
    for (const ret of returns) {
      const [items] = await db.query(
        'SELECT * FROM stock_return_items WHERE return_id = ?',
        [ret.id]
      );
      ret.items = items;
    }

    return {
      returns,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  /**
   * Get returns for a specific delivery
   */
  static async getByDeliveryId(deliveryId) {
    const [returns] = await db.query(
      'SELECT * FROM stock_returns WHERE delivery_id = ? ORDER BY created_at DESC',
      [deliveryId]
    );

    for (const ret of returns) {
      const [items] = await db.query(
        'SELECT * FROM stock_return_items WHERE return_id = ?',
        [ret.id]
      );
      ret.items = items;
    }

    return returns;
  }

  /**
   * Get return statistics
   */
  static async getStatistics(filters = {}) {
    let whereClause = '';
    const params = [];

    if (filters.start_date) {
      whereClause += ' AND return_date >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      whereClause += ' AND return_date <= ?';
      params.push(filters.end_date);
    }

    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total_returns,
        COALESCE(SUM(total_quantity_returned), 0) as total_quantity,
        COALESCE(SUM(total_return_amount), 0) as total_amount
      FROM stock_returns
      WHERE 1=1 ${whereClause}
    `, params);

    return stats[0];
  }
}

module.exports = StockReturn;

// Delivery Model
// Purpose: Manage delivery challan data and operations

const db = require('../config/database');
const shopLedger = require('./ShopLedger');

// Database type detection
const useSQLite = process.env.USE_SQLITE === 'true';
console.log(`📊 Delivery Model: Using ${useSQLite ? 'SQLite' : 'MySQL'} database (USE_SQLITE=${process.env.USE_SQLITE})`);

class Delivery {
  /**
   * Generate unique challan number
   */
  static async generateChallanNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get last challan number for today
    const [lastChallan] = await db.query(
      `SELECT challan_number FROM deliveries 
       WHERE challan_number LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [`DC-${dateStr}-%`]
    );

    let sequence = 1;
    if (lastChallan.length > 0) {
      const lastNum = lastChallan[0].challan_number.split('-')[2];
      sequence = parseInt(lastNum) + 1;
    }

    return `DC-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Get all deliveries with filters and pagination
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          d.*,
          d.receiver_name as received_by,
          d.updated_at as delivered_date,
          w.name as warehouse_name,
          COUNT(DISTINCT di.id) as items_count
        FROM deliveries d
        LEFT JOIN warehouses w ON d.warehouse_id = w.id
        LEFT JOIN delivery_items di ON d.id = di.delivery_id
      `;
      
      const conditions = [];
      const params = [];

      if (filters.status) {
        conditions.push('d.status = ?');
        params.push(filters.status);
      }

      if (filters.warehouse_id) {
        conditions.push('d.warehouse_id = ?');
        params.push(filters.warehouse_id);
      }

      if (filters.route_id) {
        conditions.push('d.route_id = ?');
        params.push(filters.route_id);
      }

      if (filters.shop_id) {
        conditions.push('d.shop_id = ?');
        params.push(filters.shop_id);
      }

      if (filters.invoice_id) {
        conditions.push('d.invoice_id = ?');
        params.push(filters.invoice_id);
      }

      if (filters.order_id) {
        conditions.push('d.order_id = ?');
        params.push(filters.order_id);
      }

      if (filters.start_date) {
        conditions.push('d.delivery_date >= ?');
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push('d.delivery_date <= ?');
        params.push(filters.end_date);
      }

      if (filters.driver_name) {
        conditions.push('d.driver_name LIKE ?');
        params.push(`%${filters.driver_name}%`);
      }

      if (filters.search) {
        conditions.push('(d.challan_number LIKE ? OR d.shop_name LIKE ? OR d.driver_name LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' GROUP BY d.id ORDER BY d.created_at DESC';

      // Add pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const offset = (page - 1) * limit;

      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [rows] = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM deliveries d';
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }
      const [countResult] = await db.query(countQuery, params.slice(0, -2)); // Remove limit/offset params

      return {
        deliveries: rows,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error fetching deliveries:', error);
      throw error;
    }
  }

  /**
   * Get deliveries with items for load sheet generation
   */
  static async getAllWithItems(filters = {}) {
    try {
      let query = `
        SELECT 
          d.*,
          w.name as warehouse_name
        FROM deliveries d
        LEFT JOIN warehouses w ON d.warehouse_id = w.id
      `;
      
      const conditions = [];
      const params = [];

      if (filters.status) {
        conditions.push('d.status = ?');
        params.push(filters.status);
      }

      if (filters.warehouse_id) {
        conditions.push('d.warehouse_id = ?');
        params.push(filters.warehouse_id);
      }

      if (filters.route_id) {
        conditions.push('d.route_id = ?');
        params.push(filters.route_id);
      }

      if (filters.invoice_id) {
        conditions.push('d.invoice_id = ?');
        params.push(filters.invoice_id);
      }

      if (filters.order_id) {
        conditions.push('d.order_id = ?');
        params.push(filters.order_id);
      }

      if (filters.start_date || filters.from_date) {
        conditions.push('d.delivery_date >= ?');
        params.push(filters.start_date || filters.from_date);
      }

      if (filters.end_date || filters.to_date) {
        conditions.push('d.delivery_date <= ?');
        params.push(filters.end_date || filters.to_date);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY d.delivery_date, d.created_at';

      const limit = parseInt(filters.limit) || 1000;
      query += ` LIMIT ?`;
      params.push(limit);

      const [deliveries] = await db.query(query, params);

      // Fetch items for each delivery
      for (const delivery of deliveries) {
        const [items] = await db.query(`
          SELECT 
            di.*,
            p.product_name,
            p.product_code,
            p.pack_size
          FROM delivery_items di
          LEFT JOIN products p ON di.product_id = p.id
          WHERE di.delivery_id = ?
          ORDER BY di.id
        `, [delivery.id]);
        
        // Map to consistent field names for frontend
        delivery.items = items.map(item => ({
          ...item,
          quantity: item.quantity_delivered || 0,
          price: item.unit_price || 0,
          total: item.total_price || 0,
          unit: item.pack_size || 'pcs'
        }));
      }

      return deliveries;
    } catch (error) {
      console.error('❌ Error fetching deliveries with items:', error);
      throw error;
    }
  }

  /**
   * Get delivery by ID with items
   */
  static async getById(id) {
    try {
      const [deliveries] = await db.query(`
        SELECT 
          d.*,
          d.receiver_name as received_by,
          d.updated_at as delivered_date,
          w.name as warehouse_name,
          w.address as warehouse_address,
          s.current_balance as shop_current_balance,
          s.credit_limit as shop_credit_limit
        FROM deliveries d
        LEFT JOIN warehouses w ON d.warehouse_id = w.id
        LEFT JOIN shops s ON d.shop_id = s.id
        WHERE d.id = ?
      `, [id]);

      if (deliveries.length === 0) {
        return null;
      }

      const delivery = deliveries[0];

      // Get delivery items
      const [items] = await db.query(`
        SELECT 
          di.*,
          p.pack_size
        FROM delivery_items di
        LEFT JOIN products p ON di.product_id = p.id
        WHERE di.delivery_id = ?
        ORDER BY di.id
      `, [id]);

      delivery.items = items;
      return delivery;
    } catch (error) {
      console.error('❌ Error fetching delivery by ID:', error);
      throw error;
    }
  }

  /**
   * Create new delivery challan
   */
  static async create(deliveryData, items, userId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      console.log('\n🟢 ========== DELIVERY MODEL: CREATE ==========');
      console.log('📥 Received deliveryData:', JSON.stringify(deliveryData, null, 2));
      console.log('📥 Received items:', JSON.stringify(items, null, 2));

      // Generate challan number
      const challanNumber = await this.generateChallanNumber();
      console.log('📋 Generated challan number:', challanNumber);

      // Calculate totals
      const totalItems = items.length;
      const totalQuantity = items.reduce((sum, item) => 
        sum + parseFloat(item.quantity_ordered || item.quantity || 0), 0
      );
      const totalAmount = items.reduce((sum, item) => 
        sum + parseFloat(item.total_price || 0), 0
      );

      // Extract invoice-level charges (including discount)
      const subtotal = parseFloat(deliveryData.subtotal) || totalAmount;
      const discountPercentage = parseFloat(deliveryData.discount_percentage) || 0;
      const discountAmount = parseFloat(deliveryData.discount_amount) || 0;
      const taxPercentage = parseFloat(deliveryData.tax_percentage) || 0;
      const taxAmount = parseFloat(deliveryData.tax_amount) || 0;
      const shippingCharges = parseFloat(deliveryData.shipping_charges) || 0;
      const otherCharges = parseFloat(deliveryData.other_charges) || 0;
      const roundOff = parseFloat(deliveryData.round_off) || 0;
      const grandTotal = parseFloat(deliveryData.grand_total) || (subtotal - discountAmount + taxAmount + shippingCharges + otherCharges + roundOff);

      console.log('📊 Calculated totals:');
      console.log('   - Total Items:', totalItems);
      console.log('   - Total Quantity:', totalQuantity);
      console.log('   - Items Total Amount:', totalAmount);
      console.log('   - Subtotal:', subtotal);
      console.log('   - Discount:', discountAmount, `(${discountPercentage}%)`);
      console.log('   - Tax:', taxAmount, `(${taxPercentage}%)`);
      console.log('   - Shipping Charges:', shippingCharges);
      console.log('   - Other Charges:', otherCharges);
      console.log('   - Round Off:', roundOff);
      console.log('   - GRAND TOTAL:', grandTotal);
      console.log('📦 Inserting delivery with:');
      console.log('   - invoice_id:', deliveryData.invoice_id || null);
      console.log('   - order_id:', deliveryData.order_id || null);
      console.log('   - shop_id:', deliveryData.shop_id || null);
      console.log('   - shop_name:', deliveryData.shop_name || null);
      console.log('   - route_id:', deliveryData.route_id || null);
      console.log('   - salesman_id:', deliveryData.salesman_id || null);

      // Insert delivery
      const [result] = await connection.query(`
        INSERT INTO deliveries (
          challan_number, invoice_id, order_id, warehouse_id,
          delivery_date, expected_delivery_time,
          driver_name, driver_phone, driver_cnic, vehicle_number, vehicle_type,
          shop_id, shop_name, shop_address, shop_contact, delivery_address,
          route_id, route_name, salesman_id, salesman_name,
          status, total_items, total_quantity, total_amount,
          subtotal, discount_percentage, discount_amount, tax_percentage, tax_amount, shipping_charges, other_charges, round_off, grand_total,
          notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        challanNumber,
        deliveryData.invoice_id || null,
        deliveryData.order_id || null,
        deliveryData.warehouse_id || null,
        deliveryData.delivery_date || null,
        deliveryData.expected_delivery_time || null,
        deliveryData.driver_name || null,
        deliveryData.driver_phone || null,
        deliveryData.driver_cnic || null,
        deliveryData.vehicle_number || null,
        deliveryData.vehicle_type || null,
        deliveryData.shop_id || null,
        deliveryData.shop_name || null,
        deliveryData.shop_address || null,
        deliveryData.shop_contact || null,
        deliveryData.delivery_address || null,
        deliveryData.route_id || null,
        deliveryData.route_name || null,
        deliveryData.salesman_id || null,
        deliveryData.salesman_name || null,
        'pending',
        totalItems,
        totalQuantity,
        totalAmount,
        subtotal,
        discountPercentage,
        discountAmount,
        taxPercentage,
        taxAmount,
        shippingCharges,
        otherCharges,
        roundOff,
        grandTotal,
        deliveryData.notes || null,
        userId
      ]);

      const deliveryId = result.insertId;
      console.log('✅ Delivery inserted with ID:', deliveryId);

      // Insert delivery items
      console.log('📦 Inserting', items.length, 'delivery items...');
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`\n   🔹 Item ${i + 1}:`);
        console.log('      - product_id:', item.product_id);
        console.log('      - product_name:', item.product_name);
        console.log('      - quantity_ordered:', item.quantity_ordered || item.quantity);
        console.log('      - unit_price:', item.unit_price);
        console.log('      - total_price:', item.total_price);
        
        const quantityToUse = item.quantity_ordered || item.quantity;
        const unitPriceToUse = item.unit_price || 0;
        const totalPriceToUse = item.total_price || (quantityToUse * unitPriceToUse);
        const discountPercentage = item.discount_percentage || 0;
        const discountAmount = item.discount_amount || 0;
        const taxPercentage = item.tax_percentage || 0;
        const taxAmount = item.tax_amount || 0;
        const netAmount = item.net_amount || totalPriceToUse;
        
        console.log('      ✅ Values to INSERT:');
        console.log('         - quantity_ordered:', quantityToUse);
        console.log('         - quantity_delivered:', quantityToUse);
        console.log('         - unit_price:', unitPriceToUse);
        console.log('         - total_price (gross):', totalPriceToUse);
        console.log('         - discount_percentage:', discountPercentage);
        console.log('         - discount_amount:', discountAmount);
        console.log('         - tax_percentage:', taxPercentage);
        console.log('         - tax_amount:', taxAmount);
        console.log('         - net_amount:', netAmount);
        
          // Get current purchase cost
          const [costRes] = await connection.query('SELECT purchase_price FROM products WHERE id = ?', [item.product_id]);
          const unitPurchaseCost = costRes.length > 0 ? parseFloat(costRes[0].purchase_price || 0) : 0;
          console.log('         - unit_purchase_cost:', unitPurchaseCost);

          await connection.query(`
            INSERT INTO delivery_items (
              delivery_id, product_id, product_name, product_code,
              quantity_ordered, quantity_delivered, quantity_returned,
              unit_price, total_price, discount_percentage, discount_amount,
              tax_percentage, tax_amount, net_amount, unit_purchase_cost,
              batch_number, expiry_date, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            deliveryId,
            item.product_id,
            item.product_name,
            item.product_code || null,
            quantityToUse,
            quantityToUse,
            item.quantity_returned || 0,
            unitPriceToUse,
            totalPriceToUse,
            discountPercentage,
            discountAmount,
            taxPercentage,
            taxAmount,
            netAmount,
            unitPurchaseCost,
        ]);

        if (deliveryData.warehouse_id) {
          await connection.query(`
            UPDATE warehouse_stock 
            SET reserved_quantity = reserved_quantity + ?
            WHERE warehouse_id = ? AND product_id = ?
          `, [quantityToUse, deliveryData.warehouse_id, item.product_id]);
          console.log('      ✅ Item inserted and stock reserved');
        } else {
          console.log('      ✅ Item inserted (no warehouse — stock not reserved)');
        }
      }

      console.log('✅ All delivery items inserted successfully');
      await connection.commit();
      console.log('✅ Transaction committed');
      
      const createdDelivery = await this.getById(deliveryId);
      console.log('✅ Delivery retrieved:', createdDelivery.challan_number);
      console.log('🟢 ========== DELIVERY MODEL: CREATE COMPLETE ==========\n');
      
      return createdDelivery;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creating delivery:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update delivery status
   */
  static async updateStatus(id, status, updateData = {}) {
    try {
      const updates = ['status = ?'];
      const params = [status];

      // Map to actual DB column names
      const receiverName = updateData.receiver_name || updateData.received_by;
      const notes = updateData.notes || updateData.remarks;

      if (status === 'delivered') {
        if (receiverName) {
          updates.push('receiver_name = ?');
          params.push(receiverName);
        }

        // Get delivery details to check if it was created from an order
        const [delivery] = await db.query(
          'SELECT warehouse_id, order_id, shop_id, challan_number FROM deliveries WHERE id = ?',
          [id]
        );

        if (delivery.length > 0) {
          const [items] = await db.query(
            'SELECT * FROM delivery_items WHERE delivery_id = ?',
            [id]
          );

          if (delivery[0].order_id) {
            // Delivery was created from an order — stock was already deducted
            // at order creation time. Only release the warehouse reservation.
            for (const item of items) {
              await db.query(`
                UPDATE warehouse_stock 
                SET reserved_quantity = CASE 
                  WHEN reserved_quantity >= ? THEN reserved_quantity - ?
                  ELSE 0
                END
                WHERE warehouse_id = ? AND product_id = ?
              `, [
                item.quantity_delivered,
                item.quantity_delivered,
                delivery[0].warehouse_id,
                item.product_id
              ]);
            }
          } else {
            // Independent delivery (no order) — deduct stock now
            for (const item of items) {
              await db.query(`
                UPDATE warehouse_stock 
                SET 
                  quantity = CASE 
                    WHEN quantity >= ? THEN quantity - ?
                    ELSE 0
                  END,
                  reserved_quantity = CASE 
                    WHEN reserved_quantity >= ? THEN reserved_quantity - ?
                    ELSE 0
                  END
                WHERE warehouse_id = ? AND product_id = ?
              `, [
                item.quantity_delivered,
                item.quantity_delivered,
                item.quantity_delivered,
                item.quantity_delivered,
                delivery[0].warehouse_id,
                item.product_id
              ]);

              // Also deduct from global product stock for independent deliveries
              await db.query(
                'UPDATE products SET stock_quantity = CASE WHEN stock_quantity >= ? THEN stock_quantity - ? ELSE 0 END WHERE id = ?',
                [item.quantity_delivered, item.quantity_delivered, item.product_id]
              );
            }
          }

          // Update the associated order status to 'delivered' if applicable
          if (delivery[0].order_id) {
            await db.query(
              'UPDATE orders SET status = ? WHERE id = ?',
              ['delivered', delivery[0].order_id]
            );
            console.log(`✅ Order ${delivery[0].order_id} status updated to delivered`);
          }

          // -- FINANCIAL LEDGER INTEGRATION (INVOICE BYPASS) --
          // Bypass Invoice and directly post delivery amount to shop ledger
          if (delivery[0].shop_id) {
            let totalAmount = 0;
            
            if (delivery[0].order_id) {
               const [delTotals] = await db.query(`
                 SELECT SUM(di.quantity_delivered * (od.net_price / NULLIF(od.quantity, 0))) as total
                 FROM delivery_items di
                 JOIN order_details od ON di.product_id = od.product_id AND od.order_id = ?
                 WHERE di.delivery_id = ?
               `, [delivery[0].order_id, id]);
               
               totalAmount = delTotals[0]?.total || 0;
            } else {
               const [delTotals] = await db.query(`
                 SELECT SUM(COALESCE(net_amount, total_price, quantity_delivered * unit_price, 0)) as total
                 FROM delivery_items 
                 WHERE delivery_id = ?
               `, [id]);
               
               totalAmount = delTotals[0]?.total || 0;
            }
            
            if (totalAmount > 0) {
              const [shopInfo] = await db.query('SELECT shop_name FROM shops WHERE id = ?', [delivery[0].shop_id]);
              
              await shopLedger.createEntry({
                shop_id: delivery[0].shop_id,
                shop_name: shopInfo.length > 0 ? shopInfo[0].shop_name : 'Unknown Shop',
                transaction_date: new Date(),
                transaction_type: 'Invoice',
                reference_type: 'Delivery',
                reference_id: id,
                reference_number: delivery[0].challan_number,
                debit_amount: 0,
                credit_amount: totalAmount,
                description: `Delivery Challan ${delivery[0].challan_number}`,
                created_by_name: updateData.updated_by_name || updateData.received_by || 'System',
                is_manual: 0
              });
              
              console.log(`🤑 [LEDGER INTEGRATED] Posted Delivery ${delivery[0].challan_number} sum of ${totalAmount} directly as Invoice debt to Shop ${delivery[0].shop_id}`);
            }
          }
        }
      } else if (status === 'cancelled' || status === 'returned') {
        // Release reserved stock without reducing actual stock
        const [items] = await db.query(
          'SELECT * FROM delivery_items WHERE delivery_id = ?',
          [id]
        );

        const [delivery] = await db.query(
          'SELECT warehouse_id FROM deliveries WHERE id = ?',
          [id]
        );

        if (delivery.length > 0) {
          for (const item of items) {
            await db.query(`
              UPDATE warehouse_stock 
              SET reserved_quantity = CASE 
                WHEN reserved_quantity >= ? THEN reserved_quantity - ?
                ELSE 0
              END
              WHERE warehouse_id = ? AND product_id = ?
            `, [
              item.quantity_delivered,
              item.quantity_delivered,
              delivery[0].warehouse_id,
              item.product_id
            ]);
          }
        }
      }

      if (notes) {
        updates.push('notes = ?');
        params.push(notes);
      }

      params.push(id);

      await db.query(
        `UPDATE deliveries SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return await this.getById(id);
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      throw error;
    }
  }

  /**
   * Get delivery statistics
   */
  static async getStatistics(filters = {}) {
    try {
      console.log('\n📊 ============================================================');
      console.log('📊 DELIVERY STATISTICS CALCULATION');
      console.log('📊 ============================================================');
      console.log('📊 Filters:', JSON.stringify(filters, null, 2));
      
      const conditions = [];
      const params = [];

      if (filters.start_date) {
        conditions.push('delivery_date >= ?');
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push('delivery_date <= ?');
        params.push(filters.end_date);
      }

      const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
      
      const sqlQuery = `
        SELECT 
          COUNT(*) as total_count,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
          SUM(CASE WHEN status = 'in_transit' THEN 1 ELSE 0 END) as in_transit_count,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
          SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          SUM(total_quantity) as total_quantity,
          SUM(total_amount) as total_amount
        FROM deliveries
        ${whereClause}
      `;
      
      console.log('📊 SQL Query:', sqlQuery);
      console.log('📊 SQL Params:', params);

      const [stats] = await db.query(sqlQuery, params);
      
      const result = stats[0] || {
        total_count: 0,
        pending_count: 0,
        in_transit_count: 0,
        delivered_count: 0,
        returned_count: 0,
        cancelled_count: 0,
        total_quantity: 0,
        total_amount: 0
      };
      
      console.log('📊 Raw Stats from DB:', JSON.stringify(result, null, 2));
      console.log('📊 ============================================================\n');

      return result;
    } catch (error) {
      console.error('❌ Error fetching delivery statistics:', error);
      throw error;
    }
  }

  /**
   * Delete delivery (only if pending)
   */
  static async delete(id) {
    try {
      // Check status
      const [delivery] = await db.query(
        'SELECT status, warehouse_id FROM deliveries WHERE id = ?',
        [id]
      );

      if (delivery.length === 0) {
        throw new Error('Delivery not found');
      }

      if (delivery[0].status !== 'pending') {
        throw new Error('Can only delete pending deliveries');
      }

      // Release reserved stock
      const [items] = await db.query(
        'SELECT * FROM delivery_items WHERE delivery_id = ?',
        [id]
      );

      for (const item of items) {
        await db.query(`
          UPDATE warehouse_stock 
          SET reserved_quantity = reserved_quantity - ?
          WHERE warehouse_id = ? AND product_id = ?
        `, [
          item.quantity_delivered,
          delivery[0].warehouse_id,
          item.product_id
        ]);
      }

      await db.query('DELETE FROM deliveries WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('❌ Error deleting delivery:', error);
      throw error;
    }
  }

  /**
   * 🆕 Create delivery challan directly from an ORDER (NEW FLOW - NO INVOICE)
   * This is the new simplified flow: Order → Delivery Challan → Shop Ledger
   * @param {Number} orderId - Order ID to create delivery from
   * @param {Object} deliveryData - Delivery specific data (driver, vehicle, warehouse, etc.)
   * @param {Number} userId - User creating the delivery
   * @returns {Promise<Object>} Created delivery with all details
   */
  static async createFromOrder(orderId, deliveryData, userId) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      console.log('\n🟢 ========== DELIVERY MODEL: CREATE FROM ORDER ==========');
      console.log('📥 Order ID:', orderId);
      console.log('📥 Delivery Data:', JSON.stringify(deliveryData, null, 2));

      // 1. Fetch complete order details with joins (shop, salesman, route, items)
      console.log('🔍 Fetching complete order details with joins...');
      
      // Detect which database table name to use for order details
      const useSQLite = process.env.USE_SQLITE === 'true';
      const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';
      
      const [orders] = await connection.query(`
        SELECT 
          o.*,
          s.full_name as salesman_name,
          s.phone as salesman_phone,
          s.salesman_code,
          sh.shop_name,
          sh.owner_name as shop_owner_name,
          sh.address as shop_address,
          sh.city as shop_city,
          sh.area as shop_area,
          sh.phone as shop_phone,
          sh.current_balance as shop_balance,
          r.route_name,
          r.route_code
        FROM orders o
        LEFT JOIN salesmen s ON o.salesman_id = s.id
        LEFT JOIN shops sh ON o.shop_id = sh.id
        LEFT JOIN routes r ON o.route_id = r.id
        WHERE o.id = ?
      `, [orderId]);

      if (orders.length === 0) {
        throw new Error('Order not found');
      }

      const order = orders[0];
      console.log('✅ Order details fetched:', order.order_number);
      console.log('   - Shop:', order.shop_name);
      console.log('   - Salesman:', order.salesman_name);
      console.log('   - Route:', order.route_name);
      console.log('   - Status:', order.status);
      console.log('   - Total Amount:', order.net_amount);

      // 2. Validate order status (must be approved or finalized)
      if (order.status !== 'approved' && order.status !== 'finalized') {
        throw new Error(`Order must be approved or finalized to create delivery. Current status: ${order.status}`);
      }

      // 3. Fetch order items with product details
      console.log(`🔍 Fetching order items from ${ORDER_DETAILS_TABLE}...`);
      const [orderItems] = await connection.query(`
        SELECT 
          od.id,
          od.product_id,
          od.quantity,
          od.unit_price,
          od.total_price,
          od.discount_percentage,
          od.discount,
          od.net_price,
          p.product_name,
          p.product_code,
          p.category,
          p.brand,
          p.pack_size
        FROM ${ORDER_DETAILS_TABLE} od
        LEFT JOIN products p ON od.product_id = p.id
        WHERE od.order_id = ?
        ORDER BY od.id
      `, [orderId]);

      if (orderItems.length === 0) {
        throw new Error('Order has no items');
      }

      // Normalize item discount fields - compute percentage from amount if needed
      for (const item of orderItems) {
        const grossTotal = parseFloat(item.unit_price || 0) * parseFloat(item.quantity || 0);
        const discountAmt = parseFloat(item.discount) || 0;
        const discountPct = parseFloat(item.discount_percentage) || 0;
        
        // Use whichever discount source is available
        if (discountPct > 0 && discountAmt === 0) {
          item.discount_amount = grossTotal * discountPct / 100;
          item.discount_percentage = discountPct;
        } else if (discountAmt > 0 && discountPct === 0) {
          item.discount_amount = discountAmt;
          item.discount_percentage = grossTotal > 0 ? (discountAmt / grossTotal) * 100 : 0;
        } else {
          item.discount_amount = discountAmt;
          item.discount_percentage = discountPct;
        }
        
        // Calculate proper net_price
        item.net_price = parseFloat(item.net_price) || (grossTotal - item.discount_amount);
      }

      console.log(`✅ Fetched ${orderItems.length} order items`);

      // 4. Generate challan number
      const challanNumber = await this.generateChallanNumber();
      console.log('📋 Generated challan number:', challanNumber);

      // 5. Calculate totals from order items
      const totalItems = orderItems.length;
      const totalQuantity = orderItems.reduce((sum, item) => 
        sum + parseFloat(item.quantity || 0), 0
      );
      
      // Use order's total amounts (preserves discounts from order)
      // Calculate discount from difference between total_amount and net_amount (most reliable)
      const subtotal = parseFloat(order.total_amount) || 0;
      const netAmount = parseFloat(order.net_amount) || subtotal;
      const calculatedDiscount = subtotal > netAmount ? subtotal - netAmount : 0;
      const explicitDiscount = parseFloat(order.discount_amount) || parseFloat(order.discount) || 0;
      const discountAmount = Math.max(calculatedDiscount, explicitDiscount);
      const discountPercentage = subtotal > 0 && discountAmount > 0 ? (discountAmount / subtotal) * 100 : 0;
      const finalNetAmount = subtotal - discountAmount;

      console.log('📊 Calculated totals:');
      console.log('   - Total Items:', totalItems);
      console.log('   - Total Quantity:', totalQuantity);
      console.log('   - Subtotal:', subtotal);
      console.log('   - Discount:', discountAmount, `(${discountPercentage.toFixed(2)}%)`);
      console.log('   - Net Amount:', finalNetAmount);

      // 6. Insert delivery challan
      console.log('📦 Inserting delivery challan...');
      const [result] = await connection.query(`
        INSERT INTO deliveries (
          challan_number, 
          order_id,
          invoice_id,
          warehouse_id,
          delivery_date, 
          expected_delivery_time,
          driver_name, 
          driver_phone, 
          driver_cnic, 
          vehicle_number, 
          vehicle_type,
          shop_id, 
          shop_name, 
          shop_address, 
          shop_contact, 
          delivery_address,
          route_id, 
          route_name, 
          salesman_id, 
          salesman_name,
          status, 
          total_items, 
          total_quantity, 
          total_amount,
          subtotal, 
          discount_percentage,
          discount_amount, 
          grand_total,
          notes, 
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        challanNumber,
        orderId,
        null, // invoice_id is NULL for order-based deliveries
        deliveryData.warehouse_id || null,
        deliveryData.delivery_date || null,
        deliveryData.expected_delivery_time || null,
        deliveryData.driver_name || null,
        deliveryData.driver_phone || null,
        deliveryData.driver_cnic || null,
        deliveryData.vehicle_number || null,
        deliveryData.vehicle_type || null,
        order.shop_id,
        order.shop_name || null,
        order.shop_address || null,
        order.shop_phone || null,
        deliveryData.delivery_address || order.shop_address || null,
        order.route_id,
        order.route_name || null,
        order.salesman_id,
        order.salesman_name || null,
        'pending',
        totalItems,
        totalQuantity,
        finalNetAmount,
        subtotal,
        discountPercentage,
        discountAmount,
        finalNetAmount, // grand_total = net_amount for order-based deliveries
        deliveryData.notes || null,
        userId
      ]);

      const deliveryId = result.insertId;
      console.log('✅ Delivery inserted with ID:', deliveryId);

      // 7. Insert delivery items from order items
      console.log('📦 Inserting delivery items...');
      for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];
        console.log(`\n   🔹 Item ${i + 1}: ${item.product_name}`);
        console.log(`      - Quantity: ${item.quantity}`);
        console.log(`      - Unit Price: ${item.unit_price}`);
        console.log(`      - Total: ${item.total_price}`);
        
          // Fetch current purchase cost (used on MySQL where this column exists)
          const [costRes] = await connection.query('SELECT purchase_price FROM products WHERE id = ?', [item.product_id]);
          const unitPurchaseCost = costRes.length > 0 ? parseFloat(costRes[0].purchase_price || 0) : 0;

          if (useSQLite) {
            await connection.query(`
              INSERT INTO delivery_items (
                delivery_id,
                product_id,
                product_name,
                product_code,
                quantity_ordered,
                quantity_delivered,
                quantity_returned,
                unit_price,
                total_price,
                discount_percentage,
                discount_amount,
                net_amount
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              deliveryId,
              item.product_id,
              item.product_name,
              item.product_code || null,
              item.quantity,
              item.quantity, // Initially, quantity_delivered = quantity_ordered
              0, // quantity_returned = 0
              item.unit_price,
              item.total_price,
              item.discount_percentage || 0,
              item.discount_amount || 0,
              item.net_price || item.total_price
            ]);
          } else {
            await connection.query(`
              INSERT INTO delivery_items (
                delivery_id, 
                product_id, 
                product_name, 
                product_code,
                quantity_ordered, 
                quantity_delivered, 
                quantity_returned,
                unit_price, 
                total_price,
                discount_percentage,
                discount_amount,
                net_amount,
                unit_purchase_cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              deliveryId,
              item.product_id,
              item.product_name,
              item.product_code || null,
              item.quantity,
              item.quantity, // Initially, quantity_delivered = quantity_ordered
              0, // quantity_returned = 0
              item.unit_price,
              item.total_price,
              item.discount_percentage || 0,
              item.discount_amount || 0,
              item.net_price || item.total_price,
              unitPurchaseCost
            ]);
          }
      }

      console.log('✅ All delivery items inserted and stock reserved');

      // 9. Update order delivery status
      console.log('🔄 Updating order delivery status...');
      if (useSQLite) {
        // SQLite: Update delivery_generated and delivery_status columns
        await connection.query(`
          UPDATE orders 
          SET delivery_generated = 1,
              delivery_status = 'delivered'
          WHERE id = ?
        `, [orderId]);
      } else {
        // MySQL: Update status field only (no delivery_generated/delivery_status columns)
        await connection.query(`
          UPDATE orders 
          SET status = 'delivered'
          WHERE id = ?
        `, [orderId]);
      }
      console.log('✅ Order delivery status updated');

      // 10. Create shop ledger entry (NEW - directly from delivery)
      console.log('📒 Creating shop ledger entry from delivery...');
      const shopLedger = require('./ShopLedger');
      
      await shopLedger.createEntry({
        shop_id: order.shop_id,
        shop_name: order.shop_name,
        transaction_date: new Date(),
        transaction_type: 'invoice', // Use 'invoice' type as delivery creates receivable
        reference_type: 'delivery',
        reference_id: deliveryId,
        reference_number: challanNumber,
        debit_amount: 0,
        credit_amount: finalNetAmount, // Credit adds to balance (shop owes more money after delivery)
        description: `Delivery Challan ${challanNumber} for Order ${order.order_number}`,
        notes: `Generated from order ${order.order_number}`,
        created_by: userId,
        is_manual: 0
      }, connection);
      console.log('✅ Shop ledger entry created');

      await connection.commit();
      console.log('✅ Transaction committed');
      
      // 11. Fetch and return complete delivery
      const createdDelivery = await this.getById(deliveryId);
      console.log('✅ Delivery retrieved:', createdDelivery.challan_number);
      console.log('🟢 ========== DELIVERY FROM ORDER COMPLETE ==========\n');
      
      return createdDelivery;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error creating delivery from order:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 🆕 Bulk delete deliveries with admin override
   * @param {Array} deliveryIds - Array of delivery IDs to delete
   * @param {Number} userId - User performing the deletion
   * @param {Boolean} force - Admin override to delete any status (default: false)
   */
  static async bulkDelete(deliveryIds, userId, force = false) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      console.log('\n' + '='.repeat(80));
      console.log('🗑️ BULK DELETE DELIVERIES');
      console.log('='.repeat(80));
      console.log('📋 Delivery IDs:', deliveryIds);
      console.log('👤 User ID:', userId);
      console.log('⚠️ Force Mode:', force);

      let deletedCount = 0;
      const errors = [];
      const warnings = [];

      for (const deliveryId of deliveryIds) {
        try {
          console.log(`\n🔄 Processing delivery ID: ${deliveryId}`);
          
          // Get delivery details
          const [deliveryRows] = await connection.query(
            'SELECT id, challan_number, status, warehouse_id FROM deliveries WHERE id = ?',
            [deliveryId]
          );

          if (deliveryRows.length === 0) {
            console.log(`   ⚠️ Delivery ${deliveryId} not found - skipping`);
            errors.push({ id: deliveryId, error: 'Delivery not found' });
            continue;
          }

          const delivery = deliveryRows[0];
          console.log(`   ✅ Found: ${delivery.challan_number} - Status: ${delivery.status}`);

          // Check status - allow deletion based on force flag
          if (!force && delivery.status !== 'cancelled' && delivery.status !== 'returned') {
            console.log(`   ❌ Cannot delete - Status is ${delivery.status} (requires admin override)`);
            errors.push({ 
              id: deliveryId, 
              challan_number: delivery.challan_number,
              status: delivery.status,
              error: `Cannot delete ${delivery.status} delivery without admin override` 
            });
            continue;
          }

          // Warn if deleting delivered/in_transit with force
          if (force && (delivery.status === 'delivered' || delivery.status === 'in_transit')) {
            warnings.push({
              id: deliveryId,
              challan_number: delivery.challan_number,
              status: delivery.status,
              message: `Deleted ${delivery.status} delivery - this may affect business records`
            });
          }

          // Get delivery items
          const [items] = await connection.query(
            'SELECT * FROM delivery_items WHERE delivery_id = ?',
            [deliveryId]
          );

          console.log(`   📦 Found ${items.length} items`);

          // Release reserved stock if status is pending or in_transit
          if (delivery.status === 'pending' || delivery.status === 'in_transit') {
            console.log('   🔓 Releasing reserved stock...');
            for (const item of items) {
              await connection.query(`
                UPDATE warehouse_stock 
                SET reserved_quantity = GREATEST(0, reserved_quantity - ?)
                WHERE warehouse_id = ? AND product_id = ?
              `, [
                item.quantity_delivered,
                delivery.warehouse_id,
                item.product_id
              ]);
              console.log(`      → Released ${item.quantity_delivered} units of product ${item.product_id}`);
            }
          }

          // Delete delivery items first (foreign key constraint)
          await connection.query('DELETE FROM delivery_items WHERE delivery_id = ?', [deliveryId]);
          console.log(`   ✅ Deleted ${items.length} delivery items`);

          // Delete delivery record
          await connection.query('DELETE FROM deliveries WHERE id = ?', [deliveryId]);
          console.log(`   ✅ Deleted delivery ${delivery.challan_number}`);

          deletedCount++;
        } catch (itemError) {
          console.error(`   ❌ Error processing delivery ${deliveryId}:`, itemError);
          errors.push({ id: deliveryId, error: itemError.message });
        }
      }

      await connection.commit();
      console.log('\n📊 BULK DELETE SUMMARY:');
      console.log(`   ✅ Successfully deleted: ${deletedCount}`);
      console.log(`   ❌ Failed: ${errors.length}`);
      console.log(`   ⚠️ Warnings: ${warnings.length}`);
      console.log('='.repeat(80) + '\n');

      return {
        success: true,
        deletedCount,
        errors,
        warnings
      };
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error in bulk delete:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Delivery;

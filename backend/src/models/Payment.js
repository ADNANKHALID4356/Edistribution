/**
 * Payment Model
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * Handles payment recording with intelligent allocation:
 * - Record payments against shop account
 * - Automatic payment allocation (FIFO - oldest invoice first)
 * - Shop ledger integration
 * - Advance payment handling
 */

const db = require('../config/database');
const ShopLedger = require('./ShopLedger');

class Payment {
  /**
   * Generate unique receipt number
   * @param {Object} connection - Database connection
   * @returns {Promise<string>} Generated receipt number
   */
  async generateReceiptNumber(connection) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RCP-${dateStr}`;
    
    const [result] = await connection.query(
      `SELECT receipt_number FROM payments WHERE receipt_number LIKE ? ORDER BY receipt_number DESC LIMIT 1`,
      [`${prefix}%`]
    );
    
    let sequence = 1;
    if (result && result.length > 0) {
      const lastNumber = result[0].receipt_number;
      const matches = lastNumber.match(/-(\d{4})$/);
      if (matches) {
        sequence = parseInt(matches[1]) + 1;
      }
    }
    
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
  
  /**
   * Record a payment with intelligent allocation
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Payment with allocations and ledger entry
   */
  async recordPayment(paymentData) {
    console.log('💰 [PAYMENT MODEL] Recording new payment...');
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // Validate required fields
      if (!paymentData.shop_id || !paymentData.amount) {
        throw new Error('shop_id and amount are required');
      }
      
      // Get shop details
      const [shops] = await connection.query(
        'SELECT * FROM shops WHERE id = ?',
        [paymentData.shop_id]
      );
      
      if (shops.length === 0) {
        throw new Error('Shop not found');
      }
      
      const shop = shops[0];
      
      // Generate receipt number
      const receipt_number = await this.generateReceiptNumber(connection);
      
      // Insert payment record
      const [paymentResult] = await connection.query(
        `INSERT INTO payments (
          receipt_number, shop_id, invoice_id, payment_date, amount,
          payment_method, reference_number, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receipt_number,
          paymentData.shop_id,
          paymentData.invoice_id || null,
          paymentData.payment_date || new Date(),
          paymentData.amount,
          paymentData.payment_method || 'cash',
          paymentData.reference_number || null,
          paymentData.notes || null,
          new Date()
        ]
      );
      
      const paymentId = paymentResult.insertId;
      
      console.log(`✅ [PAYMENT MODEL] Payment recorded with ID: ${paymentId}, Receipt: ${receipt_number}`);
      
      // 🆕 Create ledger entry for payment (within same transaction)
      console.log('📒 [PAYMENT MODEL] Creating shop ledger entry...');
      
      const transactionType = paymentData.transaction_type || 'receive';
      const amount = parseFloat(paymentData.amount);
      
      // Get previous balance for this shop
      const [prevEntries] = await connection.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `, [paymentData.shop_id]);
      
      const previousBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
      
      let debitAmount = 0;
      let creditAmount = 0;
      let newBalance = 0;
      let description = '';
      
      if (transactionType === 'receive') {
        // Receive from shop: Shop pays us - REDUCES their debt
        // In debt tracking: Positive balance = shop owes us
        // Payment received = shop's debt DECREASES
        // Formula: newBalance = previousBalance + credit - debit
        // For receive: debit = amount, credit = 0, so newBalance = previous - amount
        debitAmount = amount;
        creditAmount = 0;
        newBalance = previousBalance - amount;
        description = `Payment received from shop - ${receipt_number}`;
      } else {
        // Pay to shop: We pay/refund shop - INCREASES their balance (they now have credit)
        // Or if they had negative balance (credit), it moves toward zero
        // For pay: debit = 0, credit = amount, so newBalance = previous + amount
        debitAmount = 0;
        creditAmount = amount;
        newBalance = previousBalance + amount;
        description = `Payment made to shop - ${receipt_number}`;
      }
      
      console.log(`💰 Payment ${transactionType}: Previous Balance: ${previousBalance}, Amount: ${amount}, New Balance: ${newBalance}`);
      
      // Insert ledger entry
      await connection.query(`
        INSERT INTO shop_ledger (
          shop_id, shop_name, transaction_date, transaction_type,
          reference_type, reference_id, reference_number,
          debit_amount, credit_amount, balance,
          description, notes, created_by, created_by_name, is_manual
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        paymentData.shop_id,
        shop.shop_name,
        paymentData.payment_date || new Date(),
        'payment',
        'payment',
        paymentId,
        receipt_number,
        debitAmount,
        creditAmount,
        newBalance,
        description,
        paymentData.notes || null,
        paymentData.created_by || null,
        paymentData.created_by_name || null,
        0
      ]);
      
      // Update shop's current_balance and last_transaction_date
      await connection.query(`
        UPDATE shops 
        SET current_balance = ?, 
            last_transaction_date = ?
        WHERE id = ?
      `, [newBalance, paymentData.payment_date || new Date(), paymentData.shop_id]);
      
      console.log(`✅ [PAYMENT MODEL] Shop ledger entry created - ${transactionType}, new balance: ${newBalance}`);
      
      await connection.commit();
      connection.release();
      
      // Return payment with allocations
      return {
        payment_id: paymentId,
        receipt_number,
        shop_id: paymentData.shop_id,
        shop_name: shop.shop_name,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date || new Date(),
        payment_method: paymentData.payment_method || 'cash',
        transaction_type: paymentData.transaction_type || 'receive',
        message: 'Payment recorded successfully'
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [PAYMENT MODEL] Error recording payment:', error);
      throw error;
    }
  }
  
  /**
   * Get payment by ID
   * @param {number} id - Payment ID
   * @returns {Promise<Object>} Payment with allocations
   */
  async findById(id) {
    try {
      // Get payment
      const [payments] = await db.query(
        'SELECT * FROM payments WHERE id = ?',
        [id]
      );
      
      if (payments.length === 0) {
        return null;
      }
      
      const payment = payments[0];
      
      // Get allocations
      const [allocations] = await db.query(`
        SELECT 
          pa.*,
          i.invoice_number,
          i.invoice_date,
          i.net_amount,
          i.status
        FROM payment_allocations pa
        JOIN invoices i ON pa.invoice_id = i.id
        WHERE pa.payment_id = ?
        ORDER BY i.invoice_date ASC
      `, [id]);
      
      return {
        ...payment,
        allocations
      };
    } catch (error) {
      console.error('❌ [PAYMENT MODEL] Error finding payment:', error);
      throw error;
    }
  }
  
  /**
   * Get all payments with pagination and filters
   * @param {Object} filters - page, limit, shop_id, start_date, end_date, payment_method
   * @returns {Promise<Object>} Payments array and pagination info
   */
  async findAll(filters = {}) {
    console.log('💰 [PAYMENT MODEL] Getting all payments...');
    
    const {
      page = 1,
      limit = 20,
      shop_id = null,
      start_date = null,
      end_date = null,
      payment_method = null
    } = filters;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let queryParams = [];
    
    if (shop_id) {
      whereConditions.push('p.shop_id = ?');
      queryParams.push(shop_id);
    }
    
    if (start_date) {
      whereConditions.push('p.payment_date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('p.payment_date <= ?');
      queryParams.push(end_date);
    }
    
    if (payment_method) {
      whereConditions.push('p.payment_method = ?');
      queryParams.push(payment_method);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get payments with shop details
    const [payments] = await db.query(`
      SELECT 
        p.*,
        s.shop_name,
        s.shop_code
      FROM payments p
      JOIN shops s ON p.shop_id = s.id
      ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM payments p
      ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get shop's payment history
   * @param {number} shopId - Shop ID
   * @param {Object} filters - page, limit, start_date, end_date
   * @returns {Promise<Object>} Payments with allocations
   */
  async getShopPayments(shopId, filters = {}) {
    console.log(`💰 [PAYMENT MODEL] Getting payments for shop ${shopId}...`);
    
    const {
      page = 1,
      limit = 20,
      start_date = null,
      end_date = null
    } = filters;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = ['p.shop_id = ?'];
    let queryParams = [shopId];
    
    if (start_date) {
      whereConditions.push('p.payment_date >= ?');
      queryParams.push(start_date);
    }
    
    if (end_date) {
      whereConditions.push('p.payment_date <= ?');
      queryParams.push(end_date);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get payments
    const [payments] = await db.query(`
      SELECT p.* FROM payments p
      WHERE ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);
    
    // Get allocations for each payment
    for (let payment of payments) {
      const [allocations] = await db.query(`
        SELECT 
          pa.*,
          i.invoice_number,
          i.invoice_date,
          i.net_amount,
          i.status
        FROM payment_allocations pa
        JOIN invoices i ON pa.invoice_id = i.id
        WHERE pa.payment_id = ?
        ORDER BY i.invoice_date ASC
      `, [payment.id]);
      
      payment.allocations = allocations;
    }
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM payments p
      WHERE ${whereClause}
    `, queryParams);
    
    const total = countResult[0].total;
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  /**
   * Get payment summary for a shop
   * @param {number} shopId - Shop ID
   * @returns {Promise<Object>} Payment summary
   */
  async getShopPaymentSummary(shopId) {
    console.log(`💰 [PAYMENT MODEL] Getting payment summary for shop ${shopId}...`);
    
    const [summary] = await db.query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount_paid,
        AVG(amount) as average_payment,
        MAX(payment_date) as last_payment_date,
        MIN(payment_date) as first_payment_date
      FROM payments
      WHERE shop_id = ?
    `, [shopId]);
    
    return summary[0];
  }
}

module.exports = new Payment();

/**
 * Invoice Model
 * Sprint 7: Invoice & Bill Management
 * Company: Ummahtechinnovations.com
 * 
 * Handles all invoice-related database operations including:
 * - Invoice generation from orders
 * - Payment recording and tracking
 * - Balance calculations
 * - Invoice status management
 */

const db = require('../config/database');

class Invoice {
  async generateInvoiceNumber(connection) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `INV-${dateStr}`;
    const [result] = await connection.query(
      `SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let sequence = 1;
    if (result && result.length > 0) {
      const lastNumber = result[0].invoice_number;
      const matches = lastNumber.match(/-(\d{4})$/);
      if (matches) { sequence = parseInt(matches[1]) + 1; }
    }
    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }

  /**
   * Create a new invoice from an order with complete professional details
   * Auto-populates company, customer, salesman, route, and product information
   * @param {Object} invoiceData - Invoice data including order_id
   * @param {Array} items - Invoice line items
   * @returns {Promise<Object>} Created invoice with all details
   */
  async createFromOrder(invoiceData, items) {
    console.log('📝 [INVOICE MODEL] Creating professional invoice from order...');
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // If order_id is provided, fetch complete order details with joins
      let orderDetails = null;
      let orderItems = [];
      
      if (invoiceData.order_id) {
        console.log('🔍 [INVOICE MODEL] Fetching complete order details...');
        
        // Fetch order header with all joins
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
            r.route_name
          FROM orders o
          LEFT JOIN salesmen s ON o.salesman_id = s.id
          LEFT JOIN shops sh ON o.shop_id = sh.id
          LEFT JOIN routes r ON o.route_id = r.id
          WHERE o.id = ?
        `, [invoiceData.order_id]);

        if (orders.length > 0) {
          orderDetails = orders[0];
          console.log('✅ [INVOICE MODEL] Order details fetched:', orderDetails.order_number);
          
          // **CRITICAL FIX:** Fetch order line items (order_details) with product information
          console.log('🔍 [INVOICE MODEL] Fetching order line items...');
          const [fetchedItems] = await connection.query(`
            SELECT 
              od.id,
              od.product_id,
              od.quantity,
              od.unit_price,
              od.total_price,
              od.discount,
              od.net_price,
              p.product_name,
              p.product_code,
              p.category,
              p.brand,
              p.pack_size
            FROM order_details od
            LEFT JOIN products p ON od.product_id = p.id
            WHERE od.order_id = ?
            ORDER BY od.id
          `, [invoiceData.order_id]);
          
          orderItems = fetchedItems;
          console.log(`✅ [INVOICE MODEL] Fetched ${orderItems.length} order items`);
          
          // If items were passed from frontend but we have order_id, 
          // ALWAYS use the real order_details from database
          if (orderItems.length > 0) {
            items = orderItems.map(item => ({
              product_id: item.product_id,
              product_name: item.product_name,
              product_code: item.product_code,
              product_category: item.category,
              product_brand: item.brand,
              pack_size: item.pack_size,
              quantity: parseFloat(item.quantity),
              unit_price: parseFloat(item.unit_price),
              discount_percentage: item.discount > 0 ? ((item.discount / item.total_price) * 100).toFixed(2) : 0,
              discount_amount: parseFloat(item.discount) || 0,
              total_amount: parseFloat(item.net_price)
            }));
            console.log('✅ [INVOICE MODEL] Using real order items from database');
          }
        }
      }

      // Prepare company information (default values, should be configurable)
      const companyInfo = {
        company_name: invoiceData.company_name || 'Ummahtechinnovations Distribution',
        company_address: invoiceData.company_address || 'Office Address, City, Pakistan',
        company_city: invoiceData.company_city || 'Lahore',
        company_phone: invoiceData.company_phone || '+92-XXX-XXXXXXX',
        company_email: invoiceData.company_email || 'info@ummahtechinnovations.com',
        company_tax_number: invoiceData.company_tax_number || null,
        company_logo_url: invoiceData.company_logo_url || null
      };

      // Prepare customer details (from order or invoiceData)
      const customerInfo = {
        shop_id: orderDetails?.shop_id || invoiceData.shop_id,
        shop_name: orderDetails?.shop_name || invoiceData.shop_name,
        shop_owner_name: orderDetails?.shop_owner_name || invoiceData.shop_owner_name,
        shop_address: orderDetails?.shop_address || invoiceData.shop_address,
        shop_city: orderDetails?.shop_city || invoiceData.shop_city,
        shop_area: orderDetails?.shop_area || invoiceData.shop_area,
        shop_phone: orderDetails?.shop_phone || invoiceData.shop_phone
      };

      // Prepare salesman details (from order or invoiceData)
      const salesmanInfo = {
        salesman_id: orderDetails?.salesman_id || invoiceData.salesman_id,
        salesman_name: orderDetails?.salesman_name || invoiceData.salesman_name,
        salesman_phone: orderDetails?.salesman_phone || invoiceData.salesman_phone,
        salesman_code: orderDetails?.salesman_code || invoiceData.salesman_code
      };

      // Prepare route details (from order or invoiceData)
      const routeInfo = {
        route_id: orderDetails?.route_id || invoiceData.route_id || null,
        route_name: orderDetails?.route_name || invoiceData.route_name || null
      };

      // Calculate credit days and due date
      const credit_days = invoiceData.credit_days || 30;
      const invoice_date = invoiceData.invoice_date || new Date();
      const due_date = invoiceData.due_date || (() => {
        const date = new Date(invoice_date);
        date.setDate(date.getDate() + credit_days);
        return date;
      })();

      // Calculate financial details
      // Calculate subtotal from order or items
      let subtotal;
      
      if (orderDetails) {
        // Use order's subtotal (real order amounts)
        subtotal = parseFloat(orderDetails.total_amount) || 0;
        console.log('💰 [INVOICE MODEL] Using order subtotal:', subtotal);
      } else {
        // Calculate subtotal from items if no order
        subtotal = items.reduce((sum, item) => {
          return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
        }, 0);
        console.log('💰 [INVOICE MODEL] Calculated subtotal from items:', subtotal);
      }
      
      // ALWAYS use invoice form's discount and tax percentages (not order's old values)
      // This allows user to apply different discount/tax when creating invoice
      const discount_percentage = parseFloat(invoiceData.discount_percentage) || 0;
      const tax_percentage = parseFloat(invoiceData.tax_percentage) || 0;
      const shipping_charges = parseFloat(invoiceData.shipping_charges) || 0;
      const other_charges = parseFloat(invoiceData.other_charges) || 0;
      const round_off = parseFloat(invoiceData.round_off) || 0;
      const previous_balance = parseFloat(invoiceData.previous_balance) || 0;
      
      // Calculate amounts from percentages
      const discount_amount = (subtotal * discount_percentage) / 100;
      const after_discount = subtotal - discount_amount;
      const tax_amount = (after_discount * tax_percentage) / 100;
      
      console.log('💰 [INVOICE MODEL] Financial breakdown:');
      console.log(`   Subtotal: ${subtotal}`);
      console.log(`   Discount (${discount_percentage}%): ${discount_amount}`);
      console.log(`   After Discount: ${after_discount}`);
      console.log(`   Tax (${tax_percentage}%): ${tax_amount}`);
      console.log('💰 [INVOICE MODEL] Financial breakdown:');
      console.log(`   Subtotal: ${subtotal}`);
      console.log(`   Discount (${discount_percentage}%): ${discount_amount}`);
      console.log(`   After Discount: ${after_discount}`);
      console.log(`   Tax (${tax_percentage}%): ${tax_amount}`);
      console.log(`   Shipping Charges: ${shipping_charges}`);
      console.log(`   Other Charges: ${other_charges}`);
      console.log(`   Round Off: ${round_off}`);
      
      // Calculate net amount: after_discount + tax + shipping + other + round_off
      const net_amount = after_discount + tax_amount + shipping_charges + other_charges + round_off;
      const total_payable = net_amount + previous_balance;
      
      console.log('💰 [INVOICE MODEL] Final totals:');
      // Generate unique invoice number
      const invoice_number = await this.generateInvoiceNumber(connection);
      console.log(`📋 [INVOICE MODEL] Generated invoice number: ${invoice_number}`);

      console.log(`   Net Amount: ${net_amount}`);
      console.log(`   Previous Balance: ${previous_balance}`);
      console.log(`   Total Payable: ${total_payable}`);

      // Insert invoice header with ALL professional fields
      const [invoiceResult] = await connection.query(
        `INSERT INTO invoices (
          invoice_number, order_id, reference_number,
          shop_id, shop_name, shop_owner_name, shop_address, shop_city, shop_area, shop_phone,
          salesman_id, salesman_name, salesman_phone, salesman_code,
          route_id, route_name,
          company_name, company_address, company_city, company_phone, company_email, 
          company_tax_number, company_logo_url,
          subtotal, discount_percentage, discount_amount,
          tax_percentage, tax_amount, 
          shipping_charges, other_charges, round_off,
          net_amount, previous_balance, total_payable, balance_amount,
          payment_status, payment_type,
          invoice_date, due_date, delivery_date, credit_days,
          prepared_by, approved_by,
          notes, terms_conditions, invoice_footer,
          bank_name, bank_account_title, bank_account_number, bank_branch, bank_iban,
          signature_url, qr_code_data,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice_number,
          invoiceData.order_id || null,
          invoiceData.reference_number || orderDetails?.order_number || null,
          customerInfo.shop_id,
          customerInfo.shop_name,
          customerInfo.shop_owner_name,
          customerInfo.shop_address,
          customerInfo.shop_city,
          customerInfo.shop_area,
          customerInfo.shop_phone,
          salesmanInfo.salesman_id,
          salesmanInfo.salesman_name,
          salesmanInfo.salesman_phone,
          salesmanInfo.salesman_code,
          routeInfo.route_id,
          routeInfo.route_name,
          companyInfo.company_name,
          companyInfo.company_address,
          companyInfo.company_city,
          companyInfo.company_phone,
          companyInfo.company_email,
          companyInfo.company_tax_number,
          companyInfo.company_logo_url,
          subtotal,
          discount_percentage,
          discount_amount,
          tax_percentage,
          tax_amount,
          shipping_charges,
          other_charges,
          round_off,
          net_amount,
          previous_balance,
          total_payable,
          total_payable, // Initial balance_amount = total_payable
          'unpaid',
          invoiceData.payment_type || 'credit',
          invoice_date,
          due_date,
          invoiceData.delivery_date || orderDetails?.order_date || null,
          credit_days,
          invoiceData.prepared_by || salesmanInfo.salesman_name,
          invoiceData.approved_by || null,
          invoiceData.notes || null,
          invoiceData.terms_conditions || 'Payment due within credit period. Goods once sold will not be taken back.',
          invoiceData.invoice_footer || 'This is a computer-generated invoice.',
          invoiceData.bank_name || null,
          invoiceData.bank_account_title || null,
          invoiceData.bank_account_number || null,
          invoiceData.bank_branch || null,
          invoiceData.bank_iban || null,
          invoiceData.signature_url || null,
          invoiceData.qr_code_data || null,
          invoiceData.status || 'issued'
        ]
      );

      const invoiceId = invoiceResult.insertId;
      console.log(`✅ [INVOICE MODEL] Professional invoice created with ID: ${invoiceId}`);

      // Insert invoice details/line items with enhanced product information
      for (const item of items) {
        // Fetch product details if not provided
        let productDetails = item;
        if (!item.product_category || !item.product_brand) {
          const [products] = await connection.query(`
            SELECT product_code, product_name, category, brand, pack_size
            FROM products WHERE id = ?
          `, [item.product_id]);
          
          if (products.length > 0) {
            productDetails = { ...item, ...products[0] };
          }
        }

        await connection.query(
          `INSERT INTO invoice_details (
            invoice_id, product_id, product_name, product_code,
            product_category, product_brand, pack_size,
            quantity, unit_price, 
            discount_percentage, discount_amount,
            tax_percentage, tax_amount,
            total_amount, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            invoiceId,
            item.product_id,
            productDetails.product_name,
            productDetails.product_code || null,
            productDetails.product_category || productDetails.category || null,
            productDetails.product_brand || productDetails.brand || null,
            productDetails.pack_size || null,
            item.quantity,
            item.unit_price,
            item.discount_percentage || 0,
            item.discount_amount || 0,
            item.tax_percentage || 0,
            item.tax_amount || 0,
            item.total_amount,
            item.notes || null
          ]
        );
      }

      await connection.commit();
      connection.release();

      console.log(`✅ [INVOICE MODEL] Professional invoice ${invoiceId} created with ${items.length} items`);
      console.log(`   📄 Invoice Number: Will be auto-generated by trigger`);
      console.log(`   🏪 Shop: ${customerInfo.shop_name}`);
      console.log(`   👤 Salesman: ${salesmanInfo.salesman_name}`);
      console.log(`   💰 Net Amount: ${net_amount}`);
      console.log(`   💳 Total Payable: ${total_payable}`);
      
      // Return the complete invoice
      return await this.findById(invoiceId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [INVOICE MODEL] Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Find invoice by ID with all details
   * @param {number} id - Invoice ID
   * @returns {Promise<Object>} Invoice with line items and payment history
   */
  async findById(id) {
    try {
      // Get invoice header
      const [invoices] = await db.query(
        `SELECT * FROM invoices WHERE id = ?`,
        [id]
      );

      if (invoices.length === 0) {
        return null;
      }

      const invoice = invoices[0];

      // Get invoice items
      const [items] = await db.query(
        `SELECT * FROM invoice_details WHERE invoice_id = ? ORDER BY id`,
        [id]
      );

      // Get payment history
      const [payments] = await db.query(
        `SELECT * FROM invoice_payments WHERE invoice_id = ? ORDER BY payment_date DESC, created_at DESC`,
        [id]
      );

      return {
        ...invoice,
        items,
        payments
      };
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error finding invoice:', error);
      throw error;
    }
  }

  /**
   * Get all invoices with pagination and filters
   * @param {Object} filters - page, limit, status, shop_id, start_date, end_date, payment_status
   * @returns {Promise<Object>} Invoices array and pagination info
   */
  async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = '',
        status = '',
        shop_id = '',
        salesman_id = '',
        payment_status = '',
        start_date = '',
        end_date = '',
        sortBy = 'invoice_date',
        sortOrder = 'DESC'
      } = filters;

      let whereConditions = [];
      let queryParams = [];

      // Search filter
      if (search) {
        whereConditions.push(`(
          invoices.invoice_number LIKE ? OR 
          invoices.shop_name LIKE ? OR
          invoices.salesman_name LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      // Status filter
      if (status) {
        whereConditions.push('invoices.status = ?');
        queryParams.push(status);
      }

      // Shop filter
      if (shop_id) {
        whereConditions.push('invoices.shop_id = ?');
        queryParams.push(shop_id);
      }

      // Salesman filter
      if (salesman_id) {
        whereConditions.push('invoices.salesman_id = ?');
        queryParams.push(salesman_id);
      }

      // Payment status filter
      if (payment_status) {
        whereConditions.push('invoices.payment_status = ?');
        queryParams.push(payment_status);
      }

      // Date range filter
      if (start_date) {
        whereConditions.push('invoices.invoice_date >= ?');
        queryParams.push(start_date);
      }
      if (end_date) {
        whereConditions.push('invoices.invoice_date <= ?');
        queryParams.push(end_date);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM invoices ${whereClause}`,
        queryParams
      );
      const total = countResult[0].total;

      // Calculate pagination
      const offset = (page - 1) * limit;
      const validSortColumns = ['invoice_date', 'invoice_number', 'net_amount', 'balance_amount', 'created_at'];
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'invoice_date';
      const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Get invoices with items count
      const [invoices] = await db.query(
        `SELECT 
          invoices.*,
          (SELECT COUNT(*) FROM invoice_details WHERE invoice_id = invoices.id) as items_count
        FROM invoices
        ${whereClause}
        ORDER BY ${sortColumn} ${validSortOrder}
        LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      return {
        invoices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error finding invoices:', error);
      throw error;
    }
  }

  /**
   * Get unpaid or partially paid invoices
   * @param {Object} filters - shop_id, limit
   * @returns {Promise<Array>} Unpaid invoices
   */
  async findUnpaid(filters = {}) {
    try {
      const { shop_id = '', limit = 100 } = filters;

      let whereConditions = ["invoices.payment_status IN ('unpaid', 'partial')"];
      let queryParams = [];

      if (shop_id) {
        whereConditions.push('invoices.shop_id = ?');
        queryParams.push(shop_id);
      }

      const whereClause = whereConditions.join(' AND ');
      queryParams.push(limit);

      const [invoices] = await db.query(
        `SELECT 
          invoices.*,
          (SELECT COUNT(*) FROM invoice_details WHERE invoice_id = invoices.id) as items_count
        FROM invoices
        WHERE ${whereClause}
        ORDER BY invoices.invoice_date ASC
        LIMIT ?`,
        queryParams
      );

      return invoices;
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error finding unpaid invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoices by shop
   * @param {number} shopId - Shop ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Shop invoices
   */
  async findByShop(shopId, filters = {}) {
    try {
      return await this.findAll({ ...filters, shop_id: shopId });
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error finding shop invoices:', error);
      throw error;
    }
  }

  /**
   * Record a payment for an invoice
   * @param {number} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Updated invoice
   */
  async recordPayment(invoiceId, paymentData) {
    console.log(`💰 [INVOICE MODEL] Recording payment for invoice ${invoiceId}...`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Get current invoice
      const [invoices] = await connection.query(
        'SELECT * FROM invoices WHERE id = ?',
        [invoiceId]
      );

      if (invoices.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoices[0];

      // Insert payment record
      await connection.query(
        `INSERT INTO invoice_payments (
          invoice_id, payment_amount, payment_method, payment_date,
          reference_number, bank_name, cheque_number, cheque_date,
          notes, received_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          paymentData.payment_amount,
          paymentData.payment_method,
          paymentData.payment_date || new Date(),
          paymentData.reference_number || null,
          paymentData.bank_name || null,
          paymentData.cheque_number || null,
          paymentData.cheque_date || null,
          paymentData.notes || null,
          paymentData.received_by || null
        ]
      );

      // Calculate new paid amount and balance
      const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(paymentData.payment_amount);
      const newBalance = parseFloat(invoice.net_amount) - newPaidAmount;

      // Determine payment status
      let paymentStatus = 'unpaid';
      if (newBalance <= 0) {
        paymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'partial';
      }

      // Update invoice
      await connection.query(
        `UPDATE invoices 
         SET paid_amount = ?, 
             balance_amount = ?, 
             payment_status = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [newPaidAmount, Math.max(0, newBalance), paymentStatus, invoiceId]
      );

      await connection.commit();
      connection.release();

      console.log(`✅ [INVOICE MODEL] Payment recorded. New balance: ${newBalance}`);
      
      return await this.findById(invoiceId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error('❌ [INVOICE MODEL] Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Update an invoice
   * @param {number} id - Invoice ID
   * @param {Object} updateData - Fields to update
   * @returns {Promise<Object>} Updated invoice
   */
  async update(id, updateData) {
    console.log(`📝 [INVOICE MODEL] Updating invoice ${id}...`);
    
    try {
      const allowedFields = [
        'shop_id', 'shop_name', 'salesman_id', 'salesman_name',
        'subtotal', 'discount_percentage', 'discount_amount',
        'tax_percentage', 'tax_amount', 'net_amount',
        'payment_type', 'invoice_date', 'due_date',
        'notes', 'terms_conditions', 'status'
      ];

      const updates = [];
      const values = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);

      await db.query(
        `UPDATE invoices SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );

      console.log(`✅ [INVOICE MODEL] Invoice ${id} updated successfully`);
      
      return await this.findById(id);
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error updating invoice:', error);
      throw error;
    }
  }

  /**
   * Delete an invoice (soft delete by setting status to cancelled)
   * @param {number} id - Invoice ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    console.log(`🗑️ [INVOICE MODEL] Deleting invoice ${id}...`);
    
    try {
      await db.query(
        `UPDATE invoices SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
        [id]
      );

      console.log(`✅ [INVOICE MODEL] Invoice ${id} cancelled successfully`);
      
      return true;
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Get invoice statistics
   * @returns {Promise<Object>} Invoice stats
   */
  async getStatistics() {
    try {
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_invoices,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
          SUM(CASE WHEN payment_status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_invoices,
          SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_invoices,
          SUM(net_amount) as total_invoice_amount,
          SUM(paid_amount) as total_paid_amount,
          SUM(balance_amount) as total_outstanding
        FROM invoices
        WHERE status != 'cancelled'
      `);

      return stats[0];
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Get invoices that are available for delivery creation
   * Returns invoices that either have no delivery challans or have partial deliveries
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Available invoices with delivery status
   */
  async getInvoicesAvailableForDelivery(filters = {}) {
    try {
      console.log('📋 [INVOICE MODEL] Fetching invoices available for delivery...');
      
      const conditions = ['i.status = ?'];
      const params = [filters.status || 'issued'];

      if (filters.shop_id) {
        conditions.push('i.shop_id = ?');
        params.push(filters.shop_id);
      }

      if (filters.route_id) {
        conditions.push('i.route_id = ?');
        params.push(filters.route_id);
      }

      if (filters.salesman_id) {
        conditions.push('i.salesman_id = ?');
        params.push(filters.salesman_id);
      }

      if (filters.from_date) {
        conditions.push('DATE(i.invoice_date) >= ?');
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        conditions.push('DATE(i.invoice_date) <= ?');
        params.push(filters.to_date);
      }

      const whereClause = conditions.join(' AND ');

      // Get invoices with their delivery status
      const [invoices] = await db.query(`
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.shop_id,
          i.shop_name,
          i.shop_address,
          i.shop_city,
          i.route_id,
          i.route_name,
          i.salesman_id,
          i.salesman_name,
          i.net_amount,
          i.payment_status,
          i.status,
          -- Count of invoice items
          (SELECT COUNT(*) FROM invoice_details WHERE invoice_id = i.id) as total_items,
          -- Count of delivered items (across all challans for this invoice)
          COALESCE((
            SELECT COUNT(DISTINCT di.product_id) 
            FROM deliveries d
            JOIN delivery_items di ON d.id = di.delivery_id
            WHERE d.invoice_id = i.id
          ), 0) as delivered_items_count,
          -- Check if any challan exists
          COALESCE((
            SELECT COUNT(*) FROM deliveries WHERE invoice_id = i.id
          ), 0) as challan_count,
          -- Get latest challan status
          (
            SELECT status 
            FROM deliveries 
            WHERE invoice_id = i.id 
            ORDER BY created_at DESC 
            LIMIT 1
          ) as latest_challan_status
        FROM invoices i
        WHERE ${whereClause}
        ORDER BY i.invoice_date DESC, i.created_at DESC
      `, params);

      console.log('✅ [INVOICE MODEL] Found', invoices.length, 'invoices');

      // Filter to show:
      // 1. Invoices with no challans at all
      // 2. Invoices with partial deliveries (delivered_items_count < total_items)
      const availableInvoices = invoices.filter(inv => {
        const hasNoChallan = inv.challan_count === 0;
        const hasPartialDelivery = inv.delivered_items_count < inv.total_items;
        return hasNoChallan || hasPartialDelivery;
      });

      // Add delivery status for display
      availableInvoices.forEach(inv => {
        if (inv.challan_count === 0) {
          inv.delivery_status = 'Not Started';
        } else if (inv.delivered_items_count < inv.total_items) {
          inv.delivery_status = `Partial (${inv.delivered_items_count}/${inv.total_items})`;
        }
      });

      console.log('✅ [INVOICE MODEL] Filtered to', availableInvoices.length, 'available invoices');
      
      return availableInvoices;
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error fetching available invoices:', error);
      throw error;
    }
  }
}

module.exports = new Invoice();

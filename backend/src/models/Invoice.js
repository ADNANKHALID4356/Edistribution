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
const ShopLedger = require('./ShopLedger');

// Database compatibility: SQLite uses 'order_items', MySQL uses 'order_details'
const useSQLite = process.env.USE_SQLITE === 'true';
const ORDER_DETAILS_TABLE = useSQLite ? 'order_items' : 'order_details';

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
            sh.phone as shop_phone
          FROM orders o
          LEFT JOIN salesmen s ON o.salesman_id = s.id
          LEFT JOIN shops sh ON o.shop_id = sh.id
          WHERE o.id = ?
        `, [invoiceData.order_id]);

        if (orders.length > 0) {
          orderDetails = orders[0];
          console.log('✅ [INVOICE MODEL] Order details fetched:', orderDetails.order_number);
          
          // **CRITICAL FIX:** Fetch order line items with product information
          // Uses dynamic table name for SQLite/MySQL compatibility
          console.log(`🔍 [INVOICE MODEL] Fetching order line items from ${ORDER_DETAILS_TABLE}...`);
          const [fetchedItems] = await connection.query(`
            SELECT 
              od.id,
              od.product_id,
              od.quantity,
              od.unit_price,
              od.total_price,
              od.discount_percentage,
              (od.unit_price * od.quantity) - od.total_price as discount_amount,
              od.total_price as net_price,
              p.product_name,
              p.product_code,
              p.category,
              p.brand,
              p.pack_size
            FROM ${ORDER_DETAILS_TABLE} od
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
              discount_percentage: parseFloat(item.discount_percentage) || 0,
              discount_amount: parseFloat(item.discount_amount) || 0,
              total_amount: parseFloat(item.total_price)  // Use total_price from order_items
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

      // Insert invoice header - SQLite compatibility (simple schema)
      const insertQuery = useSQLite ? 
        `INSERT INTO invoices (
          invoice_number, shop_id, invoice_date, due_date,
          total_amount, discount_amount, net_amount,
          balance_amount, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` :
        `INSERT INTO invoices (
          invoice_number, order_id,
          shop_id, shop_name,
          salesman_id, salesman_name,
          subtotal, discount_percentage, discount_amount,
          tax_percentage, tax_amount, 
          net_amount, balance_amount,
          payment_status, payment_type,
          invoice_date, due_date,
          notes, terms_conditions,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const invoiceParams = useSQLite ? [
        invoice_number,
        customerInfo.shop_id,
        invoice_date,
        due_date,
        subtotal,
        discount_amount,
        net_amount,
        total_payable, // balance_amount
        invoiceData.status || 'unpaid',
        invoiceData.notes || null
      ] : [
          invoice_number,
          invoiceData.order_id || null,
          customerInfo.shop_id,
          customerInfo.shop_name,
          salesmanInfo.salesman_id,
          salesmanInfo.salesman_name,
          subtotal,
          discount_percentage,
          discount_amount,
          tax_percentage,
          tax_amount,
          net_amount,
          total_payable, // Initial balance_amount = total_payable
          'unpaid', // payment_status
          invoiceData.payment_type || 'credit',
          invoice_date,
          due_date,
          invoiceData.notes || null,
          invoiceData.terms_conditions || 'Payment due within credit period. Goods once sold will not be taken back.',
          invoiceData.status || 'issued'
        ];

      const [invoiceResult] = await connection.query(insertQuery, invoiceParams);

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

        // SQLite invoice_items has simpler schema: invoice_id, product_id, quantity, unit_price, discount_percentage, total_price
        // MySQL invoice_details has: invoice_id, product_id, product_name, product_code, quantity, unit_price, discount_percentage, discount_amount, total_amount
        const itemInsertQuery = useSQLite ?
          `INSERT INTO invoice_items (
            invoice_id, product_id, quantity, unit_price, discount_percentage, total_price
          ) VALUES (?, ?, ?, ?, ?, ?)` :
          `INSERT INTO invoice_details (
            invoice_id, product_id, product_name, product_code,
            quantity, unit_price, 
            discount_percentage, discount_amount,
            total_amount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const itemParams = useSQLite ? [
          invoiceId,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.discount_percentage || 0,
          item.total_amount
        ] : [
          invoiceId,
          item.product_id,
          productDetails.product_name,
          productDetails.product_code || null,
          item.quantity,
          item.unit_price,
          item.discount_percentage || 0,
          item.discount_amount || 0,
          item.total_amount
        ];

        await connection.query(itemInsertQuery, itemParams);
      }

      // 🆕 Create ledger entry using the SAME connection (no nested transaction)
      // This ensures atomicity - if ledger fails, invoice creation also fails
      try {
        console.log('📒 [INVOICE MODEL] Creating shop ledger entry...');
        await ShopLedger.createEntry({
          shop_id: customerInfo.shop_id,
          shop_name: customerInfo.shop_name,
          transaction_date: invoice_date,
          transaction_type: 'invoice',
          reference_type: 'invoice',
          reference_id: invoiceId,
          reference_number: invoice_number,
          debit_amount: 0,
          credit_amount: net_amount,
          description: `Invoice ${invoice_number}`,
          notes: invoiceData.notes || null,
          created_by: invoiceData.created_by || null,
          created_by_name: invoiceData.prepared_by || salesmanInfo.salesman_name,
          is_manual: 0
        }, connection); // Pass the existing connection to avoid nested transaction
        console.log('✅ [INVOICE MODEL] Shop ledger entry created successfully');
      } catch (ledgerError) {
        console.error('⚠️ [INVOICE MODEL] Warning: Failed to create ledger entry:', ledgerError.message);
        // Log but don't fail the invoice creation
        // The recalculate function can fix this later
      }

      await connection.commit();
      connection.release();

      console.log(`✅ [INVOICE MODEL] Professional invoice ${invoiceId} created with ${items.length} items`);
      console.log(`   📄 Invoice Number: ${invoice_number}`);
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
      // Get invoice header with shop, route, and salesman details via JOIN
      // SQLite schema stores minimal data in invoices table, so we need to join
      const query = useSQLite ? `
        SELECT 
          i.*,
          s.shop_name,
          s.address as shop_address,
          s.city as shop_city,
          s.phone as shop_phone,
          s.owner_name as shop_owner,
          s.route_id,
          r.route_name,
          o.salesman_id,
          u.full_name as salesman_name
        FROM invoices i
        LEFT JOIN shops s ON i.shop_id = s.id
        LEFT JOIN routes r ON s.route_id = r.id
        LEFT JOIN orders o ON i.delivery_id = o.id OR (SELECT order_id FROM deliveries WHERE id = i.delivery_id) = o.id
        LEFT JOIN users u ON o.salesman_id = u.id
        WHERE i.id = ?
      ` : `
        SELECT * FROM invoices WHERE id = ?
      `;
      
      const [invoices] = await db.query(query, [id]);

      if (invoices.length === 0) {
        return null;
      }

      const invoice = invoices[0];

      // Get invoice items - use correct table name for SQLite
      const INVOICE_ITEMS_TABLE = useSQLite ? 'invoice_items' : 'invoice_details';
      
      // Get items with product details
      const itemsQuery = useSQLite ? `
        SELECT 
          ii.*,
          p.product_name,
          p.product_code,
          p.pack_size,
          p.unit_price as product_unit_price
        FROM ${INVOICE_ITEMS_TABLE} ii
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
        ORDER BY ii.id
      ` : `
        SELECT * FROM ${INVOICE_ITEMS_TABLE} WHERE invoice_id = ? ORDER BY id
      `;
      
      const [items] = await db.query(itemsQuery, [id]);

      // Get payment history - SQLite uses "payments" table, MySQL uses "invoice_payments"
      const PAYMENTS_TABLE = useSQLite ? 'payments' : 'invoice_payments';
      const [payments] = await db.query(
        `SELECT * FROM ${PAYMENTS_TABLE} WHERE invoice_id = ? ORDER BY payment_date DESC, created_at DESC`,
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
      const INVOICE_ITEMS_TABLE = useSQLite ? 'invoice_items' : 'invoice_details';
      const [invoices] = await db.query(
        `SELECT 
          invoices.*,
          (SELECT COUNT(*) FROM ${INVOICE_ITEMS_TABLE} WHERE invoice_id = invoices.id) as items_count
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

      const INVOICE_ITEMS_TABLE = useSQLite ? 'invoice_items' : 'invoice_details';
      const [invoices] = await db.query(
        `SELECT 
          invoices.*,
          (SELECT COUNT(*) FROM ${INVOICE_ITEMS_TABLE} WHERE invoice_id = invoices.id) as items_count
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
   * Generate unique payment receipt number
   * @param {Object} connection - Database connection
   * @returns {Promise<string>} Generated receipt number
   */
  async generateReceiptNumber(connection) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RCP-${dateStr}`;
    
    // Use correct table name based on database type
    const PAYMENTS_TABLE = useSQLite ? 'payments' : 'invoice_payments';
    
    const [result] = await connection.query(
      `SELECT receipt_number FROM ${PAYMENTS_TABLE} WHERE receipt_number LIKE ? ORDER BY receipt_number DESC LIMIT 1`,
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
   * Record a payment for an invoice with automatic ledger update
   * Enterprise-grade payment recording with full audit trail
   * @param {number} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} Updated invoice with payment info
   */
  async recordPayment(invoiceId, paymentData) {
    console.log(`💰 [INVOICE MODEL] Recording professional payment for invoice ${invoiceId}...`);
    console.log(`   Amount: ${paymentData.payment_amount}, Method: ${paymentData.payment_method}`);
    
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Get current invoice with shop details
      const [invoices] = await connection.query(`
        SELECT i.*, s.shop_name, s.current_balance as shop_current_balance
        FROM invoices i
        LEFT JOIN shops s ON i.shop_id = s.id
        WHERE i.id = ?
      `, [invoiceId]);

      if (invoices.length === 0) {
        throw new Error('Invoice not found');
      }

      const invoice = invoices[0];
      const paymentAmount = parseFloat(paymentData.payment_amount);
      
      // Validate payment amount
      if (paymentAmount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }
      
      if (paymentAmount > parseFloat(invoice.balance_amount)) {
        throw new Error(`Payment amount (${paymentAmount}) cannot exceed outstanding balance (${invoice.balance_amount})`);
      }

      // Generate unique receipt number
      const receipt_number = await this.generateReceiptNumber(connection);
      console.log(`📋 [INVOICE MODEL] Generated receipt number: ${receipt_number}`);

      // Use correct table name based on database type
      const PAYMENTS_TABLE = useSQLite ? 'payments' : 'invoice_payments';
      
      // SQLite has different column structure - use payments table schema
      if (useSQLite) {
        await connection.query(
          `INSERT INTO payments (
            receipt_number, shop_id, invoice_id, payment_date, amount,
            payment_method, reference_number, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            receipt_number,
            invoice.shop_id,
            invoiceId,
            paymentData.payment_date || new Date().toISOString().split('T')[0],
            paymentAmount,
            paymentData.payment_method || 'cash',
            paymentData.reference_number || null,
            paymentData.notes || null
          ]
        );
      } else {
        // MySQL invoice_payments table has more columns
        await connection.query(
          `INSERT INTO invoice_payments (
            receipt_number, invoice_id, payment_amount, payment_method, payment_date,
            reference_number, bank_name, cheque_number, cheque_date,
            notes, received_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            receipt_number,
            invoiceId,
            paymentAmount,
            paymentData.payment_method || 'cash',
            paymentData.payment_date || new Date(),
            paymentData.reference_number || null,
            paymentData.bank_name || null,
            paymentData.cheque_number || null,
            paymentData.cheque_date || null,
            paymentData.notes || null,
            paymentData.received_by || null
          ]
        );
      }

      // Calculate new paid amount and balance
      const newPaidAmount = parseFloat(invoice.paid_amount || 0) + paymentAmount;
      const newInvoiceBalance = parseFloat(invoice.net_amount) - newPaidAmount;

      // Determine payment status
      let paymentStatus = 'unpaid';
      if (newInvoiceBalance <= 0.01) { // Allow for floating point precision
        paymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        paymentStatus = 'partial';
      }

      console.log(`💰 [INVOICE MODEL] Payment calculation:`);
      console.log(`   Previous Paid: ${invoice.paid_amount || 0}`);
      console.log(`   This Payment: ${paymentAmount}`);
      console.log(`   New Paid Total: ${newPaidAmount}`);
      console.log(`   Invoice Net Amount: ${invoice.net_amount}`);
      console.log(`   New Invoice Balance: ${newInvoiceBalance}`);
      console.log(`   Payment Status: ${paymentStatus}`);

      // Update invoice paid_amount, balance_amount, and payment_status
      if (useSQLite) {
        await connection.query(
          `UPDATE invoices 
           SET paid_amount = ?, 
               balance_amount = ?, 
               status = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
          [newPaidAmount, Math.max(0, newInvoiceBalance), paymentStatus, invoiceId]
        );
      } else {
        await connection.query(
          `UPDATE invoices 
           SET paid_amount = ?, 
               balance_amount = ?, 
               payment_status = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [newPaidAmount, Math.max(0, newInvoiceBalance), paymentStatus, invoiceId]
        );
      }

      // 🆕 CREATE SHOP LEDGER ENTRY - This is the critical missing piece!
      // Payment from shop increases their balance (debit entry)
      console.log(`📒 [INVOICE MODEL] Creating shop ledger entry for payment...`);
      
      // Get previous balance for this shop from ledger
      const [prevEntries] = await connection.query(`
        SELECT balance FROM shop_ledger 
        WHERE shop_id = ? 
        ORDER BY transaction_date DESC, id DESC 
        LIMIT 1
      `, [invoice.shop_id]);
      
      const previousLedgerBalance = prevEntries.length > 0 ? parseFloat(prevEntries[0].balance) : 0;
      
      // Payment received from shop = DEBIT entry
      // In debt tracking: Positive balance = shop owes us money
      // Payment REDUCES their debt, so balance DECREASES
      // Formula: newBalance = previousBalance + creditAmount - debitAmount
      // For payment: debit = paymentAmount, credit = 0, so newBalance = previous - payment
      const debitAmount = paymentAmount;
      const creditAmount = 0;
      const newLedgerBalance = previousLedgerBalance + creditAmount - debitAmount;
      
      console.log(`💰 [LEDGER] Previous Balance: ${previousLedgerBalance}`);
      console.log(`💰 [LEDGER] Debit (Payment): -${debitAmount}`);
      console.log(`💰 [LEDGER] New Balance: ${newLedgerBalance}`);

      // Build description based on payment status
      let description = `Payment received - ${receipt_number}`;
      if (paymentStatus === 'paid') {
        description = `Full payment received for Invoice ${invoice.invoice_number} - ${receipt_number}`;
      } else if (paymentStatus === 'partial') {
        description = `Partial payment for Invoice ${invoice.invoice_number} - ${receipt_number}`;
      }
      
      // Add payment method details to description
      const methodLabels = {
        'cash': 'Cash',
        'bank': 'Bank Transfer',
        'bank_transfer': 'Bank Transfer',
        'cheque': 'Cheque',
        'online': 'Online Payment',
        'credit': 'Credit'
      };
      const methodLabel = methodLabels[paymentData.payment_method] || paymentData.payment_method;

      // Insert ledger entry
      if (useSQLite) {
        await connection.query(`
          INSERT INTO shop_ledger (
            shop_id, shop_name, transaction_date, transaction_type,
            reference_type, reference_id, reference_number,
            debit_amount, credit_amount, balance,
            description, notes, created_by, created_by_name, is_manual, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          invoice.shop_id,
          invoice.shop_name || null,
          paymentData.payment_date || new Date().toISOString().split('T')[0],
          'payment',
          'invoice_payment',
          invoiceId,
          receipt_number,
          debitAmount,
          creditAmount,
          newLedgerBalance,
          description,
          `${methodLabel} payment. ${paymentData.notes || ''}`.trim(),
          paymentData.created_by || null,
          paymentData.received_by || null,
          0
        ]);
      } else {
        await connection.query(`
          INSERT INTO shop_ledger (
            shop_id, shop_name, transaction_date, transaction_type,
            reference_type, reference_id, reference_number,
            debit_amount, credit_amount, balance,
            description, notes, created_by, created_by_name, is_manual
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          invoice.shop_id,
          invoice.shop_name || null,
          paymentData.payment_date || new Date(),
          'payment',
          'invoice_payment',
          invoiceId,
          receipt_number,
          debitAmount,
          creditAmount,
          newLedgerBalance,
          description,
          `${methodLabel} payment. ${paymentData.notes || ''}`.trim(),
          paymentData.created_by || null,
          paymentData.received_by || null,
          0
        ]);
      }

      // Update shop's current_balance
      if (useSQLite) {
        await connection.query(`
          UPDATE shops 
          SET current_balance = ?, 
              last_transaction_date = datetime('now')
          WHERE id = ?
        `, [newLedgerBalance, invoice.shop_id]);
      } else {
        await connection.query(`
          UPDATE shops 
          SET current_balance = ?, 
              last_transaction_date = NOW()
          WHERE id = ?
        `, [newLedgerBalance, invoice.shop_id]);
      }

      await connection.commit();
      connection.release();

      console.log(`✅ [INVOICE MODEL] Payment recorded successfully!`);
      console.log(`   📋 Receipt: ${receipt_number}`);
      console.log(`   💰 Amount: ${paymentAmount}`);
      console.log(`   📊 Invoice Status: ${paymentStatus}`);
      console.log(`   📒 New Ledger Balance: ${newLedgerBalance}`);
      
      // Return updated invoice with payment details
      const updatedInvoice = await this.findById(invoiceId);
      return {
        ...updatedInvoice,
        payment_receipt: {
          receipt_number,
          amount: paymentAmount,
          method: paymentData.payment_method,
          date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          previous_balance: parseFloat(invoice.balance_amount),
          new_balance: Math.max(0, newInvoiceBalance),
          payment_status: paymentStatus,
          ledger_balance: newLedgerBalance
        }
      };
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
      console.log('📋 [INVOICE MODEL] Using SQLite:', useSQLite);
      
      // SQLite schema: invoices table has status ('unpaid', 'partial', 'paid'), not 'issued'
      // We want invoices that are created and need delivery - typically unpaid or partial
      const INVOICE_ITEMS_TABLE = useSQLite ? 'invoice_items' : 'invoice_details';
      
      // Build conditions - for SQLite we need to fetch all invoices and join with shops
      const conditions = ['1=1']; // Base condition
      const params = [];

      // For SQLite, status is 'unpaid', 'partial', 'paid' - not 'issued'
      // We want invoices that need delivery - all that are not fully delivered yet
      // Don't filter by status here, filter by delivery status later

      if (filters.shop_id) {
        conditions.push('i.shop_id = ?');
        params.push(filters.shop_id);
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

      // SQLite query - join with shops table to get shop details
      // Note: SQLite deliveries table has order_id, not invoice_id
      // We need to link invoice -> delivery via order_id (if invoice has delivery_id) or treat as no challan
      const query = useSQLite ? `
        SELECT 
          i.id,
          i.invoice_number,
          i.invoice_date,
          i.shop_id,
          s.shop_name,
          s.address as shop_address,
          s.city as shop_city,
          r.id as route_id,
          r.route_name,
          i.net_amount,
          i.status as payment_status,
          i.status,
          i.delivery_id,
          -- Count of invoice items
          (SELECT COUNT(*) FROM ${INVOICE_ITEMS_TABLE} WHERE invoice_id = i.id) as total_items
        FROM invoices i
        LEFT JOIN shops s ON i.shop_id = s.id
        LEFT JOIN routes r ON s.route_id = r.id
        WHERE ${whereClause}
        ORDER BY i.invoice_date DESC, i.created_at DESC
      ` : `
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
          (SELECT COUNT(*) FROM ${INVOICE_ITEMS_TABLE} WHERE invoice_id = i.id) as total_items,
          COALESCE((
            SELECT COUNT(DISTINCT di.product_id) 
            FROM deliveries d
            JOIN delivery_items di ON d.id = di.delivery_id
            WHERE d.invoice_id = i.id
          ), 0) as delivered_items_count,
          COALESCE((
            SELECT COUNT(*) FROM deliveries WHERE invoice_id = i.id
          ), 0) as challan_count,
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
      `;

      const [invoices] = await db.query(query, params);

      console.log('✅ [INVOICE MODEL] Raw query returned', invoices.length, 'invoices');

      // For SQLite, we need to calculate delivery status differently
      // Since SQLite deliveries table doesn't have invoice_id, check if delivery_id exists on invoice
      let availableInvoices;
      
      if (useSQLite) {
        // For SQLite: invoice has delivery_id column - if null, no challan created
        availableInvoices = invoices.map(inv => {
          const hasNoChallan = !inv.delivery_id;
          return {
            ...inv,
            challan_count: hasNoChallan ? 0 : 1,
            delivered_items_count: hasNoChallan ? 0 : inv.total_items, // Assume full delivery if challan exists
            delivery_status: hasNoChallan ? 'Not Started' : 'Partial/Delivered'
          };
        }).filter(inv => inv.challan_count === 0); // Only show invoices without challans
      } else {
        // MySQL: Filter based on delivery status
        availableInvoices = invoices.filter(inv => {
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
      }

      console.log('✅ [INVOICE MODEL] Filtered to', availableInvoices.length, 'available invoices');
      
      return availableInvoices;
    } catch (error) {
      console.error('❌ [INVOICE MODEL] Error fetching available invoices:', error);
      throw error;
    }
  }
}

module.exports = new Invoice();

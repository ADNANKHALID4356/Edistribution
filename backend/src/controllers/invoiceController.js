/**
 * Invoice Controller
 * Sprint 7: Invoice & Bill Management
 * Company: Ummahtechinnovations.com
 * 
 * Handles all invoice-related HTTP requests
 */

const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

/**
 * Create invoice from an order (Desktop)
 * POST /api/desktop/invoices
 */
exports.createInvoice = async (req, res) => {
  try {
    const { order_id, shop_id, shop_name, salesman_id, salesman_name, items, ...invoiceData } = req.body;

    console.log('📝 [CONTROLLER] Creating invoice...');
    console.log('📝 [CONTROLLER] Order ID:', order_id);
    console.log('📝 [CONTROLLER] Items from frontend:', items?.length || 0);

    // Validation
    if (!shop_id && !order_id) {
      return res.status(400).json({
        success: false,
        message: 'Either shop_id or order_id is required'
      });
    }

    // If order_id is NOT provided, items are required
    if (!order_id && (!items || items.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must have at least one item when creating without an order'
      });
    }

    // If order_id is provided, verify order exists and is in valid status
    if (order_id) {
      const order = await Order.findById(order_id);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      // Check if order is in valid status for invoicing
      const validStatuses = ['approved', 'finalized', 'delivered'];
      if (!validStatuses.includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: `Only ${validStatuses.join(', ')} orders can be invoiced. Current status: ${order.status}`
        });
      }
      
      console.log('✅ [CONTROLLER] Order validated:', order.order_number, 'Status:', order.status);
    }

    // Create invoice - items will be fetched from order_details if order_id is provided
    const invoice = await Invoice.createFromOrder(
      {
        order_id,
        shop_id,
        shop_name,
        salesman_id,
        salesman_name,
        ...invoiceData
      },
      items || [] // Pass empty array if no items, will be fetched from order_details
    );

    console.log(`✅ [CONTROLLER] Invoice ${invoice.invoice_number} created successfully`);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error creating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message
    });
  }
};

/**
 * Get all invoices with pagination and filters (Desktop)
 * GET /api/desktop/invoices
 */
exports.getAllInvoices = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search || req.query.invoice_number || '',
      status: req.query.status || '',
      shop_id: req.query.shop_id || '',
      salesman_id: req.query.salesman_id || '',
      payment_status: req.query.payment_status || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || '',
      sortBy: req.query.sortBy || 'invoice_date',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await Invoice.findAll(filters);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message
    });
  }
};

/**
 * Get invoice by ID with details (Desktop)
 * GET /api/desktop/invoices/:id
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice',
      error: error.message
    });
  }
};

/**
 * Update invoice (Desktop)
 * PUT /api/desktop/invoices/:id
 */
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if invoice exists
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Cannot update cancelled invoices
    if (existingInvoice.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update cancelled invoices'
      });
    }

    // Update invoice
    const updatedInvoice = await Invoice.update(id, updateData);

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error updating invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message
    });
  }
};

/**
 * Delete invoice (Admin can delete any invoice with force flag)
 * DELETE /api/desktop/invoices/:id
 * DELETE /api/desktop/invoices/:id?force=true (Admin override)
 */
exports.deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // Admin override: ?force=true
    const db = require('../config/database');
    
    // SQLite compatibility - use correct table names
    const useSQLite = process.env.USE_SQLITE === 'true';
    const PAYMENTS_TABLE = useSQLite ? 'payments' : 'invoice_payments';
    const INVOICE_ITEMS_TABLE = useSQLite ? 'invoice_items' : 'invoice_details';

    // Check if invoice exists
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check for dependencies (payments)
    const [payments] = await db.query(`SELECT COUNT(*) as count FROM ${PAYMENTS_TABLE} WHERE invoice_id = ?`, [id]);
    
    // Check for deliveries - SQLite deliveries table doesn't have invoice_id column
    let deliveriesCount = 0;
    if (!useSQLite) {
      const [deliveries] = await db.query('SELECT COUNT(*) as count FROM deliveries WHERE invoice_id = ?', [id]);
      deliveriesCount = deliveries[0].count;
    }

    const hasPayments = payments[0].count > 0;
    const hasDeliveries = deliveriesCount > 0;
    // SQLite uses 'status' column, MySQL uses 'payment_status'
    const invoiceStatus = existingInvoice.payment_status || existingInvoice.status;
    const isPaidOrPartial = invoiceStatus === 'paid' || invoiceStatus === 'partial';

    // If invoice has payments/deliveries and force flag is not set, return error with details
    if ((hasPayments || isPaidOrPartial || hasDeliveries) && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice with existing payments or deliveries',
        dependencies: {
          payments: payments[0].count,
          deliveries: deliveriesCount,
          payment_status: invoiceStatus,
          paid_amount: existingInvoice.paid_amount
        },
        hint: 'Use force=true query parameter to delete invoice with all related data (Admin only)'
      });
    }

    // Admin force delete: Remove all dependencies first
    if (force === 'true') {
      console.log(`[ADMIN FORCE DELETE] Deleting invoice ${id} with all dependencies...`);
      
      // Start transaction
      const connection = await db.getConnection();
      await connection.beginTransaction();

      try {
        // 1. Delete payments (use correct table name)
        await connection.query(`DELETE FROM ${PAYMENTS_TABLE} WHERE invoice_id = ?`, [id]);
        
        // 2. Delete invoice items (use correct table name)
        await connection.query(`DELETE FROM ${INVOICE_ITEMS_TABLE} WHERE invoice_id = ?`, [id]);
        
        // 3. Set deliveries.invoice_id to NULL (only for MySQL - SQLite doesn't have this column)
        if (!useSQLite) {
          await connection.query('UPDATE deliveries SET invoice_id = NULL WHERE invoice_id = ?', [id]);
        }
        
        // 4. Delete related shop_ledger entries for this invoice
        await connection.query('DELETE FROM shop_ledger WHERE reference_type = ? AND reference_id = ?', ['invoice', id]);
        await connection.query('DELETE FROM shop_ledger WHERE reference_type = ? AND reference_id = ?', ['invoice_payment', id]);
        
        // 5. Finally, delete the invoice
        await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

        await connection.commit();
        connection.release();

        console.log(`[ADMIN FORCE DELETE] Successfully deleted invoice ${id} and all related data`);

        res.json({
          success: true,
          message: 'Invoice and all related data deleted successfully (Admin override)',
          deleted: {
            invoice: existingInvoice.invoice_number,
            payments: payments[0].count,
            deliveries: deliveriesCount,
            paid_amount: existingInvoice.paid_amount
          }
        });

      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }

    } else {
      // Normal delete (no dependencies)
      await Invoice.delete(id);

      res.json({
        success: true,
        message: 'Invoice cancelled successfully'
      });
    }

  } catch (error) {
    console.error('❌ [CONTROLLER] Error deleting invoice:', error);
    
    // Check if it's a foreign key constraint error
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete invoice because it has related records (payments or deliveries)',
        hint: 'Use force=true to delete invoice with all related data (Admin only)',
        error: 'Foreign key constraint violation'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: error.message
    });
  }
};

/**
 * Record payment for invoice (Desktop)
 * PUT /api/desktop/invoices/:id/payment
 */
exports.recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;

    console.log(`💰 [CONTROLLER] Recording payment for invoice ${id}...`);

    // Validation
    if (!paymentData.payment_amount || paymentData.payment_amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    if (!paymentData.payment_method) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required'
      });
    }

    // Check if invoice exists
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if payment amount exceeds balance
    if (parseFloat(paymentData.payment_amount) > parseFloat(existingInvoice.balance_amount)) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed outstanding balance'
      });
    }

    // Record payment
    const updatedInvoice = await Invoice.recordPayment(id, paymentData);

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

/**
 * Get invoices by shop (Desktop)
 * GET /api/desktop/invoices/by-shop/:shopId
 */
exports.getInvoicesByShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      payment_status: req.query.payment_status || '',
      start_date: req.query.start_date || '',
      end_date: req.query.end_date || ''
    };

    const result = await Invoice.findByShop(shopId, filters);

    res.json({
      success: true,
      data: result.invoices,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching shop invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shop invoices',
      error: error.message
    });
  }
};

/**
 * Get unpaid invoices (Desktop)
 * GET /api/desktop/invoices/unpaid
 */
exports.getUnpaidInvoices = async (req, res) => {
  try {
    const filters = {
      shop_id: req.query.shop_id || '',
      limit: parseInt(req.query.limit) || 100
    };

    const invoices = await Invoice.findUnpaid(filters);

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching unpaid invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unpaid invoices',
      error: error.message
    });
  }
};

/**
 * Get invoice statistics (Desktop)
 * GET /api/desktop/invoices/statistics
 */
exports.getInvoiceStatistics = async (req, res) => {
  try {
    const stats = await Invoice.getStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching invoice statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice statistics',
      error: error.message
    });
  }
};

/**
 * Get invoices available for delivery (without or with partial challans)
 * GET /api/desktop/invoices/available-for-delivery
 */
exports.getInvoicesAvailableForDelivery = async (req, res) => {
  try {
    console.log('📋 [CONTROLLER] Fetching invoices available for delivery...');
    
    const filters = {
      status: req.query.status || 'issued', // Only issued invoices
      shop_id: req.query.shop_id,
      route_id: req.query.route_id,
      salesman_id: req.query.salesman_id,
      from_date: req.query.from_date,
      to_date: req.query.to_date
    };

    const invoices = await Invoice.getInvoicesAvailableForDelivery(filters);

    console.log('✅ [CONTROLLER] Found', invoices.length, 'invoices available for delivery');

    res.json({
      success: true,
      data: invoices,
      count: invoices.length
    });
  } catch (error) {
    console.error('❌ [CONTROLLER] Error fetching available invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available invoices',
      error: error.message
    });
  }
};

/**
 * Bulk delete cancelled invoices
 * DELETE /api/desktop/invoices/bulk-delete
 * Body: { invoiceIds: [1, 2, 3] }
 */
exports.bulkDeleteInvoices = async (req, res) => {
  try {
    const { invoiceIds } = req.body;
    const db = require('../config/database');

    // Validation
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of invoice IDs to delete'
      });
    }

    console.log(`🗑️ [BULK DELETE] Processing deletion of ${invoiceIds.length} invoices...`);

    const results = {
      deleted: [],
      failed: [],
      total: invoiceIds.length
    };

    // Start transaction
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      for (const invoiceId of invoiceIds) {
        try {
          // Check if invoice exists and is cancelled
          const [invoices] = await connection.query(
            'SELECT id, invoice_number, status FROM invoices WHERE id = ?',
            [invoiceId]
          );

          if (invoices.length === 0) {
            results.failed.push({
              id: invoiceId,
              reason: 'Invoice not found'
            });
            continue;
          }

          const invoice = invoices[0];

          // Only allow deletion of cancelled invoices
          if (invoice.status !== 'cancelled') {
            results.failed.push({
              id: invoiceId,
              invoice_number: invoice.invoice_number,
              reason: 'Only cancelled invoices can be bulk deleted'
            });
            continue;
          }

          // Delete related payment records first
          await connection.query('DELETE FROM invoice_payments WHERE invoice_id = ?', [invoiceId]);

          // Clear invoice_id from deliveries (don't delete deliveries)
          await connection.query('UPDATE deliveries SET invoice_id = NULL WHERE invoice_id = ?', [invoiceId]);

          // Delete invoice details (line items)
          await connection.query('DELETE FROM invoice_details WHERE invoice_id = ?', [invoiceId]);

          // Delete invoice
          await connection.query('DELETE FROM invoices WHERE id = ?', [invoiceId]);

          results.deleted.push({
            id: invoiceId,
            invoice_number: invoice.invoice_number
          });

          console.log(`✅ Deleted invoice ${invoice.invoice_number}`);

        } catch (err) {
          console.error(`❌ Failed to delete invoice ${invoiceId}:`, err);
          results.failed.push({
            id: invoiceId,
            reason: err.message
          });
        }
      }

      await connection.commit();
      console.log(`✅ [BULK DELETE] Successfully deleted ${results.deleted.length} invoices`);

      res.json({
        success: true,
        message: `Successfully deleted ${results.deleted.length} of ${results.total} invoices`,
        data: results
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ [BULK DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk delete invoices',
      error: error.message
    });
  }
};

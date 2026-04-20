/**
 * PROFESSIONAL LEDGER CONTROLLER - REBUILT
 * Distribution Industry Standard
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * Handles HTTP requests for shop ledger operations with professional
 * accounting standards and comprehensive financial reporting.
 */

const ShopLedger = require('../models/ShopLedgerProfessional');
const Payment = require('../models/Payment');

// ============================================================================
// SHOP LEDGER VIEWS
// ============================================================================

/**
 * Get shop ledger with complete transaction history
 * GET /api/desktop/ledger/shop/:shopId
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Records per page (default: 50)
 * - start_date: Filter from date (YYYY-MM-DD)
 * - end_date: Filter to date (YYYY-MM-DD)
 * - transaction_type: Filter by type (invoice, payment, etc.)
 * - min_amount: Minimum amount filter
 * - max_amount: Maximum amount filter
 */
exports.getShopLedger = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
      transaction_type: req.query.transaction_type || null,
      min_amount: req.query.min_amount ? parseFloat(req.query.min_amount) : null,
      max_amount: req.query.max_amount ? parseFloat(req.query.max_amount) : null
    };
    
    const ledgerData = await ShopLedger.getShopLedger(shopId, filters);
    
    res.json({
      success: true,
      message: 'Shop ledger retrieved successfully',
      data: ledgerData
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting shop ledger:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shop ledger',
      error: error.message
    });
  }
};

/**
 * Get professional account statement (formatted for printing/PDF)
 * GET /api/desktop/ledger/statement/:shopId
 * 
 * Query Parameters:
 * - start_date: Statement start date (YYYY-MM-DD)
 * - end_date: Statement end date (YYYY-MM-DD)
 * - include_details: Include transaction details (true/false)
 */
exports.getAccountStatement = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const options = {
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
      include_details: req.query.include_details !== 'false'
    };
    
    const statement = await ShopLedger.getAccountStatement(shopId, options);
    
    res.json({
      success: true,
      message: 'Account statement generated successfully',
      data: statement
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error generating statement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate account statement',
      error: error.message
    });
  }
};

/**
 * Get comprehensive aging analysis
 * GET /api/desktop/ledger/aging
 * GET /api/desktop/ledger/aging/:shopId (single shop)
 * 
 * Response includes:
 * - Aging buckets (0-30, 31-60, 61-90, 90+ days)
 * - Risk classification
 * - Collection priority
 * - Recommendations
 */
exports.getAgingAnalysis = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const analysis = await ShopLedger.getAgingAnalysis(shopId || null);
    
    res.json({
      success: true,
      message: 'Aging analysis generated successfully',
      data: analysis
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error generating aging analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate aging analysis',
      error: error.message
    });
  }
};

// ============================================================================
// BALANCE OPERATIONS
// ============================================================================

/**
 * Get current balance for a shop
 * GET /api/desktop/ledger/balance/:shopId
 */
exports.getShopBalance = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const balance = await ShopLedger.getShopCurrentBalance(shopId);
    
    res.json({
      success: true,
      message: 'Shop balance retrieved successfully',
      data: {
        shop_id: parseInt(shopId),
        current_balance: balance
      }
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting shop balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shop balance',
      error: error.message
    });
  }
};

/**
 * Get balance summary for all shops
 * GET /api/desktop/ledger/balance
 * 
 * Query Parameters:
 * - page: Page number
 * - limit: Records per page
 * - sort_by: Sort field (balance, shop_name, etc.)
 * - order: Sort order (ASC, DESC)
 * - search: Search shop name/code
 * - min_balance: Minimum balance filter
 * - max_balance: Maximum balance filter
 * - status: Filter by status (over_limit, high_utilization, etc.)
 */
exports.getAllShopsBalance = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort_by: req.query.sort_by || 'balance',
      order: req.query.order || 'DESC',
      search: req.query.search || null,
      min_balance: req.query.min_balance ? parseFloat(req.query.min_balance) : null,
      max_balance: req.query.max_balance ? parseFloat(req.query.max_balance) : null,
      status: req.query.status || null
    };

    const offset = (filters.page - 1) * filters.limit;
    const db = require('../config/database');

    // Build WHERE clause
    let whereConditions = ['1=1'];
    let queryParams = [];

    if (filters.search) {
      whereConditions.push('(s.shop_name LIKE ? OR s.shop_code LIKE ?)');
      queryParams.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get shops with balances
    const [shops] = await db.query(`
      SELECT 
        s.*,
        COALESCE((SELECT balance FROM shop_ledger WHERE shop_id = s.id ORDER BY transaction_date DESC, id DESC LIMIT 1), 0) as current_balance,
        COALESCE((SELECT SUM(debit_amount) FROM shop_ledger WHERE shop_id = s.id), 0) as total_debits,
        COALESCE((SELECT SUM(credit_amount) FROM shop_ledger WHERE shop_id = s.id), 0) as total_credits,
        COALESCE((SELECT COUNT(*) FROM shop_ledger WHERE shop_id = s.id AND transaction_type = 'invoice' AND balance > 0), 0) as unpaid_invoices,
        COALESCE((SELECT MAX(transaction_date) FROM shop_ledger WHERE shop_id = s.id AND transaction_type = 'payment'), NULL) as last_payment_date,
        COALESCE((SELECT MAX(transaction_date) FROM shop_ledger WHERE shop_id = s.id AND transaction_type = 'invoice'), NULL) as last_invoice_date
      FROM shops s
      WHERE ${whereClause}
      ORDER BY ${filters.sort_by} ${filters.order}
      LIMIT ? OFFSET ?
    `, [...queryParams, filters.limit, offset]);

    // Calculate additional metrics
    const shopsWithMetrics = shops.map(shop => {
      const current_balance = parseFloat(shop.current_balance || 0);
      const credit_limit = parseFloat(shop.credit_limit || 0);
      const total_debits = parseFloat(shop.total_debits || 0);
      const total_credits = parseFloat(shop.total_credits || 0);

      return {
        ...shop,
        current_balance,
        credit_limit,
        total_debits,
        total_credits,
        available_credit: credit_limit - current_balance,
        credit_utilization: credit_limit > 0 ? ((current_balance / credit_limit) * 100).toFixed(2) : 0,
        is_over_limit: current_balance > credit_limit,
        collection_rate: total_debits > 0 ? ((total_credits / total_debits) * 100).toFixed(2) : 0,
        status: current_balance > credit_limit ? 'over_limit' :
                current_balance / credit_limit > 0.9 ? 'high_utilization' :
                current_balance / credit_limit > 0.75 ? 'moderate' : 'good'
      };
    });

    // Apply status filter
    let filteredShops = shopsWithMetrics;
    if (filters.status) {
      filteredShops = shopsWithMetrics.filter(s => s.status === filters.status);
    }

    // Apply balance filters
    if (filters.min_balance !== null) {
      filteredShops = filteredShops.filter(s => s.current_balance >= filters.min_balance);
    }
    if (filters.max_balance !== null) {
      filteredShops = filteredShops.filter(s => s.current_balance <= filters.max_balance);
    }

    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM shops s WHERE ${whereClause}
    `, queryParams);

    const total = countResult[0].total;

    // Calculate summary statistics
    const summary = {
      total_shops: filteredShops.length,
      total_outstanding: filteredShops.reduce((sum, s) => sum + s.current_balance, 0),
      total_over_limit: filteredShops.filter(s => s.is_over_limit).length,
      total_high_utilization: filteredShops.filter(s => parseFloat(s.credit_utilization) > 80).length,
      average_balance: filteredShops.length > 0 ? 
        filteredShops.reduce((sum, s) => sum + s.current_balance, 0) / filteredShops.length : 0,
      average_utilization: filteredShops.length > 0 ?
        filteredShops.reduce((sum, s) => sum + parseFloat(s.credit_utilization), 0) / filteredShops.length : 0
    };

    res.json({
      success: true,
      message: 'Shops balance retrieved successfully',
      data: {
        shops: filteredShops,
        summary,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting shops balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shops balance',
      error: error.message
    });
  }
};

// ============================================================================
// CREDIT MANAGEMENT
// ============================================================================

/**
 * Check if shop can place order (credit limit validation)
 * POST /api/desktop/ledger/check-credit
 * 
 * Body: { shop_id, order_amount }
 */
exports.checkCreditLimit = async (req, res) => {
  try {
    const { shop_id, order_amount } = req.body;
    
    if (!shop_id || !order_amount) {
      return res.status(400).json({
        success: false,
        message: 'shop_id and order_amount are required'
      });
    }
    
    const result = await ShopLedger.checkCreditLimit(shop_id, parseFloat(order_amount));
    
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error checking credit limit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check credit limit',
      error: error.message
    });
  }
};

// ============================================================================
// MANUAL ADJUSTMENTS
// ============================================================================

/**
 * Create manual adjustment entry (Admin only)
 * POST /api/desktop/ledger/adjustment
 * 
 * Body: {
 *   shop_id,
 *   amount,
 *   type: 'debit' | 'credit',
 *   description,
 *   notes,
 *   created_by
 * }
 */
exports.createAdjustment = async (req, res) => {
  try {
    const { shop_id, amount, type, description, notes, created_by } = req.body;
    
    // Validation
    if (!shop_id || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'shop_id, amount, and type are required'
      });
    }

    if (type !== 'debit' && type !== 'credit') {
      return res.status(400).json({
        success: false,
        message: 'type must be either "debit" or "credit"'
      });
    }

    if (parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be greater than 0'
      });
    }

    // TODO: Check if user has admin permissions
    
    const entry = await ShopLedger.createAdjustment({
      shop_id: parseInt(shop_id),
      amount: parseFloat(amount),
      type,
      description: description || 'Manual Adjustment',
      notes: notes || '',
      created_by: created_by || req.user?.id || 1
    });
    
    res.json({
      success: true,
      message: 'Adjustment created successfully',
      data: entry
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error creating adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create adjustment',
      error: error.message
    });
  }
};

// ============================================================================
// PAYMENT RECORDING
// ============================================================================

/**
 * Record payment from shop (with FIFO allocation)
 * POST /api/desktop/ledger/payment
 * 
 * Body: {
 *   shop_id,
 *   amount,
 *   payment_date,
 *   payment_method,
 *   reference_no,
 *   notes,
 *   collected_by
 * }
 */
exports.recordPayment = async (req, res) => {
  try {
    const paymentData = {
      shop_id: parseInt(req.body.shop_id),
      amount: parseFloat(req.body.amount),
      payment_date: req.body.payment_date || new Date().toISOString().split('T')[0],
      payment_method: req.body.payment_method || 'cash',
      reference_no: req.body.reference_no || null,
      notes: req.body.notes || '',
      collected_by: req.body.collected_by || req.user?.id || 1
    };

    // Validation
    if (!paymentData.shop_id || !paymentData.amount) {
      return res.status(400).json({
        success: false,
        message: 'shop_id and amount are required'
      });
    }

    if (paymentData.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be greater than 0'
      });
    }

    // Record payment (this will auto-create ledger entry)
    const result = await Payment.recordPayment(paymentData);
    
    res.json({
      success: true,
      message: 'Payment recorded successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error recording payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

/**
 * Get payment history for a shop
 * GET /api/desktop/ledger/payments/:shopId
 */
exports.getShopPayments = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const payments = await Payment.getShopPayments(
      parseInt(shopId),
      parseInt(page),
      parseInt(limit)
    );
    
    res.json({
      success: true,
      message: 'Payment history retrieved successfully',
      data: payments
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
};

// ============================================================================
// DATA INTEGRITY
// ============================================================================

/**
 * Recalculate balances for data integrity
 * POST /api/desktop/ledger/recalculate/:shopId
 * 
 * Admin only - use this if you suspect balance calculation errors
 */
exports.recalculateBalances = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    // TODO: Check if user has admin permissions
    
    const result = await ShopLedger.recalculateBalances(parseInt(shopId));
    
    res.json({
      success: true,
      message: 'Balances recalculated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error recalculating balances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to recalculate balances',
      error: error.message
    });
  }
};

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Get comprehensive financial dashboard data
 * GET /api/desktop/ledger/dashboard
 * 
 * Returns:
 * - Total outstanding
 * - Aging summary
 * - Top debtors
 * - Collection trends
 * - Risk alerts
 */
exports.getDashboard = async (req, res) => {
  try {
    const db = require('../config/database');

    // Get summary statistics
    const [summary] = await db.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_shops,
        COALESCE(SUM(l.balance), 0) as total_outstanding,
        COALESCE(AVG(l.balance), 0) as average_balance,
        COUNT(CASE WHEN l.balance > s.credit_limit THEN 1 END) as shops_over_limit
      FROM shops s
      LEFT JOIN (
        SELECT shop_id, balance
        FROM shop_ledger l1
        WHERE id = (SELECT MAX(id) FROM shop_ledger l2 WHERE l2.shop_id = l1.shop_id)
      ) l ON s.id = l.shop_id
    `);

    // Get aging analysis
    const aging = await ShopLedger.getAgingAnalysis();

    // Get top 10 debtors
    const [topDebtors] = await db.query(`
      SELECT 
        s.id, s.shop_code, s.shop_name,
        COALESCE(l.balance, 0) as current_balance,
        s.credit_limit
      FROM shops s
      LEFT JOIN (
        SELECT shop_id, balance
        FROM shop_ledger l1
        WHERE id = (SELECT MAX(id) FROM shop_ledger l2 WHERE l2.shop_id = l1.shop_id)
      ) l ON s.id = l.shop_id
      WHERE COALESCE(l.balance, 0) > 0
      ORDER BY l.balance DESC
      LIMIT 10
    `);

    // Get recent transactions
    const [recentTransactions] = await db.query(`
      SELECT l.*, s.shop_name
      FROM shop_ledger l
      JOIN shops s ON l.shop_id = s.id
      ORDER BY l.created_at DESC
      LIMIT 20
    `);

    res.json({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: {
        summary: summary[0],
        aging: aging,
        top_debtors: topDebtors,
        recent_transactions: recentTransactions
      }
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: error.message
    });
  }
};

module.exports = exports;

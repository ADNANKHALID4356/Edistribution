/**
 * Ledger Controller
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * Handles HTTP requests for shop ledger operations:
 * - View shop ledger
 * - Account statements
 * - Manual adjustments
 * - Balance queries
 * - Aging analysis
 * - Credit limit checking
 */

const ShopLedger = require('../models/ShopLedger');
const Payment = require('../models/Payment');

/**
 * Get shop ledger with transactions
 * GET /api/desktop/ledger/shop/:shopId
 */
exports.getShopLedger = async (req, res) => {
  try {
    const { shopId } = req.params;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
      transaction_type: req.query.transaction_type || null
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
 * Get account statement for a shop
 * GET /api/desktop/ledger/statement/:shopId
 */
exports.getAccountStatement = async (req, res) => {
  try {
    const { shopId } = req.params;
    const options = {
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null
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
 * Create manual adjustment entry
 * POST /api/desktop/ledger/adjustment
 */
exports.createAdjustment = async (req, res) => {
  try {
    const adjustmentData = {
      ...req.body,
      created_by: req.user?.id,
      created_by_name: req.user?.full_name
    };
    
    const ledgerEntry = await ShopLedger.createAdjustment(adjustmentData);
    
    res.status(201).json({
      success: true,
      message: 'Manual adjustment created successfully',
      data: ledgerEntry
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

/**
 * Get aging analysis for a shop
 * GET /api/desktop/ledger/aging/:shopId
 */
exports.getShopAging = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const aging = await ShopLedger.getAgingAnalysis(shopId);
    
    res.json({
      success: true,
      message: 'Aging analysis retrieved successfully',
      data: aging
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting aging:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get aging analysis',
      error: error.message
    });
  }
};

/**
 * Get aging analysis for all shops
 * GET /api/desktop/ledger/aging
 */
exports.getAllAgingAnalysis = async (req, res) => {
  try {
    const aging = await ShopLedger.getAllAgingAnalysis();
    
    res.json({
      success: true,
      message: 'Aging analysis retrieved successfully',
      data: aging
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting aging:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get aging analysis',
      error: error.message
    });
  }
};

/**
 * Check credit limit before order
 * POST /api/desktop/ledger/check-credit
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
    
    const checkResult = await ShopLedger.checkCreditLimit(shop_id, order_amount);
    
    res.json({
      success: true,
      message: 'Credit limit check completed',
      data: checkResult
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error checking credit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check credit limit',
      error: error.message
    });
  }
};

/**
 * Get shop balance
 * GET /api/desktop/ledger/balance/:shopId
 */
exports.getShopBalance = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const balance = await ShopLedger.getShopBalance(shopId);
    
    res.json({
      success: true,
      message: 'Shop balance retrieved successfully',
      data: balance
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shop balance',
      error: error.message
    });
  }
};

/**
 * Get all shops balance summary
 * GET /api/desktop/ledger/balance
 */
exports.getAllShopsBalance = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      sort_by: req.query.sort_by || 'current_balance',
      order: req.query.order || 'DESC'
    };
    
    const result = await ShopLedger.getAllShopsBalance(filters);
    
    res.json({
      success: true,
      message: 'All shops balance retrieved successfully',
      data: result.shops,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting balances:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shops balance',
      error: error.message
    });
  }
};

/**
 * Record a payment (with auto-allocation)
 * POST /api/desktop/ledger/payment
 */
exports.recordPayment = async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      created_by: req.user?.id,
      created_by_name: req.user?.full_name
    };
    
    const result = await Payment.recordPayment(paymentData);
    
    res.status(201).json({
      success: true,
      message: result.message,
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
 * Get payment by ID
 * GET /api/desktop/ledger/payment/:id
 */
exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Payment retrieved successfully',
      data: payment
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment',
      error: error.message
    });
  }
};

/**
 * Get all payments
 * GET /api/desktop/ledger/payments
 */
exports.getAllPayments = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      shop_id: req.query.shop_id || null,
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null,
      payment_method: req.query.payment_method || null
    };
    
    const result = await Payment.findAll(filters);
    
    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: error.message
    });
  }
};

/**
 * Get shop's payment history
 * GET /api/desktop/ledger/payments/shop/:shopId
 */
exports.getShopPayments = async (req, res) => {
  try {
    const { shopId } = req.params;
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      start_date: req.query.start_date || null,
      end_date: req.query.end_date || null
    };
    
    const result = await Payment.getShopPayments(shopId, filters);
    
    res.json({
      success: true,
      message: 'Shop payments retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting shop payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shop payments',
      error: error.message
    });
  }
};

/**
 * Get payment summary for a shop
 * GET /api/desktop/ledger/payments/summary/:shopId
 */
exports.getShopPaymentSummary = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    const summary = await Payment.getShopPaymentSummary(shopId);
    
    res.json({
      success: true,
      message: 'Payment summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error getting payment summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment summary',
      error: error.message
    });
  }
};

/**
 * Recalculate shop ledger balances
 * POST /api/desktop/ledger/shop/:shopId/recalculate
 * Admin/Manager only
 */
exports.recalculateBalances = async (req, res) => {
  try {
    const { shopId } = req.params;
    
    console.log(`🔄 [LEDGER CONTROLLER] Recalculating balances for shop ${shopId}...`);
    
    const result = await ShopLedger.recalculateBalances(shopId);
    
    res.json({
      success: true,
      message: `Recalculated ${result.entries_updated} ledger entries`,
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

/**
 * Clear shop transaction history
 * DELETE /api/desktop/ledger/shop/:shopId/history
 * Admin only - clears ledger entries but preserves shop and invoice data
 */
exports.clearTransactionHistory = async (req, res) => {
  try {
    const { shopId } = req.params;
    const { retain_opening_balance } = req.body;
    
    // Only admins can clear transaction history
    const userRole = req.user.role_name || req.user.role;
    if (userRole !== 'admin' && userRole !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can clear transaction history'
      });
    }
    
    console.log(`🗑️ [LEDGER CONTROLLER] Clearing history for shop ${shopId} (retain_balance: ${retain_opening_balance})...`);
    
    const result = await ShopLedger.clearTransactionHistory(shopId, { 
      retain_opening_balance: retain_opening_balance === true 
    });
    
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    console.error('❌ [LEDGER CONTROLLER] Error clearing transaction history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear transaction history',
      error: error.message
    });
  }
};

module.exports = exports;

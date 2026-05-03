/**
 * Ledger Routes - WORKING VERSION
 * Company: Ummahtechinnovations.com
 * Date: January 22, 2026
 * 
 * Routes for shop ledger management system
 */

const express = require('express');
const router = express.Router();
const ledgerController = require('../../controllers/ledgerController');
const { protect, authorize, ROLES } = require('../../middleware/auth');
const LEDGER_PAYMENT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.ACCOUNTANT];
const LEDGER_ANALYTICS_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER];

// All routes require authentication
router.use(protect);

// ============================================================================
// SHOP LEDGER ROUTES
// ============================================================================

/**
 * @route   GET /api/desktop/ledger/shop/:shopId
 * @desc    Get shop ledger with transactions
 * @access  Admin, Manager
 * @query   page, limit, start_date, end_date, transaction_type
 */
router.get('/shop/:shopId', 
  authorize(...LEDGER_PAYMENT_ROLES), 
  ledgerController.getShopLedger
);

/**
 * @route   GET /api/desktop/ledger/statement/:shopId
 * @desc    Generate account statement for a shop
 * @access  Admin, Manager
 * @query   start_date, end_date
 */
router.get('/statement/:shopId', 
  authorize(...LEDGER_PAYMENT_ROLES), 
  ledgerController.getAccountStatement
);

/**
 * @route   POST /api/desktop/ledger/adjustment
 * @desc    Create manual adjustment entry
 * @access  Admin only
 * @body    shop_id, amount, type (debit/credit), description, notes
 */
router.post('/adjustment', 
  authorize(...LEDGER_PAYMENT_ROLES), 
  ledgerController.createAdjustment
);

// ============================================================================
// BALANCE & CREDIT ROUTES
// ============================================================================

/**
 * @route   GET /api/desktop/ledger/balance/:shopId
 * @desc    Get shop balance summary
 * @access  Admin, Manager
 */
router.get('/balance/:shopId', 
  authorize(...LEDGER_ANALYTICS_ROLES), 
  ledgerController.getShopBalance
);

/**
 * @route   GET /api/desktop/ledger/balance
 * @desc    Get all shops balance summary
 * @access  Admin, Manager
 * @query   page, limit, sort_by, order
 */
router.get('/balance', 
  authorize(...LEDGER_ANALYTICS_ROLES), 
  ledgerController.getAllShopsBalance
);

/**
 * @route   POST /api/desktop/ledger/check-credit
 * @desc    Check if shop can place order (credit limit check)
 * @access  Admin, Manager, Salesman
 * @body    shop_id, order_amount
 */
router.post('/check-credit', 
  authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.SALESMAN), 
  ledgerController.checkCreditLimit
);

// ============================================================================
// AGING ANALYSIS ROUTES
// ============================================================================

/**
 * @route   GET /api/desktop/ledger/aging/:shopId
 * @desc    Get aging analysis for a shop
 * @access  Admin, Manager
 */
router.get('/aging/:shopId', 
  authorize(...LEDGER_ANALYTICS_ROLES), 
  ledgerController.getShopAging
);

/**
 * @route   GET /api/desktop/ledger/aging
 * @desc    Get aging analysis for all shops
 * @access  Admin, Manager
 */
router.get('/aging', 
  authorize(...LEDGER_ANALYTICS_ROLES), 
  ledgerController.getAllAgingAnalysis
);

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

/**
 * @route   POST /api/desktop/ledger/payment
 * @desc    Record a payment (with auto-allocation to invoices)
 * @access  Admin, Manager
 * @body    shop_id, amount, payment_method, payment_date, reference_number, notes
 */
router.post('/payment', 
  authorize(...LEDGER_PAYMENT_ROLES), 
  ledgerController.recordPayment
);

/**
 * @route   GET /api/desktop/ledger/payments/shop/:shopId
 * @desc    Get shop's payment history
 * @access  Admin, Manager
 * @query   page, limit, start_date, end_date
 */
router.get('/payments/shop/:shopId', 
  authorize(...LEDGER_PAYMENT_ROLES), 
  ledgerController.getShopPayments
);

// ============================================================================
// LEDGER MANAGEMENT ROUTES (Admin Operations)
// ============================================================================

/**
 * @route   POST /api/desktop/ledger/shop/:shopId/recalculate
 * @desc    Recalculate all ledger balances for a shop (fixes inconsistencies)
 * @access  Admin, Manager
 */
router.post('/shop/:shopId/recalculate', 
  authorize(...LEDGER_ANALYTICS_ROLES), 
  ledgerController.recalculateBalances
);

/**
 * @route   DELETE /api/desktop/ledger/shop/:shopId/history
 * @desc    Clear transaction history for a shop (Admin only)
 * @access  Admin only
 * @body    retain_opening_balance (boolean) - if true, creates opening balance entry
 * @note    This only deletes ledger entries, NOT invoices or payments
 */
router.delete('/shop/:shopId/history', 
  authorize(...LEDGER_ANALYTICS_ROLES), 
  ledgerController.clearTransactionHistory
);

module.exports = router;

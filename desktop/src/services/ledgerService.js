/**
 * Ledger Service
 * Shop Ledger Management System
 * Frontend API service layer for shop ledger operations
 * Company: Ummahtechinnovations.com
 */

import api from './api';

const ledgerService = {
  // ============================================================================
  // SHOP LEDGER OPERATIONS
  // ============================================================================

  /**
   * Get shop ledger with transactions
   * @param {number} shopId - Shop ID
   * @param {Object} params - Query parameters (page, limit, start_date, end_date, transaction_type)
   * @returns {Promise}
   */
  async getShopLedger(shopId, params = {}) {
    try {
      const response = await api.get(`/desktop/ledger/shop/${shopId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching shop ledger:', error);
      throw error;
    }
  },

  /**
   * Generate account statement for a shop
   * @param {number} shopId - Shop ID
   * @param {Object} params - Query parameters (start_date, end_date)
   * @returns {Promise}
   */
  async getAccountStatement(shopId, params = {}) {
    try {
      const response = await api.get(`/desktop/ledger/statement/${shopId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error generating statement:', error);
      throw error;
    }
  },

  /**
   * Create manual adjustment entry (Admin only)
   * @param {Object} adjustmentData - Adjustment data
   * @returns {Promise}
   */
  async createAdjustment(adjustmentData) {
    try {
      const response = await api.post('/desktop/ledger/adjustment', adjustmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating adjustment:', error);
      throw error;
    }
  },

  // ============================================================================
  // BALANCE & CREDIT OPERATIONS
  // ============================================================================

  /**
   * Get shop balance summary
   * @param {number} shopId - Shop ID
   * @returns {Promise}
   */
  async getShopBalance(shopId) {
    try {
      const response = await api.get(`/desktop/ledger/balance/${shopId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shop balance:', error);
      throw error;
    }
  },

  /**
   * Get all shops balance summary
   * @param {Object} params - Query parameters (page, limit, sort_by, order)
   * @returns {Promise}
   */
  async getAllShopsBalance(params = {}) {
    try {
      const response = await api.get('/desktop/ledger/balance', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all shops balance:', error);
      throw error;
    }
  },

  /**
   * Check if shop can place order (credit limit check)
   * @param {number} shopId - Shop ID
   * @param {number} orderAmount - Order amount to check
   * @returns {Promise}
   */
  async checkCreditLimit(shopId, orderAmount) {
    try {
      const response = await api.post('/desktop/ledger/check-credit', {
        shop_id: shopId,
        order_amount: orderAmount
      });
      return response.data;
    } catch (error) {
      console.error('Error checking credit limit:', error);
      throw error;
    }
  },

  // ============================================================================
  // AGING ANALYSIS OPERATIONS
  // ============================================================================

  /**
   * Get aging analysis for a shop
   * @param {number} shopId - Shop ID
   * @returns {Promise}
   */
  async getShopAging(shopId) {
    try {
      const response = await api.get(`/desktop/ledger/aging/${shopId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching shop aging:', error);
      throw error;
    }
  },

  /**
   * Get aging analysis for all shops
   * @returns {Promise}
   */
  async getAllAgingAnalysis() {
    try {
      const response = await api.get('/desktop/ledger/aging');
      return response.data;
    } catch (error) {
      console.error('Error fetching aging analysis:', error);
      throw error;
    }
  },

  // ============================================================================
  // PAYMENT OPERATIONS
  // ============================================================================

  /**
   * Record a payment (with auto-allocation to invoices)
   * @param {Object} paymentData - Payment data
   * @returns {Promise}
   */
  async recordPayment(paymentData) {
    try {
      const response = await api.post('/desktop/ledger/payment', paymentData);
      return response.data;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  },

  /**
   * Get payment by ID with allocations
   * @param {number} id - Payment ID
   * @returns {Promise}
   */
  async getPayment(id) {
    try {
      const response = await api.get(`/desktop/ledger/payment/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  },

  /**
   * Get all payments with pagination
   * @param {Object} params - Query parameters (page, limit, shop_id, start_date, end_date, payment_method)
   * @returns {Promise}
   */
  async getAllPayments(params = {}) {
    try {
      const response = await api.get('/desktop/ledger/payments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  /**
   * Get shop's payment history
   * @param {number} shopId - Shop ID
   * @param {Object} params - Query parameters (page, limit, start_date, end_date)
   * @returns {Promise}
   */
  async getShopPayments(shopId, params = {}) {
    try {
      const response = await api.get(`/desktop/ledger/payments/shop/${shopId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching shop payments:', error);
      throw error;
    }
  },

  /**
   * Get payment summary for a shop
   * @param {number} shopId - Shop ID
   * @returns {Promise}
   */
  async getShopPaymentSummary(shopId) {
    try {
      const response = await api.get(`/desktop/ledger/payments/summary/${shopId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      throw error;
    }
  },

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @returns {string}
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  },

  /**
   * Format date
   * @param {string} date - Date string
   * @returns {string}
   */
  formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Format date and time
   * @param {string} date - Date string
   * @returns {string}
   */
  formatDateTime(date) {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Get transaction type label
   * @param {string} type - Transaction type
   * @returns {string}
   */
  getTransactionTypeLabel(type) {
    const labels = {
      'invoice': 'Invoice',
      'payment': 'Payment',
      'adjustment': 'Adjustment',
      'opening_balance': 'Opening Balance'
    };
    return labels[type] || type;
  },

  /**
   * Get payment method label
   * @param {string} method - Payment method
   * @returns {string}
   */
  getPaymentMethodLabel(method) {
    const labels = {
      'cash': 'Cash',
      'bank': 'Bank Transfer',
      'cheque': 'Cheque',
      'online': 'Online Payment'
    };
    return labels[method] || method;
  },

  /**
   * Calculate days overdue
   * @param {string} dueDate - Due date
   * @returns {number}
   */
  getDaysOverdue(dueDate) {
    if (!dueDate) return 0;
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  },

  // ============================================================================
  // DASHBOARD OPERATIONS
  // ============================================================================

  /**
   * Get comprehensive financial dashboard data
   * @returns {Promise}
   */
  async getDashboard() {
    try {
      const response = await api.get('/desktop/ledger/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // ============================================================================
  // LEDGER MANAGEMENT OPERATIONS (Admin)
  // ============================================================================

  /**
   * Recalculate all ledger balances for a shop
   * Fixes any balance inconsistencies caused by failed entries
   * @param {number} shopId - Shop ID
   * @returns {Promise}
   */
  async recalculateBalances(shopId) {
    try {
      const response = await api.post(`/desktop/ledger/shop/${shopId}/recalculate`);
      return response.data;
    } catch (error) {
      console.error('Error recalculating balances:', error);
      throw error;
    }
  },

  /**
   * Clear transaction history for a shop (Admin only)
   * Only deletes ledger entries, NOT invoices or payments
   * @param {number} shopId - Shop ID
   * @param {boolean} retainOpeningBalance - If true, creates opening balance entry with current balance
   * @returns {Promise}
   */
  async clearTransactionHistory(shopId, retainOpeningBalance = false) {
    try {
      const response = await api.delete(`/desktop/ledger/shop/${shopId}/history`, {
        data: { retain_opening_balance: retainOpeningBalance }
      });
      return response.data;
    } catch (error) {
      console.error('Error clearing transaction history:', error);
      throw error;
    }
  }
};

export default ledgerService;

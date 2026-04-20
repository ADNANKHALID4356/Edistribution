/**
 * Invoice Service
 * Sprint 7: Invoice & Bill Management
 * Frontend API service layer for invoices
 */

import api from './api';

const invoiceService = {
  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice data with items
   * @returns {Promise}
   */
  async createInvoice(invoiceData) {
    try {
      const response = await api.post('/desktop/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  },

  /**
   * Get all invoices with pagination and filters
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  async getAllInvoices(params = {}) {
    try {
      const response = await api.get('/desktop/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  /**
   * Get invoice by ID with full details
   * @param {number} id - Invoice ID
   * @returns {Promise}
   */
  async getInvoiceById(id) {
    try {
      const response = await api.get(`/desktop/invoices/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  },

  /**
   * Update an invoice
   * @param {number} id - Invoice ID
   * @param {Object} updateData - Data to update
   * @returns {Promise}
   */
  async updateInvoice(id, updateData) {
    try {
      const response = await api.put(`/desktop/invoices/${id}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  /**
   * Delete (cancel) an invoice (with optional force flag for admin)
   * @param {number} id - Invoice ID
   * @param {boolean} force - Force delete (admin override)
   * @returns {Promise}
   */
  async deleteInvoice(id, force = false) {
    try {
      const url = force 
        ? `/desktop/invoices/${id}?force=true`
        : `/desktop/invoices/${id}`;
      
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },

  /**
   * Bulk delete cancelled invoices
   * @param {Array} invoiceIds - Array of invoice IDs to delete
   * @returns {Promise}
   */
  async bulkDeleteInvoices(invoiceIds) {
    try {
      const response = await api.delete('/desktop/invoices/bulk-delete', {
        data: { invoiceIds }
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting invoices:', error);
      throw error;
    }
  },

  /**
   * Record a payment for an invoice
   * @param {number} id - Invoice ID
   * @param {Object} paymentData - Payment details
   * @returns {Promise}
   */
  async recordPayment(id, paymentData) {
    try {
      const response = await api.put(`/desktop/invoices/${id}/payment`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  },

  /**
   * Get invoices by shop
   * @param {number} shopId - Shop ID
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  async getInvoicesByShop(shopId, params = {}) {
    try {
      const response = await api.get(`/desktop/invoices/by-shop/${shopId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching shop invoices:', error);
      throw error;
    }
  },

  /**
   * Get unpaid invoices
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  async getUnpaidInvoices(params = {}) {
    try {
      const response = await api.get('/desktop/invoices/unpaid', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      throw error;
    }
  },

  /**
   * Get invoice statistics
   * @returns {Promise}
   */
  async getStatistics() {
    try {
      const response = await api.get('/desktop/invoices/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice statistics:', error);
      throw error;
    }
  },

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency string
   */
  formatCurrency(amount) {
    const currency = process.env.REACT_APP_DEFAULT_CURRENCY || 'PKR';
    return `${currency} ${parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  },

  /**
   * Calculate invoice totals from items
   * @param {Array} items - Invoice line items
   * @param {number} discountPercentage - Overall discount percentage
   * @param {number} taxPercentage - Tax percentage
   * @returns {Object} Calculated totals
   */
  calculateTotals(items, discountPercentage = 0, taxPercentage = 0) {
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const itemDiscount = itemTotal * ((item.discount_percentage || 0) / 100);
      return sum + (itemTotal - itemDiscount);
    }, 0);

    const discountAmount = subtotal * (discountPercentage / 100);
    const amountAfterDiscount = subtotal - discountAmount;
    const taxAmount = amountAfterDiscount * (taxPercentage / 100);
    const netAmount = amountAfterDiscount + taxAmount;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_percentage: parseFloat(discountPercentage),
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      tax_percentage: parseFloat(taxPercentage),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      net_amount: parseFloat(netAmount.toFixed(2))
    };
  },

  /**
   * Get payment status badge color
   * @param {string} status - Payment status
   * @returns {string} Tailwind CSS color class
   */
  getPaymentStatusColor(status) {
    const colors = {
      'paid': 'bg-green-100 text-green-800',
      'partial': 'bg-yellow-100 text-yellow-800',
      'unpaid': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get invoice status badge color
   * @param {string} status - Invoice status
   * @returns {string} Tailwind CSS color class
   */
  getStatusColor(status) {
    const colors = {
      'issued': 'bg-blue-100 text-blue-800',
      'draft': 'bg-gray-100 text-gray-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  /**
   * Get invoices available for delivery (without or partial challans)
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  async getInvoicesAvailableForDelivery(params = {}) {
    try {
      const response = await api.get('/desktop/invoices/available-for-delivery', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching available invoices:', error);
      throw error;
    }
  }
};

export default invoiceService;

/**
 * Dashboard Service
 * Sprint 4: Main Dashboard with Analytics
 * Company: Ummahtechinnovations.com
 */

import api from './api';

const dashboardService = {
  /**
   * Get overall dashboard statistics
   * Uses timestamp to prevent caching and ensure fresh data
   */
  async getDashboardStats(filters = {}) {
    try {
      console.log('📊 dashboardService: Making API call to /desktop/dashboard/stats', filters);
      const response = await api.get('/desktop/dashboard/stats', {
        params: { ...filters, _t: Date.now() } // Cache buster
      });
      console.log('📊 dashboardService: Raw response:', response);
      console.log('📊 dashboardService: Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('📊 dashboardService: Error:', error);
      console.error('📊 dashboardService: Error response:', error.response);
      // Return a default response instead of throwing to prevent UI from breaking
      return {
        success: false,
        data: {
          total_orders: 0,
          total_products: 0,
          total_shops: 0,
          total_salesmen: 0,
          total_warehouses: 0,
          pending_deliveries: 0,
          total_deliveries: 0,
          total_invoices: 0,
          low_stock_products: 0,
          out_of_stock_products: 0,
          total_stock_quantity: 0,
          total_inventory_value: 0,
          total_warehouse_stock: 0
        },
        error: error.message
      };
    }
  },

  /**
   * Get quick stats for dashboard cards
   */
  async getQuickStats() {
    try {
      const response = await api.get('/desktop/dashboard/quick-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get recent orders
   */
  async getRecentOrders(limit = 10) {
    try {
      const response = await api.get('/desktop/dashboard/recent-orders', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get low stock products
   */
  async getLowStockProducts(limit = 10) {
    try {
      const response = await api.get('/desktop/dashboard/low-stock', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get top performing salesmen
   */
  async getTopSalesmen(limit = 10, period = 'month') {
    try {
      const response = await api.get('/desktop/dashboard/top-salesmen', {
        params: { limit, period }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get top selling products
   */
  async getTopProducts(limit = 10, period = 'month') {
    try {
      const response = await api.get('/desktop/dashboard/top-products', {
        params: { limit, period }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get revenue summary
   */
  async getRevenueSummary(period = 'month') {
    try {
      const response = await api.get('/desktop/dashboard/revenue', {
        params: { period }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get targets progress for all salesmen
   */
  async getTargetsProgress() {
    try {
      const response = await api.get('/desktop/dashboard/targets-progress');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get sales trends
   */
  async getSalesTrends(period = 'week', limit = 30) {
    try {
      const response = await api.get('/desktop/dashboard/sales-trends', {
        params: { period, limit }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get city-wise statistics
   */
  async getCityStats() {
    try {
      const response = await api.get('/desktop/dashboard/city-stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default dashboardService;

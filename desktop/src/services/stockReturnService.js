import api from './api';

/**
 * Stock Return Service
 * Handles all stock return API calls
 */
const stockReturnService = {
  /**
   * Process a stock return for a delivery
   */
  processReturn: async (returnData) => {
    try {
      const response = await api.post('/desktop/stock-returns', returnData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all stock returns with optional filters
   */
  getAllReturns: async (params = {}) => {
    try {
      const response = await api.get('/desktop/stock-returns', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get a specific stock return by ID
   */
  getReturnById: async (id) => {
    try {
      const response = await api.get(`/desktop/stock-returns/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get returns for a specific delivery
   */
  getReturnsByDelivery: async (deliveryId) => {
    try {
      const response = await api.get(`/desktop/stock-returns/delivery/${deliveryId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get stock return statistics
   */
  getStatistics: async (params = {}) => {
    try {
      const response = await api.get('/desktop/stock-returns/statistics', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default stockReturnService;

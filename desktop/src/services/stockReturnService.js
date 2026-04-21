import api from './api';

function normalizeAxiosError(error) {
  const d = error.response?.data;
  if (d && typeof d === 'object' && typeof d.message === 'string') {
    const e = new Error(d.message);
    e.response = error.response;
    return e;
  }
  if (error instanceof Error) return error;
  return new Error(typeof error === 'string' ? error : 'Request failed');
}

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
      throw normalizeAxiosError(error);
    }
  },

  /**
   * Void (delete) a stock return — reverses stock, delivery, and shop ledger
   */
  voidReturn: async (id) => {
    try {
      const response = await api.delete(`/desktop/stock-returns/${id}`);
      return response.data;
    } catch (error) {
      throw normalizeAxiosError(error);
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
      throw normalizeAxiosError(error);
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
      throw normalizeAxiosError(error);
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
      throw normalizeAxiosError(error);
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
      throw normalizeAxiosError(error);
    }
  },
};

export default stockReturnService;

import api from './api';

/**
 * Daily Collection Service
 * Handles all daily received amounts API calls
 */
const dailyCollectionService = {
  /**
   * Create a new daily collection entry
   */
  createCollection: async (collectionData) => {
    try {
      const response = await api.post('/desktop/daily-collections', collectionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all collections with filters
   */
  getAllCollections: async (params = {}) => {
    try {
      const response = await api.get('/desktop/daily-collections', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get collection by ID
   */
  getCollectionById: async (id) => {
    try {
      const response = await api.get(`/desktop/daily-collections/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get daily summary (grouped by date)
   */
  getDailySummary: async (params = {}) => {
    try {
      const response = await api.get('/desktop/daily-collections/summary', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get today's summary
   */
  getTodaySummary: async () => {
    try {
      const response = await api.get('/desktop/daily-collections/today');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Update a collection entry
   */
  updateCollection: async (id, collectionData) => {
    try {
      const response = await api.put(`/desktop/daily-collections/${id}`, collectionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a collection entry
   */
  deleteCollection: async (id) => {
    try {
      const response = await api.delete(`/desktop/daily-collections/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default dailyCollectionService;

// Load Sheet Service
// Purpose: API calls for load sheet management

import api from './api';

const loadSheetService = {
  /**
   * Create a new load sheet
   */
  createLoadSheet: async (loadSheetData, deliveryIds = []) => {
    try {
      const response = await api.post('/desktop/load-sheets', {
        loadSheet: loadSheetData,
        deliveryIds
      });
      return response; // return full axios response for consistency with callers
    } catch (error) {
      console.error('Error creating load sheet:', error);
      throw error;
    }
  },

  /**
   * Get load sheets for a specific warehouse
   */
  getLoadSheetsByWarehouse: async (warehouseId) => {
    try {
      const response = await api.get(`/desktop/load-sheets?warehouse_id=${warehouseId}`);
      return response; // return full axios response so caller can read `.data`
    } catch (error) {
      console.error('Error fetching load sheets:', error);
      throw error;
    }
  },

  /**
   * Get a single load sheet by ID
   */
  getLoadSheetById: async (id) => {
    try {
      const response = await api.get(`/desktop/load-sheets/${id}`);
      return response;
    } catch (error) {
      console.error('Error fetching load sheet:', error);
      throw error;
    }
  },

  /**
   * Update a load sheet (draft only)
   */
  updateLoadSheet: async (id, loadSheetData, deliveryIds = []) => {
    try {
      const response = await api.put(`/desktop/load-sheets/${id}`, {
        loadSheet: loadSheetData,
        deliveryIds
      });
      return response;
    } catch (error) {
      console.error('Error updating load sheet:', error);
      throw error;
    }
  },

  /**
   * Delete a load sheet (draft only)
   */
  deleteLoadSheet: async (id) => {
    try {
      const response = await api.delete(`/desktop/load-sheets/${id}`);
      return response;
    } catch (error) {
      console.error('Error deleting load sheet:', error);
      throw error;
    }
  },

  /**
   * Update load sheet status
   */
  updateLoadSheetStatus: async (id, status) => {
    try {
      const response = await api.put(`/desktop/load-sheets/${id}/status`, { status });
      return response;
    } catch (error) {
      console.error('Error updating load sheet status:', error);
      throw error;
    }
  }
};

export default loadSheetService;
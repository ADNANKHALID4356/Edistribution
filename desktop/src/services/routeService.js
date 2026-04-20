import api from './api';

const routeService = {
  // Get all routes with pagination and filters
  getAllRoutes: async (params = {}) => {
    try {
      const response = await api.get('/desktop/routes', {
        params
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get active routes (for dropdowns)
  getActiveRoutes: async () => {
    try {
      const response = await api.get('/shared/routes/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get route by ID
  getRouteById: async (id) => {
    try {
      const response = await api.get(`/desktop/routes/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new route
  createRoute: async (routeData) => {
    try {
      const response = await api.post('/desktop/routes', routeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update route
  updateRoute: async (id, routeData) => {
    try {
      const response = await api.put(`/desktop/routes/${id}`, routeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete route
  deleteRoute: async (id) => {
    try {
      const response = await api.delete(`/desktop/routes/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get route statistics
  getRouteStats: async (id) => {
    try {
      const response = await api.get(`/desktop/routes/${id}/stats`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get route-wise consolidated bill
  getConsolidatedBill: async (routeId, params = {}) => {
    try {
      const response = await api.get(`/desktop/routes/${routeId}/consolidated-bill`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default routeService;

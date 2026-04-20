import api from './api';

const shopService = {
  // Get all shops with pagination and filters
  getAllShops: async (params = {}) => {
    try {
      const response = await api.get('/desktop/shops', {
        params
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get shops by route
  getShopsByRoute: async (routeId) => {
    try {
      const response = await api.get(`/desktop/shops/by-route/${routeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get shop by ID
  getShopById: async (id) => {
    try {
      const response = await api.get(`/desktop/shops/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new shop
  createShop: async (shopData) => {
    try {
      const response = await api.post('/desktop/shops', shopData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update shop
  updateShop: async (id, shopData) => {
    try {
      const response = await api.put(`/desktop/shops/${id}`, shopData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete shop (with optional force flag for admin)
  deleteShop: async (id, force = false) => {
    try {
      const url = force 
        ? `/desktop/shops/${id}?force=true`
        : `/desktop/shops/${id}`;
      
      const response = await api.delete(url);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Validate credit limit for order
  validateCreditLimit: async (id, orderAmount) => {
    try {
      const response = await api.post(
        `/desktop/shops/${id}/validate-credit`,
        { order_amount: orderAmount }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default shopService;

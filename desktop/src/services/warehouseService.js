// Warehouse Service
// Purpose: API calls for warehouse management

import api from './api';

const warehouseService = {
  /**
   * Get all warehouses
   */
  getAllWarehouses: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/desktop/warehouses?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      throw error;
    }
  },

  /**
   * Get warehouse by ID
   */
  getWarehouseById: async (id) => {
    try {
      const response = await api.get(`/desktop/warehouses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      throw error;
    }
  },

  /**
   * Get warehouse dependencies (deliveries, stock)
   */
  getWarehouseDependencies: async (id) => {
    try {
      const response = await api.get(`/desktop/warehouses/${id}/dependencies`);
      return response.data;
    } catch (error) {
      console.error('Error fetching warehouse dependencies:', error);
      throw error;
    }
  },

  /**
   * Create new warehouse
   */
  createWarehouse: async (warehouseData) => {
    try {
      console.log('📤 Sending POST request to /desktop/warehouses');
      console.log('📦 Request data:', warehouseData);
      const response = await api.post(`/desktop/warehouses`, warehouseData);
      console.log('📥 Response received:', response);
      console.log('📥 Response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating warehouse:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      throw error;
    }
  },

  /**
   * Update warehouse
   */
  updateWarehouse: async (id, warehouseData) => {
    try {
      const response = await api.put(`/desktop/warehouses/${id}`, warehouseData);
      return response.data;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  },

  /**
   * Delete warehouse
   * @param {number} id - Warehouse ID
   * @param {boolean} force - Force delete even with stock
   */
  deleteWarehouse: async (id, force = false) => {
    try {
      const params = force ? '?force=true' : '';
      const response = await api.delete(`/desktop/warehouses/${id}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting warehouse:', error);
      throw error;
    }
  },

  /**
   * Get warehouse stock
   */
  getWarehouseStock: async (id, filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/desktop/warehouses/${id}/stock?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching warehouse stock:', error);
      throw error;
    }
  },

  /**
   * Update stock level
   */
  updateStockLevel: async (warehouseId, productId, quantity) => {
    try {
      const response = await api.put(
        `/desktop/warehouses/${warehouseId}/stock/${productId}`,
        { quantity }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating stock level:', error);
      throw error;
    }
  },

  /**
   * Get stock movements
   */
  getStockMovements: async (id, filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/desktop/warehouses/${id}/movements?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      throw error;
    }
  },

  /**
   * Record stock movement
   */
  recordStockMovement: async (warehouseId, movementData) => {
    try {
      const response = await api.post(
        `/desktop/warehouses/${warehouseId}/movements`,
        movementData
      );
      return response.data;
    } catch (error) {
      console.error('Error recording stock movement:', error);
      throw error;
    }
  },

  /**
   * Get available products (not yet in warehouse)
   */
  getAvailableProducts: async (warehouseId, filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(
        `/desktop/warehouses/${warehouseId}/available-products?${params}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching available products:', error);
      throw error;
    }
  },

  /**
   * Add product to warehouse
   */
  addProductToWarehouse: async (warehouseId, productData) => {
    try {
      const response = await api.post(
        `/desktop/warehouses/${warehouseId}/products`,
        productData
      );
      return response.data;
    } catch (error) {
      console.error('Error adding product to warehouse:', error);
      throw error;
    }
  },

  /**
   * Add multiple products to warehouse
   */
  addProductsBulk: async (warehouseId, products) => {
    try {
      const response = await api.post(
        `/desktop/warehouses/${warehouseId}/products/bulk`,
        { products }
      );
      return response.data;
    } catch (error) {
      console.error('Error adding products in bulk:', error);
      throw error;
    }
  },

  /**
   * Remove product from warehouse
   */
  removeProductFromWarehouse: async (warehouseId, productId) => {
    try {
      const response = await api.delete(
        `/desktop/warehouses/${warehouseId}/products/${productId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error removing product from warehouse:', error);
      throw error;
    }
  }
};

export default warehouseService;

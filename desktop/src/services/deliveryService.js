// Delivery Service
// Purpose: API calls for delivery challan management

import api from './api';

const deliveryService = {
  /**
   * 🆕 Get approved/finalized orders available for delivery creation (NEW FLOW)
   */
  getAvailableOrdersForDelivery: async () => {
    try {
      const response = await api.get('/desktop/deliveries/available-orders');
      return response.data;
    } catch (error) {
      console.error('Error fetching available orders:', error);
      throw error;
    }
  },

  /**
   * 🆕 Create delivery challan directly from an order (NEW FLOW - NO INVOICE)
   */
  createDeliveryFromOrder: async (orderId, deliveryData) => {
    try {
      const response = await api.post('/desktop/deliveries/from-order', {
        orderId: orderId,
        delivery: deliveryData
      });
      return response.data;
    } catch (error) {
      console.error('Error creating delivery from order:', error);
      throw error;
    }
  },

  /**
   * Get all deliveries
   */
  getAllDeliveries: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/desktop/deliveries?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      throw error;
    }
  },

  /**
   * Get all deliveries with items (for load sheet generation)
   */
  getAllDeliveriesWithItems: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/desktop/deliveries/with-items?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching deliveries with items:', error);
      throw error;
    }
  },

  /**
   * Get delivery by ID
   */
  getDeliveryById: async (id) => {
    try {
      const response = await api.get(`/desktop/deliveries/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery:', error);
      throw error;
    }
  },

  /**
   * Create new delivery
   */
  createDelivery: async (delivery, items) => {
    try {
      const response = await api.post(`/desktop/deliveries`, {
        delivery,
        items
      });
      return response.data;
    } catch (error) {
      console.error('Error creating delivery:', error);
      throw error;
    }
  },

  /**
   * Update delivery status
   */
  updateDeliveryStatus: async (id, status, updateData = {}) => {
    try {
      const response = await api.put(`/desktop/deliveries/${id}/status`, {
        status,
        ...updateData
      });
      return response.data;
    } catch (error) {
      console.error('Error updating delivery status:', error);
      throw error;
    }
  },

  /**
   * Get delivery statistics
   */
  getDeliveryStatistics: async (filters = {}) => {
    try {
      const params = new URLSearchParams(filters);
      const response = await api.get(`/desktop/deliveries/statistics?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching delivery statistics:', error);
      throw error;
    }
  },

  /**
   * Delete delivery
   */
  deleteDelivery: async (id) => {
    try {
      const response = await api.delete(`/desktop/deliveries/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting delivery:', error);
      throw error;
    }
  },

  /**
   * Get deliveries by invoice
   */
  getDeliveriesByInvoice: async (invoiceId) => {
    try {
      const response = await api.get(`/desktop/deliveries/by-invoice/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching deliveries by invoice:', error);
      throw error;
    }
  },

  /**
   * Get deliveries by order
   */
  getDeliveriesByOrder: async (orderId) => {
    try {
      const response = await api.get(`/desktop/deliveries/by-order/${orderId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching deliveries by order:', error);
      throw error;
    }
  },

  /**
   * Bulk delete deliveries with admin override
   * @param {Array} deliveryIds - Array of delivery IDs
   * @param {Boolean} force - Admin override to delete any status
   */
  bulkDeleteDeliveries: async (deliveryIds, force = false) => {
    try {
      const response = await api.post(`/desktop/deliveries/bulk-delete`, {
        delivery_ids: deliveryIds,
        force: force
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting deliveries:', error);
      throw error;
    }
  }
};

export default deliveryService;

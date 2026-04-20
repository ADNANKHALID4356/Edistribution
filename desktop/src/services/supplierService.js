import api from './api';

/**
 * Supplier Service
 * Handles all supplier-related API calls for desktop application
 */

const supplierService = {
  /**
   * Get all suppliers with pagination and search
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.search - Search term (searches name, code, contact person)
   * @returns {Promise} Response with suppliers array and pagination metadata
   */
  getSuppliers: async (params = {}) => {
    try {
      const response = await api.get('/desktop/suppliers', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get single supplier by ID
   * @param {number} id - Supplier ID
   * @returns {Promise} Response with supplier details
   */
  getSupplierById: async (id) => {
    try {
      const response = await api.get(`/desktop/suppliers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Create new supplier
   * @param {Object} supplierData - Supplier data
   * @param {string} supplierData.supplier_name - Supplier name (required)
   * @param {string} supplierData.contact_person - Contact person name
   * @param {string} supplierData.phone - Phone number
   * @param {string} supplierData.email - Email address
   * @param {string} supplierData.address - Address
   * @param {string} supplierData.city - City
   * @param {number} supplierData.opening_balance - Opening balance
   * @param {boolean} supplierData.is_active - Active status
   * @returns {Promise} Response with created supplier
   */
  createSupplier: async (supplierData) => {
    try {
      const response = await api.post('/desktop/suppliers', supplierData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Update existing supplier
   * @param {number} id - Supplier ID
   * @param {Object} supplierData - Updated supplier data
   * @returns {Promise} Response with updated supplier
   */
  updateSupplier: async (id, supplierData) => {
    try {
      const response = await api.put(`/desktop/suppliers/${id}`, supplierData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Delete supplier
   * Note: Will fail if supplier has linked products
   * @param {number} id - Supplier ID
   * @returns {Promise} Response confirming deletion
   */
  deleteSupplier: async (id) => {
    try {
      const response = await api.delete(`/desktop/suppliers/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all active suppliers (for dropdowns in forms)
   * @returns {Promise} Response with active suppliers array
   */
  getActiveSuppliers: async () => {
    try {
      const response = await api.get('/shared/suppliers/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default supplierService;

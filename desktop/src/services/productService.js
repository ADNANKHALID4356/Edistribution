import api from './api';

/**
 * Product Service
 * Handles all product-related API calls for desktop application
 */

const productService = {
  /**
   * Get all products with pagination, search, and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 20)
   * @param {string} params.search - Search term (searches name, code, barcode)
   * @param {string} params.category - Filter by category
   * @param {string} params.brand - Filter by brand
   * @param {number} params.supplier_id - Filter by supplier ID
   * @param {boolean} params.is_active - Filter by active status
   * @returns {Promise} Response with products array and pagination metadata
   */
  getProducts: async (params = {}) => {
    try {
      const response = await api.get('/desktop/products', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get single product by ID
   * @param {number} id - Product ID
   * @returns {Promise} Response with product details
   */
  getProductById: async (id) => {
    try {
      const response = await api.get(`/desktop/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Create new product
   * @param {Object} productData - Product data
   * @param {string} productData.product_name - Product name (required)
   * @param {string} productData.category - Category
   * @param {string} productData.brand - Brand
   * @param {string} productData.pack_size - Pack size
   * @param {number} productData.unit_price - Unit price (required)
   * @param {number} productData.carton_price - Carton price
   * @param {number} productData.pieces_per_carton - Pieces per carton
   * @param {number} productData.purchase_price - Purchase price
   * @param {number} productData.stock_quantity - Stock quantity
   * @param {number} productData.reorder_level - Reorder level
   * @param {number} productData.supplier_id - Supplier ID
   * @param {string} productData.barcode - Barcode
   * @param {string} productData.description - Description
   * @param {boolean} productData.is_active - Active status
   * @returns {Promise} Response with created product
   */
  createProduct: async (productData) => {
    try {
      const response = await api.post('/desktop/products', productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Update existing product
   * @param {number} id - Product ID
   * @param {Object} productData - Updated product data
   * @returns {Promise} Response with updated product
   */
  updateProduct: async (id, productData) => {
    try {
      const response = await api.put(`/desktop/products/${id}`, productData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  addStock: async (id, quantity) => {
    try {
      const response = await api.put(`/desktop/products/${id}/add-stock`, { add_quantity: quantity });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Delete product (soft delete - sets is_active = false)
   * @param {number} id - Product ID
   * @returns {Promise} Response confirming deletion
   */
  deleteProduct: async (id) => {
    try {
      const response = await api.delete(`/desktop/products/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get products with low stock (at or below reorder level)
   * @returns {Promise} Response with low stock products array
   */
  getLowStockProducts: async () => {
    try {
      const response = await api.get('/desktop/products/low-stock');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all distinct product categories
   * @returns {Promise} Response with categories array
   */
  getCategories: async () => {
    try {
      const response = await api.get('/desktop/products/categories');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all distinct product brands
   * @returns {Promise} Response with brands array
   */
  getBrands: async () => {
    try {
      const response = await api.get('/desktop/products/brands');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get all distinct company names
   * @returns {Promise} Response with companies array
   */
  getCompanies: async () => {
    try {
      const response = await api.get('/desktop/products/companies');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Bulk import products from array
    * Bulk import products array (CSV/Excel converted)
   * The backend will automatically UPSERT by increasing stock if product_name exists.
   * @param {Array} productsArray - Array of product objects
   * @returns {Promise} Response with success/updated/error report for each product
   */
  bulkImportProducts: async (productsArray) => {
    try {
      const response = await api.post('/desktop/products/bulk', { products: productsArray });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Upload a file (CSV/Excel/PDF) for parsing on the server
   * Used to generate the preview table for column mapping before import
   * @param {File} file - The file object from file input
   * @returns {Promise} Response with headers and parsed rows array
   */
  uploadAndParseFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/desktop/products/upload-parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  
  /**
   * Get all active products (for dropdowns and mobile sync)
   * @returns {Promise} Response with active products array
   */
  getActiveProducts: async () => {
    try {
      const response = await api.get('/shared/products/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get warehouse stock breakdown for a product
   * Shows stock levels in each warehouse
   * @param {number} productId - Product ID
   * @returns {Promise} Response with warehouse stock breakdown
   */
  getProductWarehouseStock: async (productId) => {
    try {
      const response = await api.get(`/desktop/products/${productId}/warehouse-stock`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default productService;

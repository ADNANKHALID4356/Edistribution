/**
 * Product Service - API and SQLite Integration
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Handle product operations with offline support
 * Used by: React Native Mobile Application
 */

import api from './api';
import dbHelper from '../database/dbHelper';
import NetInfo from '@react-native-community/netinfo';

class ProductService {
  /**
   * Check if device is online
   */
  async isOnline() {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected;
    } catch (error) {
      console.error('Error checking network status:', error);
      return false; // Assume offline on error
    }
  }

  /**
   * Get all products (offline-first approach)
   * Try SQLite first, fallback to API if needed
   */
  async getAllProducts() {
    try {
      // Always try to get from SQLite first (offline-first)
      const products = await dbHelper.getAllProducts();
      
      if (products && products.length > 0) {
        console.log(`📦 Retrieved ${products.length} products from local database`);
        return {
          success: true,
          data: products,
          source: 'local',
        };
      }

      // If no local data, try API (if online)
      const online = await this.isOnline();
      if (online) {
        console.log('🌐 No local products, fetching from API...');
        const response = await api.get('/shared/products/active');
        
        if (response.data.success) {
          // Save to local database
          await dbHelper.upsertProducts(response.data.data || []);
          return {
            success: true,
            data: response.data.data || [],
            source: 'api',
          };
        }
      }

      // No local data and offline or API failed
      return {
        success: false,
        data: [],
        message: 'No products available. Please sync when online.',
        source: 'none',
      };
    } catch (error) {
      console.error('Error getting products:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Force sync products from server (refresh from API)
   * This will update local database with latest data from backend
   */
  async syncProductsFromServer() {
    try {
      console.log('🔄 Starting product sync from server...');
      
      // Check if online
      const online = await this.isOnline();
      if (!online) {
        return {
          success: false,
          message: 'Cannot sync - No internet connection',
        };
      }

      // Fetch from API
      const response = await api.get('/shared/products/active');
      
      if (response.data.success) {
        const apiProducts = response.data.data || [];
        console.log(`📥 Received ${apiProducts.length} products from server`);
        
        // Clear existing products and save new ones
        await dbHelper.clearProducts();
        await dbHelper.upsertProducts(apiProducts);
        
        console.log('✅ Product sync completed successfully');
        return {
          success: true,
          data: apiProducts,
          message: `Successfully synced ${apiProducts.length} products from server`,
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to sync products',
        };
      }
    } catch (error) {
      console.error('❌ Error syncing products:', error);
      return {
        success: false,
        message: error.message || 'Failed to sync products from server',
        error: error,
      };
    }
  }

  /**
   * Search products by name, code, or barcode
   */
  async searchProducts(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim() === '') {
        return await this.getAllProducts();
      }

      const products = await dbHelper.searchProducts(searchTerm.trim());
      
      return {
        success: true,
        data: products,
        source: 'local',
      };
    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id) {
    try {
      // Try local database first
      const product = await dbHelper.getProductById(id);
      
      if (product) {
        return {
          success: true,
          data: product,
          source: 'local',
        };
      }

      // If not found locally and online, try API
      const online = await this.isOnline();
      if (online) {
        const response = await api.get(`/shared/products/${id}`);
        
        if (response.data.success) {
          // Save to local database
          await dbHelper.upsertProducts([response.data.data]);
          return {
            success: true,
            data: response.data.data,
            source: 'api',
          };
        }
      }

      return {
        success: false,
        message: 'Product not found',
      };
    } catch (error) {
      console.error('Error getting product by ID:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get product by barcode (for scanning)
   */
  async getProductByBarcode(barcode) {
    try {
      const product = await dbHelper.getProductByBarcode(barcode);
      
      if (product) {
        return {
          success: true,
          data: product,
          source: 'local',
        };
      }

      return {
        success: false,
        message: 'Product not found with this barcode',
      };
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category) {
    try {
      const products = await dbHelper.getProductsByCategory(category);
      
      return {
        success: true,
        data: products,
        source: 'local',
      };
    } catch (error) {
      console.error('Error getting products by category:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Get products by brand
   */
  async getProductsByBrand(brand) {
    try {
      const products = await dbHelper.getProductsByBrand(brand);
      
      return {
        success: true,
        data: products,
        source: 'local',
      };
    } catch (error) {
      console.error('Error getting products by brand:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Get all categories
   */
  async getCategories() {
    try {
      const categories = await dbHelper.getCategories();
      
      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      console.error('Error getting categories:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Get all brands
   */
  async getBrands() {
    try {
      const brands = await dbHelper.getBrands();
      
      return {
        success: true,
        data: brands,
      };
    } catch (error) {
      console.error('Error getting brands:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Get products count
   */
  async getProductsCount() {
    try {
      const count = await dbHelper.getProductsCount();
      return count;
    } catch (error) {
      console.error('Error getting products count:', error);
      return 0;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts() {
    try {
      const products = await dbHelper.getLowStockProducts();
      
      return {
        success: true,
        data: products,
        source: 'local',
      };
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return {
        success: false,
        data: [],
        error: error.message,
      };
    }
  }

  /**
   * Format product for display
   */
  formatProduct(product) {
    return {
      ...product,
      formattedPrice: `Rs. ${parseFloat(product.unit_price || 0).toFixed(2)}`,
      formattedCartonPrice: `Rs. ${parseFloat(product.carton_price || 0).toFixed(2)}`,
      stockStatus: this.getStockStatus(product.stock_quantity, product.reorder_level),
    };
  }

  /**
   * Get stock status
   */
  getStockStatus(stockQuantity, reorderLevel) {
    if (stockQuantity === 0) return 'OUT_OF_STOCK';
    if (stockQuantity <= reorderLevel) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  /**
   * Get stock status color
   */
  getStockStatusColor(status) {
    switch (status) {
      case 'OUT_OF_STOCK':
        return '#ef4444'; // red
      case 'LOW_STOCK':
        return '#f59e0b'; // yellow
      case 'IN_STOCK':
        return '#10b981'; // green
      default:
        return '#6b7280'; // gray
    }
  }

  /**
   * Get stock status label
   */
  getStockStatusLabel(status) {
    switch (status) {
      case 'OUT_OF_STOCK':
        return 'Out of Stock';
      case 'LOW_STOCK':
        return 'Low Stock';
      case 'IN_STOCK':
        return 'In Stock';
      default:
        return 'Unknown';
    }
  }
}

// Export singleton instance
const productService = new ProductService();
export default productService;

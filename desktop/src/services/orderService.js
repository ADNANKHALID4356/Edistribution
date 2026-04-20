/**
 * Order Service
 * Sprint 5: Order Management System
 * API Integration Layer for Desktop
 */

import api from './api';

const orderService = {
  /**
   * Get all orders with filters and pagination
   */
  async getAllOrders(params = {}) {
    try {
      console.log('\n🔍 [DESKTOP SERVICE] ========== Fetching orders ==========');
      console.log('🔍 [DESKTOP SERVICE] Request params:', params);
      
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.salesman_id) queryParams.append('salesman_id', params.salesman_id);
      if (params.shop_id) queryParams.append('shop_id', params.shop_id);
      if (params.route_id) queryParams.append('route_id', params.route_id);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);
      if (params.sortBy) queryParams.append('sortBy', params.sortBy);
      if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

      console.log('🔍 [DESKTOP SERVICE] Query string:', queryParams.toString());
      console.log('🔍 [DESKTOP SERVICE] Full URL:', `/desktop/orders?${queryParams.toString()}`);
      console.log('🔍 [DESKTOP SERVICE] Token exists:', !!localStorage.getItem('token'));
      console.log('🔍 [DESKTOP SERVICE] Sending GET request...');

      const response = await api.get(`/desktop/orders?${queryParams.toString()}`);
      
      console.log('✅ [DESKTOP SERVICE] Response status:', response.status);
      console.log('✅ [DESKTOP SERVICE] Response data:', JSON.stringify(response.data, null, 2));
      console.log('✅ [DESKTOP SERVICE] Orders count:', response.data?.data?.length || 0);
      console.log('🔍 [DESKTOP SERVICE] ========== Fetch complete ==========\n');
      
      return response.data;
    } catch (error) {
      console.error('❌ [DESKTOP SERVICE] ========== ERROR FETCHING ORDERS ==========');
      console.error('❌ Error object:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error headers:', error.response?.headers);
      console.error('❌ Request config:', error.config?.url);
      console.error('❌ Network error?:', error.code === 'ERR_NETWORK' || !error.response);
      
      // Check specific error types
      if (!error.response) {
        console.error('❌ NETWORK ERROR: Backend might not be running!');
        console.error('❌ Check server connection in Settings');
      } else if (error.response.status === 401) {
        console.error('❌ AUTHENTICATION ERROR: Token invalid or expired');
        console.error('❌ User needs to login again');
      } else if (error.response.status === 403) {
        console.error('❌ AUTHORIZATION ERROR: User does not have permission');
      } else if (error.response.status === 500) {
        console.error('❌ SERVER ERROR: Backend crashed or database error');
      }
      
      console.error('❌ [DESKTOP SERVICE] ========== END ERROR ==========\n');
      throw error;
    }
  },

  /**
   * Get order by ID with details
   */
  async getOrderById(id) {
    try {
      const response = await api.get(`/desktop/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      throw error;
    }
  },

  /**
   * Get order history
   */
  async getOrderHistory(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.salesman_id) queryParams.append('salesman_id', params.salesman_id);
      if (params.shop_id) queryParams.append('shop_id', params.shop_id);
      if (params.route_id) queryParams.append('route_id', params.route_id);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const response = await api.get(`/desktop/orders/history?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching order history:', error);
      throw error;
    }
  },

  /**
   * Update order status
   */
  async updateOrderStatus(id, status, notes = '') {
    try {
      const response = await api.put(`/desktop/orders/${id}/status`, {
        status,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  },

  /**
   * Update order
   */
  async updateOrder(id, orderData) {
    try {
      const response = await api.put(`/desktop/orders/${id}`, orderData);
      return response.data;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  },

  /**
   * Delete order
   */
  async deleteOrder(id) {
    try {
      const response = await api.delete(`/desktop/orders/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  },

  /**
   * Get order statistics
   */
  async getStatistics(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.salesman_id) queryParams.append('salesman_id', params.salesman_id);
      if (params.start_date) queryParams.append('start_date', params.start_date);
      if (params.end_date) queryParams.append('end_date', params.end_date);

      const response = await api.get(`/desktop/orders/statistics?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  },

  /**
   * Export orders to Excel
   */
  async exportToExcel(orders) {
    try {
      // Prepare data for Excel export
      const data = orders.map(order => ({
        'Order Number': order.order_number,
        'Date': new Date(order.order_date).toLocaleDateString(),
        'Salesman': order.salesman_name,
        'Shop': order.shop_name,
        'Products': order.products_summary || 'N/A',
        'Items Count': order.items_count || 0,
        'Status': order.status,
        'Total Amount': order.total_amount,
        'Discount': order.discount,
        'Net Amount': order.net_amount
      }));

      // Create CSV content
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(',')).join('\n');
      const csvContent = `${headers}\n${rows}`;

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true, message: 'Orders exported successfully' };
    } catch (error) {
      console.error('Error exporting orders:', error);
      throw error;
    }
  },

  /**
   * Format currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  },

  /**
   * Get status color
   */
  getStatusColor(status) {
    const colors = {
      draft: 'gray',
      placed: 'blue',
      approved: 'green',
      finalized: 'purple',
      rejected: 'red',
      delivered: 'teal'
    };
    return colors[status] || 'gray';
  },

  /**
   * Get status label
   */
  getStatusLabel(status) {
    const labels = {
      draft: 'Draft',
      placed: 'Placed',
      approved: 'Approved',
      finalized: 'Finalized',
      rejected: 'Rejected',
      delivered: 'Delivered'
    };
    return labels[status] || status;
  },

  // ========================================
  // SPRINT 6: Order Processing & Approval Methods
  // ========================================

  /**
   * Get pending orders for processing
   */
  async getPendingOrders(params = {}) {
    try {
      console.log('📋 [SERVICE] Fetching pending orders...');
      
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.salesman_id) queryParams.append('salesman_id', params.salesman_id);
      if (params.route_id) queryParams.append('route_id', params.route_id);

      const response = await api.get(`/desktop/orders/pending?${queryParams.toString()}`);
      console.log('✅ [SERVICE] Pending orders fetched:', response.data.data?.length || 0);
      
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error fetching pending orders:', error);
      throw error;
    }
  },

  /**
   * Approve order
   */
  async approveOrder(orderId, notes = '') {
    try {
      console.log('✅ [SERVICE] Approving order:', orderId);
      
      const response = await api.put(`/desktop/orders/${orderId}/approve`, { notes });
      console.log('✅ [SERVICE] Order approved successfully');
      
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error approving order:', error);
      throw error;
    }
  },

  /**
   * Reject order with reason
   */
  async rejectOrder(orderId, reason) {
    try {
      console.log('❌ [SERVICE] Rejecting order:', orderId);
      console.log('📝 [SERVICE] Reason:', reason);
      
      const response = await api.put(`/desktop/orders/${orderId}/reject`, { reason });
      console.log('✅ [SERVICE] Order rejected successfully');
      
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error rejecting order:', error);
      throw error;
    }
  },

  /**
   * Finalize order and deduct stock
   */
  async finalizeOrder(orderId, notes = '') {
    try {
      console.log('🏁 [SERVICE] Finalizing order:', orderId);
      
      const response = await api.put(`/desktop/orders/${orderId}/finalize`, { notes });
      console.log('✅ [SERVICE] Order finalized successfully');
      
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error finalizing order:', error);
      throw error;
    }
  },

  /**
   * Check stock availability for order
   */
  async checkOrderStock(orderId) {
    try {
      console.log('📦 [SERVICE] Checking stock for order:', orderId);
      
      const response = await api.get(`/desktop/orders/${orderId}/stock-check`);
      console.log('✅ [SERVICE] Stock check complete');
      
      return response.data;
    } catch (error) {
      console.error('❌ [SERVICE] Error checking stock:', error);
      throw error;
    }
  }
};

export default orderService;

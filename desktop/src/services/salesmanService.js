/**
 * Salesman Service
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

import api from './api';

const salesmanService = {
  /**
   * Get all salesmen with filters and pagination
   */
  async getAllSalesmen(filters = {}) {
    try {
      const response = await api.get('/desktop/salesmen', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get single salesman by ID
   */
  async getSalesmanById(id) {
    try {
      const response = await api.get(`/desktop/salesmen/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Create new salesman
   */
  async createSalesman(salesmanData) {
    try {
      const response = await api.post('/desktop/salesmen', salesmanData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Update salesman details
   */
  async updateSalesman(id, updateData) {
    try {
      const response = await api.put(`/desktop/salesmen/${id}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Delete salesman (soft delete - marks as inactive)
   */
  async deleteSalesman(id) {
    try {
      const response = await api.delete(`/desktop/salesmen/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Permanently delete salesman from database
   */
  async permanentDeleteSalesman(id) {
    try {
      const response = await api.delete(`/desktop/salesmen/${id}/permanent`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Assign route to salesman
   */
  async assignRoute(salesmanId, routeId) {
    try {
      const response = await api.post(`/desktop/salesmen/${salesmanId}/assign-route`, {
        route_id: routeId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Unassign route from salesman
   */
  async unassignRoute(routeId) {
    try {
      const response = await api.post('/desktop/salesmen/unassign-route', {
        route_id: routeId
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get salesman's assigned routes
   */
  async getSalesmanRoutes(salesmanId) {
    try {
      const response = await api.get(`/desktop/salesmen/${salesmanId}/routes`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get salesman performance metrics
   */
  async getSalesmanPerformance(salesmanId) {
    try {
      const response = await api.get(`/desktop/salesmen/${salesmanId}/performance`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get active salesmen list (for dropdowns)
   */
  async getActiveSalesmen() {
    try {
      const response = await api.get('/desktop/salesmen/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get salesmen summary
   */
  async getSalesmenSummary() {
    try {
      const response = await api.get('/desktop/salesmen/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get salesman credentials (username and password)
   */
  async getCredentials(salesmanId) {
    try {
      const response = await api.get(`/desktop/salesmen/${salesmanId}/credentials`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Reset salesman password
   */
  async resetPassword(salesmanId, newPassword) {
    try {
      const response = await api.post(`/desktop/salesmen/${salesmanId}/reset-password`, {
        new_password: newPassword
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Create salary/ledger entry
   */
  async createLedgerEntry(entryData) {
    try {
      const response = await api.post('/desktop/salesman-ledger', entryData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get ledger entries for a salesman
   */
  async getSalesmanLedger(salesmanId, filters = {}) {
    try {
      const response = await api.get(`/desktop/salesman-ledger/salesman/${salesmanId}`, { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get salary summary for a salesman
   */
  async getSalarySummary(salesmanId, year, month) {
    try {
      const response = await api.get(`/desktop/salesman-ledger/salesman/${salesmanId}/summary`, {
        params: { year, month }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Delete a ledger entry
   */
  async deleteLedgerEntry(entryId) {
    try {
      const response = await api.delete(`/desktop/salesman-ledger/${entryId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default salesmanService;

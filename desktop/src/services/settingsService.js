// Settings Service
// Purpose: API calls for company settings
// Updated: 2025-11-29 - Fixed API endpoint URLs

import api from './api';

const settingsService = {
  /**
   * Get company settings
   */
  getCompanySettings: async () => {
    try {
      const response = await api.get('/settings/company');
      return response.data;
    } catch (error) {
      console.error('Error fetching company settings:', error);
      throw error;
    }
  },

  /**
   * Update company settings
   */
  updateCompanySettings: async (settingsData) => {
    try {
      const response = await api.put('/settings/company', settingsData);
      return response.data;
    } catch (error) {
      console.error('Error updating company settings:', error);
      throw error;
    }
  },

  /**
   * Get company info formatted for invoices
   */
  getInvoiceInfo: async () => {
    try {
      const response = await api.get('/settings/company/invoice-info');
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice info:', error);
      throw error;
    }
  }
};

export default settingsService;

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import dbHelper from '../database/dbHelper';

const authService = {
  /**
   * Login user (Salesman or Admin)
   * Sprint 4: Enhanced to fetch and store salesman details
   */
  login: async (credentials) => {
    console.log('\n🔐 [MOBILE LOGIN] ========== Login Attempt ==========');
    console.log('🔐 [MOBILE LOGIN] Username:', credentials.username);
    console.log('🔐 [MOBILE LOGIN] Password length:', credentials.password?.length);
    console.log('🔐 [MOBILE LOGIN] Sending POST to /auth/login...');
    
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('🔐 [MOBILE LOGIN] Response status:', response.status);
      console.log('🔐 [MOBILE LOGIN] Response data:', JSON.stringify(response.data, null, 2));
      
      if (response.data.success) {
        const { token, user } = response.data.data;
        
        // Store token and basic user info
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ Login successful:', user.username);
        console.log('👤 User role:', user.role, '(role_id:', user.role_id + ')');
        console.log('🆔 Salesman ID:', user.salesman_id || 'N/A');
        
        // If user is a salesman (role_id = 3), sync and fetch salesman details
        if (user.role_id === 3 && user.salesman_id) {
          try {
            console.log('🔄 Syncing salesman data from backend...');
            
            // Import syncService dynamically to avoid circular dependency
            const syncService = require('./syncService').default;
            
            // Sync salesmen data from backend first
            await syncService.syncSalesmen(true); // Force sync
            
            console.log('✅ Salesmen data synced from backend');
            
            // Now fetch salesman details from local database
            const salesmanDetails = await dbHelper.getSalesmanById(user.salesman_id);
            
            if (salesmanDetails) {
              // Store salesman details in AsyncStorage
              await AsyncStorage.setItem('salesman', JSON.stringify({
                id: salesmanDetails.id,
                salesman_code: salesmanDetails.salesman_code,
                full_name: salesmanDetails.full_name,
                phone: salesmanDetails.phone,
                route_id: salesmanDetails.route_id,
                route_name: salesmanDetails.route_name,
                monthly_target: salesmanDetails.monthly_target,
                achieved_sales: salesmanDetails.achieved_sales,
              }));
              
              console.log('✅ Salesman details loaded:', salesmanDetails.full_name);
              console.log('📍 Route:', salesmanDetails.route_name);
              console.log('🎯 Monthly Target: PKR', salesmanDetails.monthly_target);
            } else {
              console.warn('⚠️ Salesman details not found after sync. ID:', user.salesman_id);
              console.warn('⚠️ This salesman may not exist in the database.');
            }
          } catch (error) {
            console.error('❌ Error syncing/fetching salesman details:', error);
            console.error('Error details:', error.message);
          }
        }
      }
      
      console.log('🔐 [MOBILE LOGIN] ========== Login Complete ==========\n');
      return response.data;
    } catch (error) {
      console.error('❌ [MOBILE LOGIN] Login failed!');
      console.error('❌ [MOBILE LOGIN] Error:', error.message);
      console.error('❌ [MOBILE LOGIN] Response:', error.response?.data);
      console.error('❌ [MOBILE LOGIN] Status:', error.response?.status);
      console.log('🔐 [MOBILE LOGIN] ========== Login Failed ==========\n');
      throw error;
    }
  },

  /**
   * Logout user
   * NOTE: We do NOT clear orders on logout - they persist in SQLite
   * so each salesman can come back and sync their unsynced orders later
   */
  logout: async () => {
    try {
      // Call backend logout
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Only clear authentication tokens, NOT the SQLite data
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('salesman');
      
      console.log('✅ User logged out (orders preserved in SQLite)');
    }
  },

  /**
   * Get user profile from backend
   */
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('token');
    return !!token;
  },

  /**
   * Get current user from AsyncStorage
   */
  getCurrentUser: async () => {
    const userStr = await AsyncStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  /**
   * Get current salesman details from AsyncStorage
   * Sprint 4: Returns salesman info if logged in user is a salesman
   */
  getCurrentSalesman: async () => {
    const salesmanStr = await AsyncStorage.getItem('salesman');
    return salesmanStr ? JSON.parse(salesmanStr) : null;
  },

  /**
   * Update salesman details in AsyncStorage
   * Used after sync to refresh local salesman data
   */
  updateSalesmanDetails: async (salesmanId) => {
    try {
      const salesmanDetails = await dbHelper.getSalesmanById(salesmanId);
      
      if (salesmanDetails) {
        await AsyncStorage.setItem('salesman', JSON.stringify({
          id: salesmanDetails.id,
          salesman_code: salesmanDetails.salesman_code,
          full_name: salesmanDetails.full_name,
          phone: salesmanDetails.phone,
          route_id: salesmanDetails.route_id,
          route_name: salesmanDetails.route_name,
          monthly_target: salesmanDetails.monthly_target,
          achieved_sales: salesmanDetails.achieved_sales,
        }));
        
        return salesmanDetails;
      }
      
      return null;
    } catch (error) {
      console.error('Error updating salesman details:', error);
      throw error;
    }
  },
};

export default authService;

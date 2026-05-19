/**
 * Dashboard Service
 * Sprint 4: Salesman Dashboard Metrics
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Calculate and provide dashboard statistics for salesmen
 * Used by: DashboardScreen
 */

import dbHelper from '../database/dbHelper';
import authService from './authService';

const dashboardService = {
  /**
   * Get comprehensive dashboard statistics for current salesman
   * Returns all metrics needed for dashboard display
   */
  async getDashboardStats() {
    try {
      // Get current salesman details
      const salesman = await authService.getCurrentSalesman();
      
      if (!salesman) {
        throw new Error('Salesman details not available. Please sync data.');
      }

      // Get salesman statistics from database
      const salesmanStats = await dbHelper.getSalesmanStats(salesman.id);
      
      if (!salesmanStats) {
        throw new Error('Unable to load salesman statistics');
      }

      // Get product count
      const productCount = await dbHelper.getProductsCount();

      // Get shop count for salesman's route
      const shopCount = await dbHelper.getShopsCount(salesman.route_id);

      // TODO: Get orders count (when order table is implemented in future sprint)
      const placedOrders = 0; // Placeholder - will be implemented in Sprint 5
      const remainingOrders = 0; // Placeholder - will be calculated based on shops

      // Calculate target progress percentage
      const targetProgress = salesman.monthly_target > 0
        ? ((salesman.achieved_sales / salesman.monthly_target) * 100).toFixed(1)
        : 0;

      // Calculate remaining target
      const remainingTarget = Math.max(0, salesman.monthly_target - salesman.achieved_sales);

      return {
        // Salesman info
        salesman_name: salesman.full_name,
        salesman_code: salesman.salesman_code,
        
        // Route info
        route_id: salesman.route_id,
        route_name: salesman.route_name || 'Not Assigned',
        
        // Counts
        product_count: productCount,
        shop_count: shopCount,
        placed_orders: placedOrders,
        remaining_orders: remainingOrders,
        
        // Target tracking
        monthly_target: parseFloat(salesman.monthly_target) || 0,
        achieved_sales: parseFloat(salesman.achieved_sales) || 0,
        remaining_target: parseFloat(remainingTarget),
        target_progress: parseFloat(targetProgress),
        
        // Status
        is_target_achieved: salesman.achieved_sales >= salesman.monthly_target,
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  },

  /**
   * Get placed orders count
   * Placeholder for Sprint 5 when order management is implemented
   */
  async getPlacedOrders(salesmanId) {
    // TODO: Implement in Sprint 5
    // Query orders table WHERE salesman_id = ? AND status = 'placed'
    return 0;
  },

  /**
   * Get remaining orders to be placed
   * Placeholder for Sprint 5
   */
  async getRemainingOrders(salesmanId, routeId) {
    // TODO: Implement in Sprint 5
    // Get total shops in route - shops with orders placed today
    const shopCount = await dbHelper.getShopsCount(routeId);
    const placedOrders = await this.getPlacedOrders(salesmanId);
    
    return Math.max(0, shopCount - placedOrders);
  },

  /**
   * Get daily target progress
   * Returns current day's progress towards monthly target
   */
  async getDailyTargetProgress(salesmanId) {
    try {
      const salesman = await authService.getCurrentSalesman();
      
      if (!salesman) {
        return {
          daily_target: 0,
          achieved_today: 0,
          progress: 0,
        };
      }

      // Calculate daily target (monthly target / 30 days)
      const dailyTarget = (salesman.monthly_target / 30).toFixed(2);
      
      // TODO: Get today's sales from orders table (Sprint 5)
      const achievedToday = 0; // Placeholder

      const progress = dailyTarget > 0
        ? ((achievedToday / dailyTarget) * 100).toFixed(1)
        : 0;

      return {
        daily_target: parseFloat(dailyTarget),
        achieved_today: parseFloat(achievedToday),
        progress: parseFloat(progress),
      };
    } catch (error) {
      console.error('Error calculating daily target:', error);
      return {
        daily_target: 0,
        achieved_today: 0,
        progress: 0,
      };
    }
  },

  /**
   * Get quick stats for dashboard cards
   */
  async getQuickStats() {
    try {
      const stats = await dbHelper.getStats();
      const salesman = await authService.getCurrentSalesman();
      
      return {
        products: stats.products,
        shops: stats.shops,
        routes: stats.routes,
        suppliers: stats.suppliers,
        salesman_name: salesman?.full_name || 'Unknown',
        route_name: salesman?.route_name || 'Not Assigned',
      };
    } catch (error) {
      console.error('Error getting quick stats:', error);
      throw error;
    }
  },

  /**
   * Refresh dashboard data
   * Call after sync to update all dashboard metrics
   */
  async refreshDashboard() {
    try {
      const salesman = await authService.getCurrentSalesman();
      
      if (salesman) {
        // Update salesman details from database
        await authService.updateSalesmanDetails(salesman.id);
      }
      
      // Get fresh dashboard stats
      return await this.getDashboardStats();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      throw error;
    }
  },
};

export default dashboardService;

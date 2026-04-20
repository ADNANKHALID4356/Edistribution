/**
 * Dashboard Routes (Desktop)
 * Sprint 4: Main Dashboard with Analytics
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/dashboardController');
const { protect } = require('../../middleware/auth');

// Dashboard stats - NO AUTH for reliability (public stats)
router.get('/stats', dashboardController.getDashboardStats);

// All other routes require authentication
router.use(protect);

// Get quick stats for dashboard cards
router.get('/quick-stats', dashboardController.getQuickStats);

// Get recent orders
router.get('/recent-orders', dashboardController.getRecentOrders);

// Get low stock products
router.get('/low-stock', dashboardController.getLowStockProducts);

// Get top performing salesmen
router.get('/top-salesmen', dashboardController.getTopSalesmen);

// Get top selling products
router.get('/top-products', dashboardController.getTopProducts);

// Get revenue summary
router.get('/revenue', dashboardController.getRevenueSummary);

// Get targets progress for all salesmen
router.get('/targets-progress', dashboardController.getTargetsProgress);

// Get sales trends
router.get('/sales-trends', dashboardController.getSalesTrends);

// Get city-wise statistics
router.get('/city-stats', dashboardController.getCityStats);

module.exports = router;

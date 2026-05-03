/**
 * Desktop Order Routes
 * Sprint 5 & 6: Order Management System
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');
const { protect, authorize, ROLES } = require('../../middleware/auth');
const ORDER_MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];

// ========================================
// IMPORTANT: Specific routes MUST come before generic :id routes
// All routes protected with authentication middleware
// ========================================

// Get all orders with filters and pagination
router.get('/', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.getAllOrders);

// Get order history
router.get('/history', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.getOrderHistory);

// Get order statistics
router.get('/statistics', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.getOrderStatistics);

// ========================================
// SPRINT 6: Order Processing & Approval Routes
// ========================================

// Get pending orders for processing
router.get('/pending', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.getPendingOrders);

// Approve order (MUST be before /:id routes)
router.put('/:id/approve', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.approveOrder);

// Reject order (MUST be before /:id routes)
router.put('/:id/reject', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.rejectOrder);

// Finalize order - deducts stock (MUST be before /:id routes)
router.put('/:id/finalize', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.finalizeOrder);

// Check stock availability for an order (MUST be before /:id routes)
router.get('/:orderId/stock-check', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.checkOrderStock);

// Update order status (MUST be before generic /:id PUT route)
router.put('/:id/status', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.updateOrderStatus);

// ========================================
// SPRINT 5: Generic Order Operations (AFTER specific routes)
// ========================================

// Get order by ID
router.get('/:id', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.getOrderById);

// Update order (MUST be LAST among PUT routes)
router.put('/:id', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.updateOrder);

// Delete order
router.delete('/:id', protect, authorize(...ORDER_MANAGEMENT_ROLES), orderController.deleteOrder);

module.exports = router;

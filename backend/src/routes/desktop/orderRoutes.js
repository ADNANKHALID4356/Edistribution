/**
 * Desktop Order Routes
 * Sprint 5 & 6: Order Management System
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/orderController');
const { protect } = require('../../middleware/auth');

// ========================================
// IMPORTANT: Specific routes MUST come before generic :id routes
// All routes protected with authentication middleware
// ========================================

// Get all orders with filters and pagination
router.get('/', protect, orderController.getAllOrders);

// Get order history
router.get('/history', protect, orderController.getOrderHistory);

// Get order statistics
router.get('/statistics', protect, orderController.getOrderStatistics);

// ========================================
// SPRINT 6: Order Processing & Approval Routes
// ========================================

// Get pending orders for processing
router.get('/pending', protect, orderController.getPendingOrders);

// Approve order (MUST be before /:id routes)
router.put('/:id/approve', protect, orderController.approveOrder);

// Reject order (MUST be before /:id routes)
router.put('/:id/reject', protect, orderController.rejectOrder);

// Finalize order - deducts stock (MUST be before /:id routes)
router.put('/:id/finalize', protect, orderController.finalizeOrder);

// Check stock availability for an order (MUST be before /:id routes)
router.get('/:orderId/stock-check', protect, orderController.checkOrderStock);

// Update order status (MUST be before generic /:id PUT route)
router.put('/:id/status', protect, orderController.updateOrderStatus);

// ========================================
// SPRINT 5: Generic Order Operations (AFTER specific routes)
// ========================================

// Get order by ID
router.get('/:id', protect, orderController.getOrderById);

// Update order (MUST be LAST among PUT routes)
router.put('/:id', protect, orderController.updateOrder);

// Delete order
router.delete('/:id', protect, orderController.deleteOrder);

module.exports = router;

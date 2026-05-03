// Delivery Routes
// Purpose: API routes for delivery challan management

const express = require('express');
const router = express.Router();
const {
  getAllDeliveries,
  getAllDeliveriesWithItems,
  getDeliveryById,
  createDelivery,
  createDeliveryFromOrder,
  getAvailableOrdersForDelivery,
  updateDeliveryStatus,
  getDeliveryStatistics,
  deleteDelivery,
  getDeliveriesByInvoice,
  getDeliveriesByOrder,
  bulkDeleteDeliveries
} = require('../../controllers/deliveryController');
const { protect, authorize, ROLES } = require('../../middleware/auth');
const DELIVERY_MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];
const DELIVERY_READ_ROLES = [...DELIVERY_MANAGEMENT_ROLES, ROLES.STOCK_MANAGER];

// All delivery routes are protected

// 🆕 NEW ROUTES: Order-based delivery creation (NO INVOICE)
router.get('/available-orders', protect, authorize(...DELIVERY_READ_ROLES), getAvailableOrdersForDelivery);
router.post('/from-order', protect, authorize(...DELIVERY_MANAGEMENT_ROLES), createDeliveryFromOrder);

// Existing routes
router.get('/', protect, authorize(...DELIVERY_READ_ROLES), getAllDeliveries);
router.get('/with-items', protect, authorize(...DELIVERY_READ_ROLES), getAllDeliveriesWithItems);
router.get('/statistics', protect, authorize(...DELIVERY_READ_ROLES), getDeliveryStatistics);
router.get('/by-invoice/:invoiceId', protect, authorize(...DELIVERY_READ_ROLES), getDeliveriesByInvoice);
router.get('/by-order/:orderId', protect, authorize(...DELIVERY_READ_ROLES), getDeliveriesByOrder);
router.get('/:id', protect, authorize(...DELIVERY_READ_ROLES), getDeliveryById);
router.post('/', protect, authorize(...DELIVERY_MANAGEMENT_ROLES), createDelivery);
router.post('/bulk-delete', protect, authorize(...DELIVERY_MANAGEMENT_ROLES), bulkDeleteDeliveries);
router.put('/:id/status', protect, authorize(...DELIVERY_MANAGEMENT_ROLES), updateDeliveryStatus);
router.delete('/:id', protect, authorize(...DELIVERY_MANAGEMENT_ROLES), deleteDelivery);

module.exports = router;

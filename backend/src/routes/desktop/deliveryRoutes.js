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
const { protect } = require('../../middleware/auth');

// All delivery routes are protected

// 🆕 NEW ROUTES: Order-based delivery creation (NO INVOICE)
router.get('/available-orders', protect, getAvailableOrdersForDelivery);
router.post('/from-order', protect, createDeliveryFromOrder);

// Existing routes
router.get('/', protect, getAllDeliveries);
router.get('/with-items', protect, getAllDeliveriesWithItems);
router.get('/statistics', protect, getDeliveryStatistics);
router.get('/by-invoice/:invoiceId', protect, getDeliveriesByInvoice);
router.get('/by-order/:orderId', protect, getDeliveriesByOrder);
router.get('/:id', protect, getDeliveryById);
router.post('/', protect, createDelivery);
router.post('/bulk-delete', protect, bulkDeleteDeliveries);
router.put('/:id/status', protect, updateDeliveryStatus);
router.delete('/:id', protect, deleteDelivery);

module.exports = router;

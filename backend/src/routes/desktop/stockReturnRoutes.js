/**
 * Stock Return Routes
 * Base path: /api/desktop/stock-returns
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const controller = require('../../controllers/stockReturnController');

// All routes require authentication
router.use(protect);

// Process a new return
router.post('/', authorize('Admin', 'Manager'), controller.processReturn);

// Get all returns
router.get('/', authorize('Admin', 'Manager'), controller.getAllReturns);

// Get return statistics
router.get('/statistics', authorize('Admin', 'Manager'), controller.getReturnStatistics);

// Get returns by delivery
router.get('/delivery/:deliveryId', authorize('Admin', 'Manager'), controller.getReturnsByDelivery);

// Get return by ID
router.get('/:id', authorize('Admin', 'Manager'), controller.getReturnById);

module.exports = router;

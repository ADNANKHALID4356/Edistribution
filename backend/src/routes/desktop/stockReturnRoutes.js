/**
 * Stock Return Routes
 * Base path: /api/desktop/stock-returns
 */
const express = require('express');
const router = express.Router();
const { protect, authorize, ROLES } = require('../../middleware/auth');
const controller = require('../../controllers/stockReturnController');
const STOCK_RETURN_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER, ROLES.STOCK_MANAGER];

// All routes require authentication
router.use(protect);

// Process a new return
router.post('/', authorize(...STOCK_RETURN_ROLES), controller.processReturn);

// Get all returns
router.get('/', authorize(...STOCK_RETURN_ROLES), controller.getAllReturns);

// Get return statistics
router.get('/statistics', authorize(...STOCK_RETURN_ROLES), controller.getReturnStatistics);

// Get returns by delivery
router.get('/delivery/:deliveryId', authorize(...STOCK_RETURN_ROLES), controller.getReturnsByDelivery);

// Void (delete) a return — same roles as creating a return
router.delete('/:id', authorize(...STOCK_RETURN_ROLES), controller.voidReturn);

// Get return by ID
router.get('/:id', authorize(...STOCK_RETURN_ROLES), controller.getReturnById);

module.exports = router;

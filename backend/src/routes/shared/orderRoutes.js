/**
 * Shared Order Routes (Mobile & Desktop)
 * Sprint 5: Order Management System
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const orderController = require('../../controllers/orderController');

// All routes require authentication
router.use(protect);

// Create new order (from mobile)
router.post('/', orderController.createOrder);

// Get orders by salesman
router.get('/by-salesman/:salesmanId', orderController.getOrdersBySalesman);

module.exports = router;

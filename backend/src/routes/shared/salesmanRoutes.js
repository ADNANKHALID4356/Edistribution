/**
 * Salesman Routes (Shared - Mobile)
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const salesmanController = require('../../controllers/salesmanController');
const { protect } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all salesmen (for mobile sync) - supports limit parameter
router.get('/', salesmanController.getAllSalesmen);

// Get all active salesmen (for mobile sync)
router.get('/active', salesmanController.getActiveSalesmen);

// Get single salesman by ID
router.get('/:id', salesmanController.getSalesmanById);

// Get salesman's assigned routes
router.get('/:id/routes', salesmanController.getSalesmanRoutes);

// Get salesman performance metrics
router.get('/:id/performance', salesmanController.getSalesmanPerformance);

module.exports = router;

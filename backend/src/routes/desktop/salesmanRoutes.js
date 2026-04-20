/**
 * Salesman Routes (Desktop)
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const salesmanController = require('../../controllers/salesmanController');
const { protect } = require('../../middleware/auth');

// All routes require authentication
router.use(protect);

// Get all salesmen with pagination and filters
router.get('/', salesmanController.getAllSalesmen);

// Get salesmen summary (with routes count)
router.get('/summary', salesmanController.getSalesmenSummary);

// Get active salesmen (for dropdowns)
router.get('/active', salesmanController.getActiveSalesmen);

// Get single salesman by ID
router.get('/:id', salesmanController.getSalesmanById);

// Create new salesman
router.post('/', salesmanController.createSalesman);

// Update salesman
router.put('/:id', salesmanController.updateSalesman);

// Permanent delete salesman (hard delete - must be before /:id to avoid route conflict)
router.delete('/:id/permanent', salesmanController.permanentDeleteSalesman);

// Delete salesman (soft delete)
router.delete('/:id', salesmanController.deleteSalesman);

// Get salesman's assigned routes
router.get('/:id/routes', salesmanController.getSalesmanRoutes);

// Get salesman credentials (username/password)
router.get('/:id/credentials', salesmanController.getCredentials);

// Reset salesman password
router.post('/:id/reset-password', salesmanController.resetPassword);

// Get salesman performance metrics
router.get('/:id/performance', salesmanController.getSalesmanPerformance);

// Assign route to salesman
router.post('/:id/assign-route', salesmanController.assignRoute);

// Unassign route from salesman
router.post('/unassign-route', salesmanController.unassignRoute);

module.exports = router;

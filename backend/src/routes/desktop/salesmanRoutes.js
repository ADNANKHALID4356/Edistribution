/**
 * Salesman Routes (Desktop)
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const salesmanController = require('../../controllers/salesmanController');
const { protect, authorize, ROLES } = require('../../middleware/auth');
const SALESMAN_READ_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER, ROLES.ACCOUNTANT];
const SALESMAN_MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];

// All routes require authentication
router.use(protect);

// Get all salesmen with pagination and filters
router.get('/', authorize(...SALESMAN_READ_ROLES), salesmanController.getAllSalesmen);

// Get salesmen summary (with routes count)
router.get('/summary', authorize(...SALESMAN_READ_ROLES), salesmanController.getSalesmenSummary);

// Get active salesmen (for dropdowns)
router.get('/active', authorize(...SALESMAN_READ_ROLES), salesmanController.getActiveSalesmen);

// Get city options for salesman filters/forms
router.get('/city-options', authorize(...SALESMAN_READ_ROLES), salesmanController.getCityOptions);

// Get single salesman by ID
router.get('/:id', authorize(...SALESMAN_READ_ROLES), salesmanController.getSalesmanById);

// Create new salesman
router.post('/', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.createSalesman);

// Update salesman
router.put('/:id', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.updateSalesman);

// Permanent delete salesman (hard delete - must be before /:id to avoid route conflict)
router.delete('/:id/permanent', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.permanentDeleteSalesman);

// Delete salesman (soft delete)
router.delete('/:id', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.deleteSalesman);

// Get salesman's assigned routes
router.get('/:id/routes', authorize(...SALESMAN_READ_ROLES), salesmanController.getSalesmanRoutes);

// Get salesman credentials (username/password)
router.get('/:id/credentials', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.getCredentials);

// Reset salesman password
router.post('/:id/reset-password', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.resetPassword);

// Get salesman performance metrics
router.get('/:id/performance', authorize(...SALESMAN_READ_ROLES), salesmanController.getSalesmanPerformance);

// Assign route to salesman
router.post('/:id/assign-route', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.assignRoute);

// Unassign route from salesman
router.post('/unassign-route', authorize(...SALESMAN_MANAGEMENT_ROLES), salesmanController.unassignRoute);

module.exports = router;

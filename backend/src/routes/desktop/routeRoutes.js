const express = require('express');
const router = express.Router();
const routeController = require('../../controllers/routeController');
const { protect, authorize, ROLES } = require('../../middleware/auth');
const ROUTE_MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];
const ROUTE_BILL_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER, ROLES.ACCOUNTANT];

// Route management routes (all require authentication)
router.get('/', protect, authorize(...ROUTE_BILL_ROLES), routeController.getAllRoutes);
router.get('/:id', protect, authorize(...ROUTE_MANAGEMENT_ROLES), routeController.getRouteById);
router.get('/:id/stats', protect, authorize(...ROUTE_MANAGEMENT_ROLES), routeController.getRouteStats);
router.get('/:id/consolidated-bill', protect, authorize(...ROUTE_BILL_ROLES), routeController.getRouteConsolidatedBill);
router.post('/', protect, authorize(...ROUTE_MANAGEMENT_ROLES), routeController.createRoute);
router.put('/:id', protect, authorize(...ROUTE_MANAGEMENT_ROLES), routeController.updateRoute);
router.delete('/:id', protect, authorize(...ROUTE_MANAGEMENT_ROLES), routeController.deleteRoute);

module.exports = router;

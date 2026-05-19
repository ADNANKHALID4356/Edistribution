const express = require('express');
const router = express.Router();
const shopController = require('../../controllers/shopController');
const { protect, authorize, ROLES } = require('../../middleware/auth');
const SHOP_MANAGEMENT_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];

// Shop management routes (all require authentication)
router.get('/', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.getAllShops);
router.get('/filter-options', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.getFilterOptions);
router.get('/by-route/:routeId', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.getShopsByRoute);
router.get('/:id', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.getShopById);
router.post('/', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.createShop);
router.put('/:id', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.updateShop);
router.delete('/:id', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.deleteShop);
router.post('/:id/validate-credit', protect, authorize(...SHOP_MANAGEMENT_ROLES), shopController.validateCreditLimit);

module.exports = router;

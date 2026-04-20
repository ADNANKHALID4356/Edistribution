const express = require('express');
const router = express.Router();
const shopController = require('../../controllers/shopController');
const { protect } = require('../../middleware/auth');

// Shop management routes (all require authentication)
router.get('/', protect, shopController.getAllShops);
router.get('/by-route/:routeId', protect, shopController.getShopsByRoute);
router.get('/:id', protect, shopController.getShopById);
router.post('/', protect, shopController.createShop);
router.put('/:id', protect, shopController.updateShop);
router.delete('/:id', protect, shopController.deleteShop);
router.post('/:id/validate-credit', protect, shopController.validateCreditLimit);

module.exports = router;

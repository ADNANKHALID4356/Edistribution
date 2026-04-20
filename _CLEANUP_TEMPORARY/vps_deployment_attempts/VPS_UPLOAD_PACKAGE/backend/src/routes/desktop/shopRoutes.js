const express = require('express');
const router = express.Router();
const shopController = require('../../controllers/shopController');
const { protect } = require('../../middleware/auth');
const { cache } = require('../../middleware/cache');

// Shop management routes (all require authentication)
// Cache shop list for 5 minutes
router.get('/', protect, cache({ ttl: 300000 }), shopController.getAllShops);
// Cache shops by route for 5 minutes
router.get('/by-route/:routeId', protect, cache({ ttl: 300000 }), shopController.getShopsByRoute);
// Cache individual shop for 10 minutes
router.get('/:id', protect, cache({ ttl: 600000 }), shopController.getShopById);
router.post('/', protect, shopController.createShop);
router.put('/:id', protect, shopController.updateShop);
router.delete('/:id', protect, shopController.deleteShop);
router.post('/:id/validate-credit', protect, shopController.validateCreditLimit);

module.exports = router;

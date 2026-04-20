const express = require('express');
const router = express.Router();
const shopController = require('../../controllers/shopController');
const { protect } = require('../../middleware/auth');

// Get all shops (for mobile sync) - requires authentication
router.get('/', protect, shopController.getAllShops);

// Get shops by assigned route (for salesmen) - requires authentication
router.get('/by-route/:routeId', protect, shopController.getShopsByRoute);

// Get shop details - requires authentication
router.get('/:id', protect, shopController.getShopById);

module.exports = router;

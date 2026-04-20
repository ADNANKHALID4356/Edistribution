/**
 * Shared Product Routes
 * Product endpoints accessible by both desktop and mobile
 * WITH PERFORMANCE CACHING
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const { cache } = require('../../middleware/cache');
const {
  getActiveProducts,
  getProductById
} = require('../../controllers/productController');

// All routes require authentication
router.use(protect);

// @route   GET /api/shared/products/active
// @desc    Get all active products (for mobile sync and dropdowns)
// @access  Private (All roles)
// Cache for 5 minutes - products don't change frequently
router.get('/active', cache({ ttl: 300000 }), getActiveProducts);

// @route   GET /api/shared/products/:id
// @desc    Get single product details
// @access  Private (All roles)
// Cache for 10 minutes - individual products change even less
router.get('/:id', cache({ ttl: 600000 }), getProductById);

module.exports = router;

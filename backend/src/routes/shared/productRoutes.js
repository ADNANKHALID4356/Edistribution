/**
 * Shared Product Routes
 * Product endpoints accessible by both desktop and mobile
 * WITH PERFORMANCE CACHING
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getActiveProducts,
  getProductById
} = require('../../controllers/productController');

// All routes require authentication
router.use(protect);

// @route   GET /api/shared/products/active
// @desc    Get all active products (for mobile sync and dropdowns)
// @access  Private (All roles)
router.get('/active', getActiveProducts);

// @route   GET /api/shared/products/:id
// @desc    Get single product details
// @access  Private (All roles)
router.get('/:id', getProductById);

module.exports = router;

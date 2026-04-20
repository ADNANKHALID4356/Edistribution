/**
 * Desktop Product Routes
 * All product management endpoints for desktop application
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getCategories,
  getBrands,
  bulkImportProducts
} = require('../../controllers/productController');

// All routes require authentication
router.use(protect);

// @route   GET /api/desktop/products/categories
// @desc    Get all categories
// @access  Private (Admin, Manager)
router.get('/categories', authorize('Admin', 'Manager'), getCategories);

// @route   GET /api/desktop/products/brands
// @desc    Get all brands
// @access  Private (Admin, Manager)
router.get('/brands', authorize('Admin', 'Manager'), getBrands);

// @route   GET /api/desktop/products/low-stock
// @desc    Get low stock products
// @access  Private (Admin, Manager)
router.get('/low-stock', authorize('Admin', 'Manager'), getLowStockProducts);

// @route   POST /api/desktop/products/bulk
// @desc    Bulk import products
// @access  Private (Admin only)
router.post('/bulk', authorize('Admin'), bulkImportProducts);

// @route   GET /api/desktop/products
// @desc    Get all products with pagination and filters
// @access  Private (Admin, Manager)
// Apply cache middleware
const { cache } = require('../../middleware/cache');
router.get('/', authorize('Admin', 'Manager'), cache({ ttl: 300000 }), getProducts);

// @route   GET /api/desktop/products/:id
// @desc    Get single product
// @access  Private (Admin, Manager)
router.get('/:id', authorize('Admin', 'Manager'), getProductById);

// @route   POST /api/desktop/products
// @desc    Create new product
// @access  Private (Admin, Manager)
router.post('/', authorize('Admin', 'Manager'), createProduct);

// @route   PUT /api/desktop/products/:id
// @desc    Update product
// @access  Private (Admin, Manager)
router.put('/:id', authorize('Admin', 'Manager'), updateProduct);

// @route   DELETE /api/desktop/products/:id
// @desc    Delete product (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authorize('Admin'), deleteProduct);

module.exports = router;

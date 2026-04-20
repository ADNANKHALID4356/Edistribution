/**
 * Desktop Product Routes
 * All product management endpoints for desktop application
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
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
  getCompanies,
  bulkImportProducts,
  uploadAndParseFile,
  getProductWarehouseStock,
  addStock
} = require('../../controllers/productController');

const upload = multer({ dest: 'uploads/' });

// All routes require authentication
router.use(protect);

// @route   POST /api/desktop/products/upload-parse
// @desc    Upload file for parsing (preview/column mapping phase)
// @access  Private (Admin only)
router.post('/upload-parse', authorize('Admin'), upload.single('file'), uploadAndParseFile);

// @route   GET /api/desktop/products/categories
// @desc    Get all categories
// @access  Private (Admin, Manager)
router.get('/categories', authorize('Admin', 'Manager'), getCategories);

// @route   GET /api/desktop/products/brands
// @desc    Get all brands
// @access  Private (Admin, Manager)
router.get('/brands', authorize('Admin', 'Manager'), getBrands);

// @route   GET /api/desktop/products/companies
// @desc    Get all companies
// @access  Private (Admin, Manager)
router.get('/companies', authorize('Admin', 'Manager'), getCompanies);

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
router.get('/', authorize('Admin', 'Manager'), getProducts);

// @route   GET /api/desktop/products/:id
// @desc    Get single product
// @access  Private (Admin, Manager)
router.get('/:id', authorize('Admin', 'Manager'), getProductById);

// @route   GET /api/desktop/products/:id/warehouse-stock
// @desc    Get warehouse stock breakdown for a product
// @access  Private (Admin, Manager)
router.get('/:id/warehouse-stock', authorize('Admin', 'Manager'), getProductWarehouseStock);

// @route   POST /api/desktop/products
// @desc    Create new product
// @access  Private (Admin, Manager)
router.post('/', authorize('Admin', 'Manager'), createProduct);

// @route   PUT /api/desktop/products/:id
// @desc    Update product
// @access  Private (Admin, Manager)
router.put('/:id', authorize('Admin', 'Manager'), updateProduct);

// @route   PUT /api/desktop/products/:id/add-stock
// @desc    Add stock to existing product
// @access  Private (Admin, Manager)
router.put('/:id/add-stock', authorize('Admin', 'Manager'), addStock);

// @route   DELETE /api/desktop/products/:id
// @desc    Delete product (soft delete)
// @access  Private (Admin only)
router.delete('/:id', authorize('Admin'), deleteProduct);

module.exports = router;

/**
 * Desktop Supplier Routes
 * All supplier management endpoints for desktop application
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../../controllers/supplierController');

// All routes require authentication
router.use(protect);

// @route   GET /api/desktop/suppliers
// @desc    Get all suppliers with pagination
// @access  Private (Admin, Manager)
router.get('/', authorize('Admin', 'Manager'), getSuppliers);

// @route   GET /api/desktop/suppliers/:id
// @desc    Get single supplier
// @access  Private (Admin, Manager)
router.get('/:id', authorize('Admin', 'Manager'), getSupplierById);

// @route   POST /api/desktop/suppliers
// @desc    Create new supplier
// @access  Private (Admin, Manager)
router.post('/', authorize('Admin', 'Manager'), createSupplier);

// @route   PUT /api/desktop/suppliers/:id
// @desc    Update supplier
// @access  Private (Admin, Manager)
router.put('/:id', authorize('Admin', 'Manager'), updateSupplier);

// @route   DELETE /api/desktop/suppliers/:id
// @desc    Delete supplier
// @access  Private (Admin only)
router.delete('/:id', authorize('Admin'), deleteSupplier);

module.exports = router;

/**
 * Desktop Supplier Routes
 * All supplier management endpoints for desktop application
 */

const express = require('express');
const router = express.Router();
const { protect, authorize, ROLES } = require('../../middleware/auth');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier
} = require('../../controllers/supplierController');

// All routes require authentication
router.use(protect);
const SUPPLIER_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];

// @route   GET /api/desktop/suppliers
// @desc    Get all suppliers with pagination
// @access  Private (Admin, Manager)
router.get('/', authorize(...SUPPLIER_ROLES), getSuppliers);

// @route   GET /api/desktop/suppliers/:id
// @desc    Get single supplier
// @access  Private (Admin, Manager)
router.get('/:id', authorize(...SUPPLIER_ROLES), getSupplierById);

// @route   POST /api/desktop/suppliers
// @desc    Create new supplier
// @access  Private (Admin, Manager)
router.post('/', authorize(...SUPPLIER_ROLES), createSupplier);

// @route   PUT /api/desktop/suppliers/:id
// @desc    Update supplier
// @access  Private (Admin, Manager)
router.put('/:id', authorize(...SUPPLIER_ROLES), updateSupplier);

// @route   DELETE /api/desktop/suppliers/:id
// @desc    Delete supplier
// @access  Private (Admin only)
router.delete('/:id', authorize(...SUPPLIER_ROLES), deleteSupplier);

module.exports = router;

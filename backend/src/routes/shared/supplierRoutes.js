/**
 * Shared Supplier Routes
 * Supplier endpoints accessible by both desktop and mobile
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const {
  getActiveSuppliers
} = require('../../controllers/supplierController');

// All routes require authentication
router.use(protect);

// @route   GET /api/shared/suppliers/active
// @desc    Get all active suppliers (for dropdowns and mobile sync)
// @access  Private (All roles)
router.get('/active', getActiveSuppliers);

module.exports = router;

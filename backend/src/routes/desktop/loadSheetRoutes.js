const express = require('express');
const router = express.Router();
const { 
  createLoadSheet, 
  getLoadSheetsByWarehouse,
  getLoadSheetById,
  updateLoadSheet,
  deleteLoadSheet,
  updateLoadSheetStatus
} = require('../../controllers/loadSheetController');
const { protect } = require('../../middleware/auth');

// Create load sheet
router.post('/', protect, createLoadSheet);

// Get load sheets for a warehouse
router.get('/warehouse/:warehouseId', protect, getLoadSheetsByWarehouse);
router.get('/', protect, getLoadSheetsByWarehouse); // warehouse_id as query

// Get single load sheet by ID
router.get('/:id', protect, getLoadSheetById);

// Update load sheet (draft only)
router.put('/:id', protect, updateLoadSheet);

// Delete load sheet (draft only)
router.delete('/:id', protect, deleteLoadSheet);

// Update load sheet status
router.put('/:id/status', protect, updateLoadSheetStatus);

module.exports = router;
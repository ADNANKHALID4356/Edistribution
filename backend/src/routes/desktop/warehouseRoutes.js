// Warehouse Routes
// Purpose: API routes for warehouse management

const express = require('express');
const router = express.Router();
const {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  getWarehouseDependencies,
  getWarehouseStock,
  updateStockLevel,
  getStockMovements,
  recordStockMovement,
  addProductToWarehouse,
  addProductsBulkToWarehouse,
  removeProductFromWarehouse,
  getAvailableProducts
} = require('../../controllers/warehouseController');
const { protect } = require('../../middleware/auth');

// All warehouse routes are protected
router.get('/', protect, getAllWarehouses);
router.get('/:id', protect, getWarehouseById);
router.get('/:id/dependencies', protect, getWarehouseDependencies);
router.post('/', protect, createWarehouse);
router.put('/:id', protect, updateWarehouse);
router.delete('/:id', protect, deleteWarehouse);

// Stock management routes
router.get('/:id/stock', protect, getWarehouseStock);
router.put('/:id/stock/:productId', protect, updateStockLevel);

// Product management routes
router.get('/:id/available-products', protect, getAvailableProducts);
router.post('/:id/products', protect, addProductToWarehouse);
router.post('/:id/products/bulk', protect, addProductsBulkToWarehouse);
router.delete('/:id/products/:productId', protect, removeProductFromWarehouse);

// Stock movements routes
router.get('/:id/movements', protect, getStockMovements);
router.post('/:id/movements', protect, recordStockMovement);

module.exports = router;

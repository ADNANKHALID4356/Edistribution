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
const { protect, authorize, ROLES } = require('../../middleware/auth');
const WAREHOUSE_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER];

// All warehouse routes are protected
router.get('/', protect, authorize(...WAREHOUSE_ROLES), getAllWarehouses);
router.get('/:id', protect, authorize(...WAREHOUSE_ROLES), getWarehouseById);
router.get('/:id/dependencies', protect, authorize(...WAREHOUSE_ROLES), getWarehouseDependencies);
router.post('/', protect, authorize(...WAREHOUSE_ROLES), createWarehouse);
router.put('/:id', protect, authorize(...WAREHOUSE_ROLES), updateWarehouse);
router.delete('/:id', protect, authorize(...WAREHOUSE_ROLES), deleteWarehouse);

// Stock management routes
router.get('/:id/stock', protect, authorize(...WAREHOUSE_ROLES), getWarehouseStock);
router.put('/:id/stock/:productId', protect, authorize(...WAREHOUSE_ROLES), updateStockLevel);

// Product management routes
router.get('/:id/available-products', protect, authorize(...WAREHOUSE_ROLES), getAvailableProducts);
router.post('/:id/products', protect, authorize(...WAREHOUSE_ROLES), addProductToWarehouse);
router.post('/:id/products/bulk', protect, authorize(...WAREHOUSE_ROLES), addProductsBulkToWarehouse);
router.delete('/:id/products/:productId', protect, authorize(...WAREHOUSE_ROLES), removeProductFromWarehouse);

// Stock movements routes
router.get('/:id/movements', protect, authorize(...WAREHOUSE_ROLES), getStockMovements);
router.post('/:id/movements', protect, authorize(...WAREHOUSE_ROLES), recordStockMovement);

module.exports = router;

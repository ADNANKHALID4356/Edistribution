// Warehouse Controller
// Purpose: Handle warehouse management API requests

const Warehouse = require('../models/Warehouse');

/**
 * GET /api/desktop/warehouses
 * Get all warehouses
 */
exports.getAllWarehouses = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      city: req.query.city,
      search: req.query.search
    };

    const warehouses = await Warehouse.getAll(filters);

    res.json({
      success: true,
      data: warehouses
    });
  } catch (error) {
    console.error('❌ Error in getAllWarehouses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouses',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/warehouses/:id
 * Get warehouse by ID
 */
exports.getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.getById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    console.error('❌ Error in getWarehouseById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse',
      error: error.message
    });
  }
};

/**
 * POST /api/desktop/warehouses
 * Create new warehouse
 */
exports.createWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;
    const userId = req.user?.id;

    console.log('📝 Creating warehouse with data:', JSON.stringify(warehouseData, null, 2));
    console.log('👤 User ID:', userId);

    // Validation
    if (!warehouseData.name) {
      console.log('❌ Validation failed: name is required');
      return res.status(400).json({
        success: false,
        message: 'Warehouse name is required'
      });
    }

    const warehouse = await Warehouse.create(warehouseData, userId);
    console.log('✅ Warehouse created successfully:', warehouse.id);

    const responseData = {
      success: true,
      message: 'Warehouse created successfully',
      data: warehouse
    };
    console.log('📤 Sending response:', JSON.stringify(responseData, null, 2));

    res.status(201).json(responseData);
  } catch (error) {
    console.error('❌ Error in createWarehouse:', error);
    console.error('❌ Error stack:', error.stack);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Warehouse code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create warehouse',
      error: error.message
    });
  }
};

/**
 * PUT /api/desktop/warehouses/:id
 * Update warehouse
 */
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;
    const userId = req.user?.id;

    const warehouse = await Warehouse.update(req.params.id, warehouseData, userId);

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: warehouse
    });
  } catch (error) {
    console.error('❌ Error in updateWarehouse:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Warehouse code already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update warehouse',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/warehouses/:id/dependencies
 * Get warehouse dependencies (deliveries, stock)
 */
exports.getWarehouseDependencies = async (req, res) => {
  try {
    const dependencies = await Warehouse.getDependencies(req.params.id);
    
    res.json({
      success: true,
      data: dependencies
    });
  } catch (error) {
    console.error('❌ Error in getWarehouseDependencies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get warehouse dependencies',
      error: error.message
    });
  }
};

/**
 * DELETE /api/desktop/warehouses/:id
 * Delete warehouse
 * Query params:
 *   - force: boolean - Force delete even with stock
 */
exports.deleteWarehouse = async (req, res) => {
  try {
    const force = req.query.force === 'true';
    await Warehouse.delete(req.params.id, force);

    res.json({
      success: true,
      message: force ? 'Warehouse force deleted successfully' : 'Warehouse deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error in deleteWarehouse:', error);
    
    // Provide detailed error information
    const response = {
      success: false,
      message: error.message,
      code: error.code
    };

    // Add details if available
    if (error.details) {
      response.details = error.details;
    }

    res.status(400).json(response);
  }
};

/**
 * GET /api/desktop/warehouses/:id/stock
 * Get warehouse stock
 */
exports.getWarehouseStock = async (req, res) => {
  try {
    const filters = {
      low_stock: req.query.low_stock === 'true',
      search: req.query.search
    };

    const stock = await Warehouse.getStock(req.params.id, filters);

    res.json({
      success: true,
      data: stock
    });
  } catch (error) {
    console.error('❌ Error in getWarehouseStock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse stock',
      error: error.message
    });
  }
};

/**
 * PUT /api/desktop/warehouses/:id/stock/:productId
 * Update stock level
 */
exports.updateStockLevel = async (req, res) => {
  try {
    const { id: warehouseId, productId } = req.params;
    const { quantity } = req.body;
    const userId = req.user?.id;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid quantity is required'
      });
    }

    await Warehouse.updateStock(warehouseId, productId, quantity, userId);

    res.json({
      success: true,
      message: 'Stock level updated successfully'
    });
  } catch (error) {
    console.error('❌ Error in updateStockLevel:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock level',
      error: error.message
    });
  }
};

/**
 * GET /api/desktop/warehouses/:id/movements
 * Get stock movements history
 */
exports.getStockMovements = async (req, res) => {
  try {
    const filters = {
      product_id: req.query.product_id,
      movement_type: req.query.movement_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    };

    const movements = await Warehouse.getStockMovements(req.params.id, filters);

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('❌ Error in getStockMovements:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movements',
      error: error.message
    });
  }
};

/**
 * POST /api/desktop/warehouses/:id/movements
 * Record stock movement
 */
exports.recordStockMovement = async (req, res) => {
  try {
    const movementData = {
      ...req.body,
      warehouse_id: req.params.id
    };
    const userId = req.user?.id;

    const movementId = await Warehouse.recordMovement(movementData, userId);

    res.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: { id: movementId }
    });
  } catch (error) {
    console.error('❌ Error in recordStockMovement:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record stock movement',
      error: error.message
    });
  }
};

/**
 * POST /api/desktop/warehouses/:id/products
 * Add product to warehouse
 */
exports.addProductToWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.id;
    const productData = req.body;
    const userId = req.user?.id;

    console.log('📦 Add Product to Warehouse Request:');
    console.log('  Warehouse ID:', warehouseId);
    console.log('  Product Data:', JSON.stringify(productData, null, 2));
    console.log('  User ID:', userId);

    await Warehouse.addProduct(warehouseId, productData, userId);

    console.log('✅ Product added successfully');
    res.json({
      success: true,
      message: 'Product added to warehouse successfully'
    });
  } catch (error) {
    console.error('❌ Error in addProductToWarehouse:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to add product to warehouse',
      error: error.message
    });
  }
};

/**
 * POST /api/desktop/warehouses/:id/products/bulk
 * Add multiple products to warehouse
 */
exports.addProductsBulkToWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.id;
    const { products } = req.body;
    const userId = req.user?.id;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }

    const results = await Warehouse.addProductsBulk(warehouseId, products, userId);

    res.json({
      success: true,
      message: `${results.success.length} products added successfully`,
      data: results
    });
  } catch (error) {
    console.error('❌ Error in addProductsBulkToWarehouse:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add products to warehouse',
      error: error.message
    });
  }
};

/**
 * DELETE /api/desktop/warehouses/:id/products/:productId
 * Remove product from warehouse
 */
exports.removeProductFromWarehouse = async (req, res) => {
  try {
    const { id: warehouseId, productId } = req.params;

    await Warehouse.removeProduct(warehouseId, productId);

    res.json({
      success: true,
      message: 'Product removed from warehouse successfully'
    });
  } catch (error) {
    console.error('❌ Error in removeProductFromWarehouse:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/desktop/warehouses/:id/available-products
 * Get products not yet in warehouse
 */
exports.getAvailableProducts = async (req, res) => {
  try {
    const warehouseId = req.params.id;
    const filters = {
      search: req.query.search,
      category: req.query.category
    };

    const products = await Warehouse.getAvailableProducts(warehouseId, filters);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('❌ Error in getAvailableProducts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available products',
      error: error.message
    });
  }
};

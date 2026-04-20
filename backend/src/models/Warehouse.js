// Warehouse Model
// Purpose: Manage warehouse data and operations

const db = require('../config/database');

class Warehouse {
  /**
   * Get all warehouses with optional filters
   */
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          w.*,
          COALESCE((SELECT COUNT(DISTINCT product_id) FROM warehouse_stock WHERE warehouse_id = w.id), 0) as total_products,
          COALESCE((SELECT SUM(quantity) FROM warehouse_stock WHERE warehouse_id = w.id), 0) as total_stock_quantity,
          COALESCE((SELECT SUM(quantity - COALESCE(reserved_quantity, 0)) FROM warehouse_stock WHERE warehouse_id = w.id), 0) as total_available_quantity
        FROM warehouses w
      `;
      
      const conditions = [];
      const params = [];

      if (filters.status) {
        conditions.push('w.status = ?');
        params.push(filters.status);
      }

      if (filters.city) {
        conditions.push('w.city = ?');
        params.push(filters.city);
      }

      if (filters.search) {
        conditions.push('(w.name LIKE ? OR w.code LIKE ? OR w.manager_name LIKE ?)');
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY w.is_default DESC, w.name ASC';

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching warehouses:', error);
      throw error;
    }
  }

  /**
   * Get warehouse by ID with stock summary
   */
  static async getById(id) {
    try {
      const [warehouses] = await db.query(`
        SELECT 
          w.*,
          COALESCE((SELECT COUNT(DISTINCT product_id) FROM warehouse_stock WHERE warehouse_id = w.id), 0) as total_products,
          COALESCE((SELECT SUM(quantity) FROM warehouse_stock WHERE warehouse_id = w.id), 0) as total_stock_quantity,
          COALESCE((SELECT SUM(quantity - COALESCE(reserved_quantity, 0)) FROM warehouse_stock WHERE warehouse_id = w.id), 0) as total_available_quantity
        FROM warehouses w
        WHERE w.id = ?
      `, [id]);

      if (warehouses.length === 0) {
        return null;
      }

      return warehouses[0];
    } catch (error) {
      console.error('❌ Error fetching warehouse by ID:', error);
      throw error;
    }
  }

  /**
   * Create new warehouse
   */
  static async create(warehouseData, userId) {
    try {
      // If this is set as default, unset other defaults
      if (warehouseData.is_default) {
        await db.query('UPDATE warehouses SET is_default = FALSE');
      }

      const [result] = await db.query(`
        INSERT INTO warehouses (
          name, code, address, city, area, postal_code,
          manager_name, manager_phone, contact_number, email,
          capacity, storage_type, status, is_default, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        warehouseData.name,
        warehouseData.code || null,
        warehouseData.address || null,
        warehouseData.city || null,
        warehouseData.area || null,
        warehouseData.postal_code || null,
        warehouseData.manager_name || null,
        warehouseData.manager_phone || null,
        warehouseData.contact_number || null,
        warehouseData.email || null,
        warehouseData.capacity || 0,
        warehouseData.storage_type || 'general',
        warehouseData.status || 'active',
        warehouseData.is_default || false,
        warehouseData.notes || null,
        userId
      ]);

      return await this.getById(result.insertId);
    } catch (error) {
      console.error('❌ Error creating warehouse:', error);
      throw error;
    }
  }

  /**
   * Update warehouse
   */
  static async update(id, warehouseData, userId) {
    try {
      // If this is set as default, unset other defaults
      if (warehouseData.is_default) {
        await db.query('UPDATE warehouses SET is_default = FALSE WHERE id != ?', [id]);
      }

      await db.query(`
        UPDATE warehouses SET
          name = ?,
          code = ?,
          address = ?,
          city = ?,
          area = ?,
          postal_code = ?,
          manager_name = ?,
          manager_phone = ?,
          contact_number = ?,
          email = ?,
          capacity = ?,
          storage_type = ?,
          status = ?,
          is_default = ?,
          notes = ?
        WHERE id = ?
      `, [
        warehouseData.name,
        warehouseData.code || null,
        warehouseData.address || null,
        warehouseData.city || null,
        warehouseData.area || null,
        warehouseData.postal_code || null,
        warehouseData.manager_name || null,
        warehouseData.manager_phone || null,
        warehouseData.contact_number || null,
        warehouseData.email || null,
        warehouseData.capacity || 0,
        warehouseData.storage_type || 'general',
        warehouseData.status || 'active',
        warehouseData.is_default || false,
        warehouseData.notes || null,
        id
      ]);

      return await this.getById(id);
    } catch (error) {
      console.error('❌ Error updating warehouse:', error);
      throw error;
    }
  }

  /**
   * Get warehouse dependencies (deliveries, stock)
   * @param {number} id - Warehouse ID
   */
  static async getDependencies(id) {
    try {
      // Check deliveries
      const [deliveries] = await db.query(
        'SELECT COUNT(*) as total, SUM(CASE WHEN status IN ("pending", "in_transit") THEN 1 ELSE 0 END) as pending FROM deliveries WHERE warehouse_id = ?',
        [id]
      );

      // Check stock
      const [stock] = await db.query(
        'SELECT COUNT(*) as count, SUM(quantity) as total_quantity FROM warehouse_stock WHERE warehouse_id = ?',
        [id]
      );

      return {
        deliveries: {
          total: deliveries[0].total || 0,
          pending: deliveries[0].pending || 0,
          completed: (deliveries[0].total || 0) - (deliveries[0].pending || 0)
        },
        stock: {
          products: stock[0].count || 0,
          totalQuantity: stock[0].total_quantity || 0
        },
        canDelete: (
          deliveries[0].total === 0 &&
          (stock[0].total_quantity || 0) === 0
        )
      };
    } catch (error) {
      console.error('❌ Error getting warehouse dependencies:', error);
      throw error;
    }
  }

  /**
   * Delete warehouse
   * @param {number} id - Warehouse ID
   * @param {boolean} force - Force delete even with stock (will clean up stock records)
   */
  static async delete(id, force = false) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Check if warehouse exists
      const [warehouse] = await connection.query(
        'SELECT * FROM warehouses WHERE id = ?',
        [id]
      );

      if (warehouse.length === 0) {
        throw new Error('Warehouse not found');
      }

      // Get all dependencies
      const deps = await this.getDependencies(id);

      // Check for deliveries
      if (deps.deliveries.total > 0) {
        const error = new Error('Cannot delete warehouse with delivery records');
        error.code = 'WAREHOUSE_HAS_DEPENDENCIES';
        error.details = {
          dependencies: deps,
          message: `This warehouse has ${deps.deliveries.total} delivery record(s). Please delete all deliveries first.`
        };
        throw error;
      }

      // Check for stock
      if (!force && deps.stock.totalQuantity > 0) {
        const error = new Error('Cannot delete warehouse with existing stock');
        error.code = 'WAREHOUSE_HAS_STOCK';
        error.details = {
          dependencies: deps,
          message: `This warehouse has ${deps.stock.products} product(s) with ${deps.stock.totalQuantity} total units.`
        };
        throw error;
      }

      // If force is true, clean up stock
      if (force && deps.stock.products > 0) {
        console.log(`⚠️ Force deleting warehouse ${id}...`);
        console.log(`  → Removing ${deps.stock.products} stock records...`);
        await connection.query(
          'DELETE FROM warehouse_stock WHERE warehouse_id = ?',
          [id]
        );
      }

      // Delete the warehouse
      await connection.query('DELETE FROM warehouses WHERE id = ?', [id]);
      
      await connection.commit();
      console.log(`✅ Warehouse ${id} deleted successfully`);
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error deleting warehouse:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get warehouse stock with product details
   * NOTE: Displays actual product stock (products.stock_quantity) as primary value
   * warehouse_stock.quantity is kept for warehouse-specific tracking
   */
  static async getStock(warehouseId, filters = {}) {
    try {
      let query = `
        SELECT 
          ws.id,
          ws.warehouse_id,
          ws.product_id,
          
          -- Warehouse stock quantities
          ws.quantity,
          COALESCE(ws.reserved_quantity, 0) as reserved_quantity,
          ws.quantity - COALESCE(ws.reserved_quantity, 0) as available_quantity,
          
          -- Stock level thresholds
          COALESCE(ws.min_stock_level, 0) as min_stock_level,
          COALESCE(ws.max_stock_level, 0) as max_stock_level,
          COALESCE(ws.reorder_point, 0) as reorder_point,
          
          -- Location & tracking
          ws.location_in_warehouse,
          ws.batch_number,
          ws.expiry_date,
          ws.notes as stock_notes,
          ws.last_updated,
          ws.created_by,
          
          -- Product details
          p.product_name,
          p.product_code,
          p.category,
          p.brand,
          p.pack_size,
          p.unit_price,
          p.carton_price,
          p.pieces_per_carton,
          p.purchase_price,
          p.barcode,
          p.description,
          p.is_active,
          p.stock_quantity as global_stock,
          p.reorder_level as product_reorder_level
        FROM warehouse_stock ws
        INNER JOIN products p ON ws.product_id = p.id
        WHERE ws.warehouse_id = ?
      `;
      
      const params = [warehouseId];

      if (filters.low_stock) {
        // Low stock: quantity below min level or reorder point
        query += ' AND (ws.quantity <= COALESCE(ws.min_stock_level, 0) OR ws.quantity <= COALESCE(ws.reorder_point, 0))';
      }

      if (filters.search) {
        query += ' AND (p.product_name LIKE ? OR p.product_code LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.category) {
        query += ' AND p.category = ?';
        params.push(filters.category);
      }

      query += ' ORDER BY p.product_name ASC';

      const [rows] = await db.query(query, params);
      
      // Calculate totals
      const totals = {
        totalProducts: rows.length,
        totalQuantity: rows.reduce((sum, row) => sum + parseFloat(row.quantity || 0), 0),
        totalReserved: rows.reduce((sum, row) => sum + parseFloat(row.reserved_quantity || 0), 0),
        totalAvailable: rows.reduce((sum, row) => sum + parseFloat(row.available_quantity || 0), 0),
        lowStockCount: rows.filter(row => 
          row.quantity <= (row.min_stock_level || 0) || 
          row.quantity <= (row.reorder_point || 0)
        ).length
      };

      return {
        products: rows,
        totals: totals
      };
    } catch (error) {
      console.error('❌ Error fetching warehouse stock:', error);
      throw error;
    }
  }

  /**
   * Update stock level
   */
  static async updateStock(warehouseId, productId, quantity, userId) {
    try {
      // Check if stock record exists
      const [existing] = await db.query(
        'SELECT * FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
        [warehouseId, productId]
      );

      if (existing.length > 0) {
        // Update existing (MySQL syntax)
        await db.query(`
          UPDATE warehouse_stock 
          SET quantity = ?, created_by = ?
          WHERE warehouse_id = ? AND product_id = ?
        `, [quantity, userId, warehouseId, productId]);
      } else {
        // Insert new (MySQL syntax - let database handle timestamps)
        await db.query(`
          INSERT INTO warehouse_stock (warehouse_id, product_id, quantity, created_by)
          VALUES (?, ?, ?, ?)
        `, [warehouseId, productId, quantity, userId]);
      }

      return true;
    } catch (error) {
      console.error('❌ Error updating warehouse stock:', error);
      throw error;
    }
  }

  /**
   * Get stock movements history
   */
  static async getStockMovements(warehouseId, filters = {}) {
    try {
      let query = `
        SELECT 
          sm.*,
          p.name as product_name,
          p.code as product_code,
          u.username as created_by_username
        FROM stock_movements sm
        INNER JOIN products p ON sm.product_id = p.id
        LEFT JOIN users u ON sm.created_by = u.id
        WHERE sm.warehouse_id = ?
      `;
      
      const params = [warehouseId];

      if (filters.product_id) {
        query += ' AND sm.product_id = ?';
        params.push(filters.product_id);
      }

      if (filters.movement_type) {
        query += ' AND sm.movement_type = ?';
        params.push(filters.movement_type);
      }

      if (filters.start_date) {
        query += ' AND sm.movement_date >= ?';
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        query += ' AND sm.movement_date <= ?';
        params.push(filters.end_date);
      }

      query += ' ORDER BY sm.created_at DESC LIMIT 100';

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching stock movements:', error);
      throw error;
    }
  }

  /**
   * Record stock movement
   */
  static async recordMovement(movementData, userId) {
    try {
      const [result] = await db.query(`
        INSERT INTO stock_movements (
          warehouse_id, product_id, movement_type, quantity,
          reference_type, reference_id, reference_number,
          quantity_before, quantity_after, unit_cost, notes,
          movement_date, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        movementData.warehouse_id,
        movementData.product_id,
        movementData.movement_type,
        movementData.quantity,
        movementData.reference_type || null,
        movementData.reference_id || null,
        movementData.reference_number || null,
        movementData.quantity_before || 0,
        movementData.quantity_after || 0,
        movementData.unit_cost || 0,
        movementData.notes || null,
        movementData.movement_date || new Date().toISOString().split('T')[0],
        userId
      ]);

      return result.insertId;
    } catch (error) {
      console.error('❌ Error recording stock movement:', error);
      throw error;
    }
  }

  /**
   * Add product to warehouse
   * Creates a warehouse_stock entry if not exists
   */
  static async addProduct(warehouseId, productData, userId) {
    try {
      const { product_id, quantity, minimum_stock, maximum_stock, rack_number, bin_location } = productData;

      // Check if product already exists in this warehouse
      const [existing] = await db.query(
        'SELECT id FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
        [warehouseId, product_id]
      );

      if (existing.length > 0) {
        throw new Error('Product already exists in this warehouse. Use update instead.');
      }

      // Insert new warehouse_stock record (using correct SQLite column names)
      await db.query(`
        INSERT INTO warehouse_stock (
          warehouse_id, product_id, quantity, min_stock_level, max_stock_level,
          location_in_warehouse, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        warehouseId,
        product_id,
        quantity || 0,
        minimum_stock || 0,
        maximum_stock || 0,
        rack_number || bin_location || null,
        userId
      ]);

      console.log(`✅ Product ${product_id} added to warehouse ${warehouseId}`);
      return true;
    } catch (error) {
      console.error('❌ Error adding product to warehouse:', error);
      throw error;
    }
  }

  /**
   * Add multiple products to warehouse in bulk
   */
  static async addProductsBulk(warehouseId, products, userId) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const results = {
        success: [],
        failed: [],
        duplicates: []
      };

      for (const product of products) {
        try {
          // Check if product already exists
          const [existing] = await connection.query(
            'SELECT id FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
            [warehouseId, product.product_id]
          );

          if (existing.length > 0) {
            results.duplicates.push({
              product_id: product.product_id,
              message: 'Product already exists in warehouse'
            });
            continue;
          }

          // Insert new warehouse_stock record (using correct SQLite column names)
          await connection.query(`
            INSERT INTO warehouse_stock (
              warehouse_id, product_id, quantity, min_stock_level, max_stock_level,
              location_in_warehouse, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            warehouseId,
            product.product_id,
            product.quantity || 0,
            product.minimum_stock || 0,
            product.maximum_stock || 0,
            product.rack_number || product.bin_location || null,
            userId
          ]);

          results.success.push(product.product_id);
        } catch (err) {
          results.failed.push({
            product_id: product.product_id,
            error: err.message
          });
        }
      }

      await connection.commit();
      
      console.log(`✅ Bulk add complete: ${results.success.length} added, ${results.duplicates.length} duplicates, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      await connection.rollback();
      console.error('❌ Error in bulk add products:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Remove product from warehouse
   */
  static async removeProduct(warehouseId, productId) {
    try {
      // Check if product has stock
      const [stockCheck] = await db.query(
        'SELECT quantity, reserved_quantity FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
        [warehouseId, productId]
      );

      if (stockCheck.length === 0) {
        throw new Error('Product not found in warehouse');
      }

      const stock = stockCheck[0];
      if (parseFloat(stock.quantity) > 0) {
        throw new Error('Cannot remove product with stock quantity. Set quantity to 0 first.');
      }

      if (parseFloat(stock.reserved_quantity) > 0) {
        throw new Error('Cannot remove product with reserved stock. Complete or cancel pending orders first.');
      }

      // Delete warehouse_stock record
      await db.query(
        'DELETE FROM warehouse_stock WHERE warehouse_id = ? AND product_id = ?',
        [warehouseId, productId]
      );

      console.log(`✅ Product ${productId} removed from warehouse ${warehouseId}`);
      return true;
    } catch (error) {
      console.error('❌ Error removing product from warehouse:', error);
      throw error;
    }
  }

  /**
   * Get products not in warehouse (available to add)
   */
  static async getAvailableProducts(warehouseId, filters = {}) {
    try {
      let query = `
        SELECT 
          p.id,
          p.product_code as code,
          p.product_name as name,
          p.category,
          p.brand,
          p.unit_price,
          p.stock_quantity
        FROM products p
        WHERE p.is_active = 1
        AND p.id NOT IN (
          SELECT product_id 
          FROM warehouse_stock 
          WHERE warehouse_id = ?
        )
      `;
      
      const params = [warehouseId];

      if (filters.search) {
        query += ' AND (p.product_name LIKE ? OR p.product_code LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (filters.category) {
        query += ' AND p.category = ?';
        params.push(filters.category);
      }

      query += ' ORDER BY p.product_name ASC LIMIT 100';

      const [rows] = await db.query(query, params);
      return rows;
    } catch (error) {
      console.error('❌ Error fetching available products:', error);
      throw error;
    }
  }
}

module.exports = Warehouse;

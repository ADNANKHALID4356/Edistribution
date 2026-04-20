/**
 * Product Model
 * Handles all database operations for products
 */

const db = require('../config/database');

/**
 * Helper function to convert DECIMAL string values to numbers
 * MySQL returns DECIMAL as strings to preserve precision
 */
const convertProductNumbers = (product) => {
  if (!product) return product;
  
  return {
    ...product,
    unit_price: product.unit_price ? parseFloat(product.unit_price) : 0,
    carton_price: product.carton_price ? parseFloat(product.carton_price) : 0,
    purchase_price: product.purchase_price ? parseFloat(product.purchase_price) : 0,
    stock_quantity: product.stock_quantity ? parseFloat(product.stock_quantity) : 0,
    reorder_level: product.reorder_level ? parseFloat(product.reorder_level) : 0,
    reserved_stock: product.reserved_stock ? parseFloat(product.reserved_stock) : 0
  };
};

const Product = {
  /**
   * Get all products with pagination and filters - OPTIMIZED
   * Uses parallel queries and proper indexing
   */
  async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      category = '', 
      brand = '', 
      company_name = '',
      stock_level = '', 
      is_active = null,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    
    // Optimized query with proper index usage
    let query = `
      SELECT 
        p.*,
        s.supplier_name,
        s.supplier_code,
        s.phone AS supplier_phone,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.reorder_level THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    const countParams = [];
    
    // Build WHERE clause (shared for both queries)
    let whereClause = '';
    
    if (search) {
      whereClause += ` AND (p.product_name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (category) {
      whereClause += ` AND p.category = ?`;
      params.push(category);
      countParams.push(category);
    }
    
    if (brand) {
      whereClause += ` AND p.brand = ?`;
      params.push(brand);
      countParams.push(brand);
    }

    if (company_name) {
      whereClause += ` AND p.company_name = ?`;
      params.push(company_name);
      countParams.push(company_name);
    }
    
    // Stock level filtering
    if (stock_level) {
      if (stock_level === 'out_of_stock') {
        whereClause += ` AND p.stock_quantity = 0`;
      } else if (stock_level === 'low_stock') {
        whereClause += ` AND p.stock_quantity > 0 AND p.stock_quantity <= p.reorder_level`;
      } else if (stock_level === 'in_stock') {
        whereClause += ` AND p.stock_quantity > p.reorder_level`;
      }
    }
    
    if (is_active !== null) {
      whereClause += ` AND p.is_active = ?`;
      params.push(is_active);
      countParams.push(is_active);
    }
    
    // Add WHERE clause to main query
    query += whereClause;
    
    // Validate and sanitize ORDER BY
    const validOrderColumns = ['created_at', 'product_name', 'product_code', 'unit_price', 'stock_quantity'];
    const validOrderDirections = ['ASC', 'DESC'];
    const safeOrderBy = validOrderColumns.includes(orderBy) ? orderBy : 'created_at';
    const safeOrderDirection = validOrderDirections.includes(orderDirection.toUpperCase()) ? orderDirection.toUpperCase() : 'DESC';
    
    query += ` ORDER BY p.${safeOrderBy} ${safeOrderDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Optimized count query - no joins needed
    const countQuery = `SELECT COUNT(*) as total FROM products p WHERE 1=1${whereClause}`;
    
    // Execute both queries in parallel for better performance
    const [productsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);
    
    const [products] = productsResult;
    const [countRow] = countResult;
    
    // Convert DECIMAL strings to numbers
    const convertedProducts = products.map(convertProductNumbers);
    
    const total = countRow[0].total;
    const totalPages = Math.ceil(total / limit);
    
    return {
      products: convertedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  },

  /**
   * Get low stock products - OPTIMIZED
   */
  async findLowStock(limit = 20) {
    const query = `
      SELECT 
        p.*,
        s.supplier_name,
        (p.reorder_level - p.stock_quantity) as shortage_quantity
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.is_active = 1 
        AND p.stock_quantity <= p.reorder_level
      ORDER BY (p.reorder_level - p.stock_quantity) DESC
      LIMIT ?
    `;
    
    const [products] = await db.query(query, [limit]);
    return products.map(convertProductNumbers);
  },

  /**
   * Get categories with counts - OPTIMIZED
   */
  async getCategories() {
    const query = `
      SELECT 
        category,
        COUNT(*) as product_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
      FROM products
      WHERE category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY product_count DESC
    `;
    
    const [categories] = await db.query(query);
    return categories;
  },

  /**
   * Get brands with counts - OPTIMIZED
   */
  async getBrands() {
    const query = `
      SELECT 
        brand,
        COUNT(*) as product_count,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
      FROM products
      WHERE brand IS NOT NULL AND brand != ''
      GROUP BY brand
      ORDER BY product_count DESC
    `;
    
    const [brands] = await db.query(query);
    return brands;
  },

  // Continue with original methods...
  
  /**
   * Get all products with pagination and filters - continuation
   */
  async __continueWithOriginalMethod__() {
    // This is just for alignment
    let countQuery = `SELECT COUNT(*) as total FROM products p WHERE 1=1`;
    const countParams = [];
    
    if (search) {
      countQuery += ` AND (p.product_name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      countQuery += ` AND p.category = ?`;
      countParams.push(category);
    }
    if (brand) {
      countQuery += ` AND p.brand = ?`;
      countParams.push(brand);
    }
    // Stock level filtering for count query
    if (stock_level) {
      if (stock_level === 'out_of_stock') {
        countQuery += ` AND p.stock_quantity = 0`;
      } else if (stock_level === 'low_stock') {
        countQuery += ` AND p.stock_quantity > 0 AND p.stock_quantity <= p.reorder_level`;
      } else if (stock_level === 'in_stock') {
        countQuery += ` AND p.stock_quantity > p.reorder_level`;
      }
    }
    if (is_active !== null) {
      countQuery += ` AND p.is_active = ?`;
      countParams.push(is_active);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    
    return {
      products: convertedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  },

  /**
   * Get product by ID
   */
  async findById(id) {
    const [products] = await db.query(`
      SELECT 
        p.*,
        s.supplier_name,
        s.supplier_code,
        s.phone AS supplier_phone,
        s.email AS supplier_email,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.reorder_level THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
    `, [id]);
    
    return convertProductNumbers(products[0]);
  },

  /**
   * Get product by product code
   */
  async findByProductCode(productCode) {
    const [products] = await db.query('SELECT * FROM products WHERE product_code = ?', [productCode]);
    return convertProductNumbers(products[0]);
  },

  /**
   * Get product by barcode
   */
  async findByBarcode(barcode) {
    const [products] = await db.query('SELECT * FROM products WHERE barcode = ?', [barcode]);
    if (products.length === 0) return null;
    return convertProductNumbers(products[0]);
  },

  /**
   * Find product by exact name
   */
  async findByName(productName) {
    const [products] = await db.query('SELECT * FROM products WHERE LOWER(product_name) = LOWER(?)', [productName.trim()]);
    if (products.length === 0) return null;
    return convertProductNumbers(products[0]);
  },

  /**
   * Create new product
   */
  async create(productData) {
    const {
      product_code,
      product_name,
      category,
      brand,
      company_name,
      pack_size,
      unit_price,
      carton_price,
      pieces_per_carton,
      purchase_price,
      stock_quantity,
      reorder_level,
      supplier_id,
      barcode,
      is_active
    } = productData;
    
    const [result] = await db.query(`
      INSERT INTO products (
        product_code, product_name, category, brand, company_name, pack_size,
        unit_price, carton_price, pieces_per_carton, purchase_price,
        stock_quantity, reorder_level, supplier_id, barcode,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      product_code, product_name, category, brand, company_name || null, pack_size,
      unit_price, carton_price || 0, pieces_per_carton || 1, purchase_price || 0,
      stock_quantity || 0, reorder_level || 10, supplier_id || null, barcode || null,
      is_active !== false
    ]);
    
    return await this.findById(result.insertId);
  },

  /**
   * Update product
   */
  async update(id, productData) {
    const {
      product_name,
      category,
      brand,
      company_name,
      pack_size,
      unit_price,
      carton_price,
      pieces_per_carton,
      purchase_price,
      stock_quantity,
      reorder_level,
      supplier_id,
      barcode,
      is_active
    } = productData;
    
    await db.query(`
      UPDATE products SET
        product_name = ?,
        category = ?,
        brand = ?,
        company_name = ?,
        pack_size = ?,
        unit_price = ?,
        carton_price = ?,
        pieces_per_carton = ?,
        purchase_price = ?,
        stock_quantity = ?,
        reorder_level = ?,
        supplier_id = ?,
        barcode = ?,
        is_active = ?
      WHERE id = ?
    `, [
      product_name, category, brand, company_name || null, pack_size, unit_price,
      carton_price, pieces_per_carton, purchase_price, stock_quantity,
      reorder_level, supplier_id, barcode, is_active, id
    ]);
    
    return await this.findById(id);
  },

  /**
   * Update product stock quantity only
   */
  async updateStock(id, stock_quantity) {
    await db.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [stock_quantity, id]);
    return await this.findById(id);
  },

  /**
   * Soft delete product (set is_active = FALSE)
   */
  async softDelete(id) {
    await db.query('UPDATE products SET is_active = FALSE WHERE id = ?', [id]);
    return { success: true, message: 'Product deleted successfully' };
  },

  /**
   * Hard delete product (permanent)
   */
  async hardDelete(id) {
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    return { success: true, message: 'Product permanently deleted' };
  },

  /**
   * Get active products only
   */
  async findActive() {
    const [products] = await db.query(`
      SELECT 
        p.*,
        s.supplier_name,
        CASE 
          WHEN p.stock_quantity <= p.reorder_level THEN 'LOW_STOCK'
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.is_active = TRUE
      ORDER BY p.product_name ASC
    `);
    
    return products.map(convertProductNumbers);
  },

  /**
   * Get low stock products
   */
  async findLowStock() {
    const [products] = await db.query(`
      SELECT * FROM vw_low_stock_products
    `);
    
    return products.map(convertProductNumbers);
  },

  /**
   * Update stock quantity
   */
  async updateStock(id, quantity, movementType = 'ADJUSTMENT', referenceType = null, referenceId = null, notes = null, userId = null) {
    const product = await this.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    
    const previousStock = parseFloat(product.stock_quantity) || 0;
    const numericQuantity = parseFloat(quantity) || 0;
    const newStock = previousStock + numericQuantity;
    
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }
    
    // Update product stock
    await db.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [newStock, id]);
    
    // Log stock movement (column names aligned with production schema)
    await db.query(`
      INSERT INTO stock_movements (
        product_id, movement_type, quantity, stock_before, stock_after,
        reference_type, reference_id, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, movementType, numericQuantity, previousStock, newStock, referenceType, referenceId, notes, userId]);
    
    return await this.findById(id);
  },

  /**
   * Reserve stock for an order
   */
  async reserveStock(orderId, userId = null) {
    try {
      await db.query('CALL sp_reserve_stock_for_order(?, ?)', [orderId, userId]);
      return { success: true, message: 'Stock reserved successfully' };
    } catch (error) {
      console.error('Error reserving stock:', error);
      throw new Error(error.sqlMessage || error.message);
    }
  },

  /**
   * Release reserved stock (order cancelled/rejected)
   */
  async releaseReservedStock(orderId, userId = null) {
    try {
      await db.query('CALL sp_release_stock_for_order(?, ?)', [orderId, userId]);
      return { success: true, message: 'Reserved stock released successfully' };
    } catch (error) {
      console.error('Error releasing reserved stock:', error);
      throw new Error(error.sqlMessage || error.message);
    }
  },

  /**
   * Deduct stock for finalized order
   */
  async deductStock(orderId, userId = null) {
    try {
      await db.query('CALL sp_deduct_stock_for_order(?, ?)', [orderId, userId]);
      return { success: true, message: 'Stock deducted successfully' };
    } catch (error) {
      console.error('Error deducting stock:', error);
      throw new Error(error.sqlMessage || error.message);
    }
  },

  /**
   * Get available stock (total - reserved)
   */
  async getAvailableStock(productId) {
    const [result] = await db.query(`
      SELECT 
        stock_quantity,
        stock_quantity AS available_stock
      FROM products 
      WHERE id = ?
    `, [productId]);
    
    return result[0] || null;
  },

  /**
   * Check if sufficient stock is available for order items
   */
  async checkStockAvailability(orderItems) {
    const insufficientItems = [];
    
    for (const item of orderItems) {
      const stockInfo = await this.getAvailableStock(item.product_id);
      
      if (!stockInfo) {
        insufficientItems.push({
          product_id: item.product_id,
          error: 'Product not found'
        });
        continue;
      }
      
      if (stockInfo.available_stock < item.quantity) {
        insufficientItems.push({
          product_id: item.product_id,
          required: item.quantity,
          available: stockInfo.available_stock,
          total_stock: stockInfo.stock_quantity
        });
      }
    }
    
    return {
      available: insufficientItems.length === 0,
      insufficientItems
    };
  },

  /**
   * Get all categories (distinct)
   */
  async getCategories() {
    const [categories] = await db.query(`
      SELECT DISTINCT category 
      FROM products 
      WHERE category IS NOT NULL 
      ORDER BY category ASC
    `);
    
    return categories.map(c => c.category);
  },

  /**
   * Get all company names (distinct)
   */
  async getCompanies() {
    const [companies] = await db.query(`
      SELECT DISTINCT company_name 
      FROM products 
      WHERE company_name IS NOT NULL AND company_name != ''
      ORDER BY company_name ASC
    `);
    
    return companies.map(c => c.company_name);
  },

  /**
   * Get all brands (distinct)
   */
  async getBrands() {
    const [brands] = await db.query(`
      SELECT DISTINCT brand 
      FROM products 
      WHERE brand IS NOT NULL 
      ORDER BY brand ASC
    `);
    
    return brands.map(b => b.brand);
  },

  /**
   * Check if product code exists
   */
  async productCodeExists(productCode, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM products WHERE product_code = ?';
    const params = [productCode];
    
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    
    const [result] = await db.query(query, params);
    return result[0].count > 0;
  },

  /**
   * Generate unique product code safely by getting absolute max number
   */
  async generateProductCode() {
    // Cast PROD000X to unsigned int safely using SUBSTRING
    const [result] = await db.query(`
      SELECT MAX(CAST(SUBSTRING(product_code, 5) AS UNSIGNED)) as max_code 
      FROM products 
      WHERE product_code LIKE 'PROD%'
    `);
    const nextCodeNum = (result[0].max_code || 0) + 1;
    return `PROD${nextCodeNum.toString().padStart(6, '0')}`;
  },

  /**
   * Get warehouse stock breakdown for a product
   * Shows stock levels in each warehouse
   */
  async getWarehouseStock(productId) {
    try {
      const [rows] = await db.query(`
        SELECT 
          ws.warehouse_id,
          w.name as warehouse_name,
          w.code as warehouse_code,
          w.status as warehouse_status,
          ws.quantity,
          COALESCE(ws.reserved_quantity, 0) as reserved_quantity,
          ws.quantity - COALESCE(ws.reserved_quantity, 0) as available_quantity,
          COALESCE(ws.min_stock_level, 0) as min_stock_level,
          COALESCE(ws.max_stock_level, 0) as max_stock_level,
          ws.location_in_warehouse,
          ws.last_updated
        FROM warehouse_stock ws
        INNER JOIN warehouses w ON ws.warehouse_id = w.id
        WHERE ws.product_id = ?
        ORDER BY w.is_default DESC, w.name ASC
      `, [productId]);
      
      return rows;
    } catch (error) {
      console.error('❌ Error fetching warehouse stock for product:', error);
      return [];
    }
  },

  /**
   * Get products with warehouse stock summary for listing
   */
  async findAllWithWarehouseStock(options = {}) {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      category = '', 
      brand = '', 
      company_name = '',
      stock_level = '', 
      is_active = null,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;
    
    const offset = (page - 1) * limit;
    
    // Main query with warehouse stock aggregation
    let query = `
      SELECT 
        p.*,
        s.supplier_name,
        s.supplier_code,
        s.phone AS supplier_phone,
        CASE 
          WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_quantity <= p.reorder_level THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END AS stock_status,
        COALESCE((SELECT COUNT(*) FROM warehouse_stock ws WHERE ws.product_id = p.id AND ws.quantity > 0), 0) as warehouses_with_stock,
        COALESCE((SELECT SUM(ws.quantity) FROM warehouse_stock ws WHERE ws.product_id = p.id), 0) as total_warehouse_stock
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE 1=1
    `;
    
    const params = [];
    const countParams = [];
    
    // Build WHERE clause (shared for both queries)
    let whereClause = '';
    
    if (search) {
      whereClause += ` AND (p.product_name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (category) {
      whereClause += ` AND p.category = ?`;
      params.push(category);
      countParams.push(category);
    }
    
    if (brand) {
      whereClause += ` AND p.brand = ?`;
      params.push(brand);
      countParams.push(brand);
    }

    if (company_name) {
      whereClause += ` AND p.company_name = ?`;
      params.push(company_name);
      countParams.push(company_name);
    }
    
    // Stock level filtering
    if (stock_level) {
      if (stock_level === 'out_of_stock') {
        whereClause += ` AND p.stock_quantity = 0`;
      } else if (stock_level === 'low_stock') {
        whereClause += ` AND p.stock_quantity > 0 AND p.stock_quantity <= p.reorder_level`;
      } else if (stock_level === 'in_stock') {
        whereClause += ` AND p.stock_quantity > p.reorder_level`;
      }
    }
    
    if (is_active !== null) {
      whereClause += ` AND p.is_active = ?`;
      params.push(is_active);
      countParams.push(is_active);
    }
    
    // Add WHERE clause to main query
    query += whereClause;
    
    // Validate and sanitize ORDER BY
    const validOrderColumns = ['created_at', 'product_name', 'product_code', 'unit_price', 'stock_quantity'];
    const validOrderDirections = ['ASC', 'DESC'];
    const safeOrderBy = validOrderColumns.includes(orderBy) ? orderBy : 'created_at';
    const safeOrderDirection = validOrderDirections.includes(orderDirection.toUpperCase()) ? orderDirection.toUpperCase() : 'DESC';
    
    query += ` ORDER BY p.${safeOrderBy} ${safeOrderDirection} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    // Optimized count query - no joins needed
    const countQuery = `SELECT COUNT(*) as total FROM products p WHERE 1=1${whereClause}`;
    
    // Execute both queries in parallel for better performance
    const [productsResult, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);
    
    const [products] = productsResult;
    const [countRow] = countResult;
    
    // Convert DECIMAL strings to numbers
    const convertedProducts = products.map(convertProductNumbers);
    
    const total = countRow[0].total;
    const totalPages = Math.ceil(total / limit);
    
    return {
      products: convertedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
  }
};

module.exports = Product;

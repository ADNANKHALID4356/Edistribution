/**
 * Product Controller
 * Handles all business logic for product operations
 */

const Product = require('../models/Product');
const xlsx = require('xlsx');
const pdf = require('pdf-parse');
const fs = require('fs');

// @desc    Parse uploaded file (CSV, Excel, PDF) into structured data for preview & mapping
// @route   POST /api/desktop/products/upload-parse
// @access  Private (Admin only)
exports.uploadAndParseFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    
    let parsedData = [];
    let headers = [];

    if (fileExt === 'csv' || fileExt === 'xlsx' || fileExt === 'xls') {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      parsedData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
      
      if (parsedData.length > 0) {
        headers = Object.keys(parsedData[0]);
        // Reconstruct the first row which xlsx swallowed as headers
        const firstRow = {};
        headers.forEach(h => { firstRow[h] = h; });
        parsedData.unshift(firstRow);
      } else {
        // Empty file or single row
        const rawArray = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        if (rawArray.length > 0) {
           headers = rawArray[0].map(String);
           const firstRow = {};
           headers.forEach((h, i) => { firstRow[h] = rawArray[0][i]; });
           parsedData.push(firstRow);
        }
      }
    } else if (fileExt === 'pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      const rawLines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (rawLines.length > 0) {
        // Try to find the header row by looking for common keywords
        let headerIndex = 0;
        let delimiter = /\s{2,}|\t/; // Default to double whitespaces or tabs
        
        for (let i = 0; i < Math.min(rawLines.length, 10); i++) {
          const lLower = rawLines[i].toLowerCase();
          if (lLower.includes('product') || lLower.includes('name') || lLower.includes('price')) {
            headerIndex = i;
            break;
          }
        }
        
        const headerLine = rawLines[headerIndex];
        
        if (headerLine.includes(',')) {
          // If comma separated like a converted CSV
          delimiter = ',';
        } else if (headerLine.includes(';') ) {
          delimiter = ';';
        } else if (headerLine.includes('|')) {
          delimiter = '|';
        } 
        // fallback to \s{2,} or \t is implicitly handled by the default regex

        headers = headerLine.split(delimiter).map(h => h.trim()).filter(h => h);
        
        // If delimiter detection fails entirely and we just have 1 header, try single space
        if (headers.length <= 1 && headerLine.includes(' ')) {
           delimiter = ' ';
           headers = headerLine.split(delimiter).map(h => h.trim()).filter(h => h);
        }
        
        const headerRow = {};
        headers.forEach(h => { headerRow[h] = h; });
        
        parsedData = [headerRow].concat(rawLines.slice(headerIndex + 1).map(line => {
          const vals = line.split(delimiter).map(v => v.trim());
          const rowObj = {};
          headers.forEach((header, index) => {
            if (header) {
              rowObj[header] = vals[index] || "";
            }
          });
          return rowObj;
        }).filter(row => Object.keys(row).length > 0));
      }
    } else {
      fs.unlinkSync(filePath); // clean up
      return res.status(400).json({ success: false, message: 'Unsupported file format' });
    }

    // Clean up file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      data: {
        headers,
        rows: parsedData,
        rowCount: parsedData.length
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('File parse error:', error);
    res.status(500).json({
      success: false,
      message: 'Error parsing file',
      error: error.message
    });
  }
};

// @desc    Get all products
// @route   GET /api/desktop/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const { page, limit, search, category, brand, company_name, stock_level, is_active } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      category,
      brand,
      company_name,
      stock_level, // New: in_stock, low_stock, out_of_stock
      is_active: is_active !== undefined ? is_active === 'true' : null
    };
    
    const result = await Product.findAll(options);
    
    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/desktop/products/:id
// @access  Private
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
};

// @desc    Create new product
// @route   POST /api/desktop/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
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
      description,
      is_active
    } = req.body;
    
    // Validation
    if (!product_name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    if (!unit_price || unit_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid unit price is required'
      });
    }
    
    // Generate product code if not provided
    let finalProductCode = product_code;
    if (!finalProductCode) {
      finalProductCode = await Product.generateProductCode();
    } else {
      // Check if product code already exists
      const exists = await Product.productCodeExists(finalProductCode);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Product code already exists'
        });
      }
    }
    
    // Check if barcode already exists
    if (barcode) {
      const barcodeProduct = await Product.findByBarcode(barcode);
      if (barcodeProduct) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists for another product'
        });
      }
    }
    
    const productData = {
      product_code: finalProductCode,
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
      description,
      is_active,
      created_by: req.user.id
    };
    
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/desktop/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
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
      description,
      is_active
    } = req.body;
    
    // Validation
    if (!product_name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }
    
    if (!unit_price || unit_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid unit price is required'
      });
    }
    
    // Check if barcode already exists for another product
    if (barcode && barcode !== existingProduct.barcode) {
      const barcodeProduct = await Product.findByBarcode(barcode);
      if (barcodeProduct && barcodeProduct.id !== parseInt(id)) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists for another product'
        });
      }
    }
    
    const productData = {
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
      description,
      is_active
    };
    
    const product = await Product.update(id, productData);
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message
    });
  }
};

// Add stock endpoint that does not require full product fields
exports.addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { add_quantity } = req.body;

    if (add_quantity === undefined || add_quantity === null || Number.isNaN(Number(add_quantity))) {
      return res.status(400).json({
        success: false,
        message: 'add_quantity is required and must be a number'
      });
    }

    const delta = parseFloat(add_quantity);
    if (delta <= 0) {
      return res.status(400).json({
        success: false,
        message: 'add_quantity must be greater than 0'
      });
    }

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updatedProduct = await Product.updateStock(
      id,
      delta,
      'ADJUSTMENT',
      'MANUAL_STOCK_ADD',
      null,
      `Manual stock added via desktop by ${req.user?.username || 'unknown user'}`,
      req.user?.id || null
    );
    res.json({
      success: true,
      message: 'Product stock updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    console.error('Add stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding stock',
      error: error.message
    });
  }
};

// @desc    Delete product (soft delete)
// @route   DELETE /api/desktop/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    await Product.softDelete(id);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message
    });
  }
};

// @desc    Get active products
// @route   GET /api/shared/products/active
// @access  Private
exports.getActiveProducts = async (req, res) => {
  try {
    const products = await Product.findActive();
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get active products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active products',
      error: error.message
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/desktop/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.findLowStock();
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock products',
      error: error.message
    });
  }
};

// @desc    Get categories
// @route   GET /api/desktop/products/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.getCategories();
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// @desc    Get brands
// @route   GET /api/desktop/products/brands
// @access  Private
exports.getBrands = async (req, res) => {
  try {
    const brands = await Product.getBrands();
    
    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching brands',
      error: error.message
    });
  }
};

// @desc    Get companies
// @route   GET /api/desktop/products/companies
// @access  Private
exports.getCompanies = async (req, res) => {
  try {
    const companies = await Product.getCompanies();
    
    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching companies',
      error: error.message
    });
  }
};

// @desc    Bulk import products (CSV/Excel)
// @route   POST /api/desktop/products/bulk
// @access  Private (Admin only)
exports.bulkImportProducts = async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Products array is required'
      });
    }
    
    const results = {
      success: [],
      updated: [],
      errors: []
    };
    
    for (let i = 0; i < products.length; i++) {
      try {
        const productData = products[i];
        
        if (!productData.product_name) {
          results.errors.push({
            row: i + 1,
            message: 'Product name is required'
          });
          continue;
        }

        // Try to find product by name
        const existingProduct = await Product.findByName(productData.product_name);
        
        if (existingProduct) {
          // If the product was inactive, reactivate it
          if (existingProduct.is_active === 0 || existingProduct.is_active === false) {
            await Product.update(existingProduct.id, { ...existingProduct, is_active: 1 });
          }

          // Add stock if we already have it
          const stockToAdd = parseFloat(productData.stock_quantity) || 0;
          if (stockToAdd > 0) {
            await Product.updateStock(
              existingProduct.id, 
              stockToAdd, 
              'API_BULK_UPSERT', 
              'BULK_IMPORT', 
              null, 
              'Bulk import stock addition', 
              req.user ? req.user.id : null
            );
          }
          
          results.updated.push({
            row: i + 1,
            product_code: existingProduct.product_code,
            product_name: existingProduct.product_name,
            stock_added: stockToAdd
          });
          continue;
        }
        
        // Generate product code if not provided
        if (!productData.product_code) {
          productData.product_code = await Product.generateProductCode();
        }
        
        productData.created_by = req.user ? req.user.id : null;
        const product = await Product.create(productData);
        
        results.success.push({
          row: i + 1,
          product_code: product.product_code,
          product_name: product.product_name
        });
      } catch (error) {
        results.errors.push({
          row: i + 1,
          product_name: products[i] && products[i].product_name ? products[i].product_name : 'Unknown',
          message: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Successfully added ${results.success.length} new products, updated ${results.updated.length} existing products.`,
      data: results
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing products',
      error: error.message
    });
  }
};

// @desc    Get warehouse stock breakdown for a product
// @route   GET /api/desktop/products/:id/warehouse-stock
// @access  Private
exports.getProductWarehouseStock = async (req, res) => {
  try {
    const productId = req.params.id;
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const warehouseStock = await Product.getWarehouseStock(productId);
    
    // Calculate totals
    const totals = {
      totalWarehouses: warehouseStock.length,
      totalQuantity: warehouseStock.reduce((sum, ws) => sum + parseFloat(ws.quantity || 0), 0),
      totalReserved: warehouseStock.reduce((sum, ws) => sum + parseFloat(ws.reserved_quantity || 0), 0),
      totalAvailable: warehouseStock.reduce((sum, ws) => sum + parseFloat(ws.available_quantity || 0), 0)
    };
    
    res.json({
      success: true,
      data: {
        product: {
          id: product.id,
          product_code: product.product_code,
          product_name: product.product_name,
          global_stock: product.stock_quantity
        },
        warehouseStock,
        totals
      }
    });
  } catch (error) {
    console.error('Get product warehouse stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching warehouse stock',
      error: error.message
    });
  }
};

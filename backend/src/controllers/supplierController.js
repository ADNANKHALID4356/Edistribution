/**
 * Supplier Controller
 * Handles all business logic for supplier operations
 */

const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/desktop/suppliers
// @access  Private
exports.getSuppliers = async (req, res) => {
  try {
    const { page, limit, search, is_active } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      is_active: is_active !== undefined ? is_active === 'true' : null
    };
    
    const result = await Supplier.findAll(options);
    
    res.json({
      success: true,
      data: result.suppliers,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suppliers',
      error: error.message
    });
  }
};

// @desc    Get single supplier by ID
// @route   GET /api/desktop/suppliers/:id
// @access  Private
exports.getSupplierById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    res.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier',
      error: error.message
    });
  }
};

// @desc    Create new supplier
// @route   POST /api/desktop/suppliers
// @access  Private
exports.createSupplier = async (req, res) => {
  try {
    const {
      supplier_code,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      city,
      opening_balance,
      is_active
    } = req.body;
    
    // Validation
    if (!supplier_name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }
    
    // Generate supplier code if not provided
    let finalSupplierCode = supplier_code;
    if (!finalSupplierCode) {
      finalSupplierCode = await Supplier.generateSupplierCode();
    } else {
      // Check if supplier code already exists
      const exists = await Supplier.supplierCodeExists(finalSupplierCode);
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Supplier code already exists'
        });
      }
    }
    
    const supplierData = {
      supplier_code: finalSupplierCode,
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      city,
      opening_balance,
      is_active,
      created_by: req.user.id
    };
    
    const supplier = await Supplier.create(supplierData);
    
    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier',
      error: error.message
    });
  }
};

// @desc    Update supplier
// @route   PUT /api/desktop/suppliers/:id
// @access  Private
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if supplier exists
    const existingSupplier = await Supplier.findById(id);
    if (!existingSupplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    const {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      city,
      is_active
    } = req.body;
    
    // Validation
    if (!supplier_name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }
    
    const supplierData = {
      supplier_name,
      contact_person,
      phone,
      email,
      address,
      city,
      is_active
    };
    
    const supplier = await Supplier.update(id, supplierData);
    
    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier',
      error: error.message
    });
  }
};

// @desc    Delete supplier
// @route   DELETE /api/desktop/suppliers/:id
// @access  Private
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if supplier exists
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }
    
    await Supplier.delete(id);
    
    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Delete supplier error:', error);
    
    // Handle constraint errors
    if (error.message.includes('Cannot delete supplier')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error deleting supplier',
      error: error.message
    });
  }
};

// @desc    Get active suppliers
// @route   GET /api/shared/suppliers/active
// @access  Private
exports.getActiveSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findActive();
    
    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('Get active suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active suppliers',
      error: error.message
    });
  }
};

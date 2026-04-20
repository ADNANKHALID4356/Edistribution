/**
 * Salesman Controller
 * Sprint 4: Salesman Management System
 * Company: Ummahtechinnovations.com
 */

const Salesman = require('../models/Salesman');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Get all salesmen with pagination and filters
 */
exports.getAllSalesmen = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      search: req.query.search || '',
      city: req.query.city || '',
      is_active: req.query.is_active !== undefined ? parseInt(req.query.is_active) : null,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await Salesman.findAll(filters);

    res.json({
      success: true,
      data: result.salesmen,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching salesmen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salesmen',
      error: error.message
    });
  }
};

/**
 * Get single salesman by ID with assigned routes
 */
exports.getSalesmanById = async (req, res) => {
  try {
    const { id } = req.params;
    const salesman = await Salesman.findById(id);

    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    res.json({
      success: true,
      data: salesman
    });
  } catch (error) {
    console.error('Error fetching salesman:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch salesman',
      error: error.message
    });
  }
};

/**
 * Create a new salesman
 */
exports.createSalesman = async (req, res) => {
  try {
    const {
      salesman_code,
      full_name,
      phone,
      email,
      cnic,
      address,
      city,
      hire_date,
      monthly_target,
      commission_percentage,
      username,
      password
    } = req.body;

    // Validation
    if (!salesman_code || !full_name || !phone || !cnic || !city || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: salesman_code, full_name, phone, cnic, city, hire_date'
      });
    }

    // Validate username and password for login credentials
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required to create login credentials for salesman'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if salesman code already exists
    const codeExists = await Salesman.codeExists(salesman_code);
    if (codeExists) {
      return res.status(400).json({
        success: false,
        message: `Salesman code '${salesman_code}' already exists`
      });
    }

    // Check if CNIC already exists
    const cnicExists = await Salesman.cnicExists(cnic);
    if (cnicExists) {
      return res.status(400).json({
        success: false,
        message: 'CNIC already registered'
      });
    }

    // Check if username already exists
    const usernameExists = await User.usernameExists(username);
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: `Username '${username}' is already taken`
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: `Email '${email}' is already registered`
        });
      }
    }

    // Validate monthly_target and commission_percentage
    if (monthly_target !== undefined && (isNaN(monthly_target) || monthly_target < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monthly target amount'
      });
    }

    if (commission_percentage !== undefined && (isNaN(commission_percentage) || commission_percentage < 0 || commission_percentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Commission percentage must be between 0 and 100'
      });
    }

    // Step 1: Create user account for salesman
    console.log('🔐 Creating user account for salesman:', username);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const userId = await User.create({
      username: username,
      email: email || `${username}@salesman.ummahtechinnovations.com`,
      password: hashedPassword,
      full_name: full_name,
      phone: phone,
      role_id: 3 // Salesman role
    });

    console.log('✅ User account created with ID:', userId);

    // Step 2: Create salesman record linked to user account
    const salesmanData = {
      salesman_code,
      full_name,
      phone,
      email: email || null,
      cnic,
      address: address || null,
      city,
      hire_date,
      monthly_target: monthly_target || 0,
      commission_percentage: commission_percentage || 0,
      user_id: userId // Link to user account
    };

    const newSalesman = await Salesman.create(salesmanData);

    console.log('✅ Salesman created:', newSalesman.salesman_code);

    res.status(201).json({
      success: true,
      message: 'Salesman and login credentials created successfully',
      data: {
        ...newSalesman,
        login_credentials: {
          username: username,
          password: password, // Return password only once (admin should share with salesman)
          note: 'Please share these credentials securely with the salesman. Password cannot be retrieved later.'
        }
      }
    });
  } catch (error) {
    console.error('Error creating salesman:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salesman',
      error: error.message
    });
  }
};

/**
 * Update salesman details
 */
exports.updateSalesman = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if salesman exists
    const existingSalesman = await Salesman.findById(id);
    if (!existingSalesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // If updating CNIC, check if it already exists for another salesman
    if (updateData.cnic) {
      const cnicExists = await Salesman.cnicExists(updateData.cnic, id);
      if (cnicExists) {
        return res.status(400).json({
          success: false,
          message: 'CNIC already registered with another salesman'
        });
      }
    }

    // Validate monthly_target if provided
    if (updateData.monthly_target !== undefined && (isNaN(updateData.monthly_target) || updateData.monthly_target < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid monthly target amount'
      });
    }

    // Validate commission_percentage if provided
    if (updateData.commission_percentage !== undefined && 
        (isNaN(updateData.commission_percentage) || updateData.commission_percentage < 0 || updateData.commission_percentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Commission percentage must be between 0 and 100'
      });
    }

    const updatedSalesman = await Salesman.update(id, updateData);

    res.json({
      success: true,
      message: 'Salesman updated successfully',
      data: updatedSalesman
    });
  } catch (error) {
    console.error('Error updating salesman:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salesman',
      error: error.message
    });
  }
};

/**
 * Delete salesman (soft delete)
 */
exports.deleteSalesman = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Salesman.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    res.json({
      success: true,
      message: 'Salesman deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting salesman:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salesman',
      error: error.message
    });
  }
};

/**
 * Assign route to salesman
 */
exports.assignRoute = async (req, res) => {
  try {
    const { id: salesmanId } = req.params;
    const { route_id } = req.body;

    if (!route_id) {
      return res.status(400).json({
        success: false,
        message: 'Route ID is required'
      });
    }

    await Salesman.assignRoute(salesmanId, route_id);

    res.json({
      success: true,
      message: 'Route assigned successfully'
    });
  } catch (error) {
    console.error('Error assigning route:', error);
    
    if (error.message === 'Salesman not found' || error.message === 'Route not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assign route',
      error: error.message
    });
  }
};

/**
 * Unassign route from salesman
 */
exports.unassignRoute = async (req, res) => {
  try {
    const { route_id } = req.body;

    if (!route_id) {
      return res.status(400).json({
        success: false,
        message: 'Route ID is required'
      });
    }

    await Salesman.unassignRoute(route_id);

    res.json({
      success: true,
      message: 'Route unassigned successfully'
    });
  } catch (error) {
    console.error('Error unassigning route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign route',
      error: error.message
    });
  }
};

/**
 * Get salesman's assigned routes
 */
exports.getSalesmanRoutes = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if salesman exists
    const salesman = await Salesman.findById(id);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    const routes = await Salesman.getAssignedRoutes(id);

    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Error fetching salesman routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch routes',
      error: error.message
    });
  }
};

/**
 * Get salesman performance metrics
 */
exports.getSalesmanPerformance = async (req, res) => {
  try {
    const { id } = req.params;

    const performance = await Salesman.getPerformance(id);

    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error fetching salesman performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data',
      error: error.message
    });
  }
};

/**
 * Get all active salesmen (for dropdowns)
 */
exports.getActiveSalesmen = async (req, res) => {
  try {
    const salesmen = await Salesman.getActiveSalesmen();

    res.json({
      success: true,
      data: salesmen
    });
  } catch (error) {
    console.error('Error fetching active salesmen:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active salesmen',
      error: error.message
    });
  }
};

/**
 * Get salesmen summary (with routes count)
 */
exports.getSalesmenSummary = async (req, res) => {
  try {
    const summary = await Salesman.getSummary();

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching salesmen summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary',
      error: error.message
    });
  }
};

/**
 * Permanently delete salesman from database
 * This completely removes the salesman record (hard delete)
 * Should only be called after soft delete (is_active = 0)
 */
exports.permanentDeleteSalesman = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if salesman exists
    const salesman = await Salesman.findById(id);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Perform permanent deletion
    await Salesman.permanentDelete(id);

    res.json({
      success: true,
      message: `Salesman "${salesman.full_name}" has been permanently deleted from the database`
    });
  } catch (error) {
    console.error('Error permanently deleting salesman:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete salesman',
      error: error.message
    });
  }
};

/**
 * Get salesman credentials (username and password)
 * @route GET /api/desktop/salesmen/:id/credentials
 * @access Admin only
 */
exports.getCredentials = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if salesman exists
    const salesman = await Salesman.findById(id);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Check if salesman has user account
    if (!salesman.user_id) {
      return res.status(404).json({
        success: false,
        message: 'No login credentials found for this salesman'
      });
    }

    // Get user credentials
    const user = await User.findByIdWithPassword(salesman.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Check if password is hashed (bcrypt hashes are 60 chars)
    const isPasswordHashed = user.password && user.password.length >= 50;

    res.json({
      success: true,
      data: {
        salesman_id: salesman.id,
        salesman_code: salesman.salesman_code,
        salesman_name: salesman.full_name,
        username: user.username,
        email: user.email,
        password: isPasswordHashed ? null : user.password, // Only return if plain text
        is_password_hashed: isPasswordHashed,
        message: isPasswordHashed 
          ? 'Password is encrypted and cannot be retrieved. Use "Reset Password" option instead.'
          : 'Password retrieved successfully. Please handle with care.'
      }
    });
  } catch (error) {
    console.error('Error getting credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve credentials',
      error: error.message
    });
  }
};

/**
 * Reset salesman password
 * @route POST /api/desktop/salesmen/:id/reset-password
 * @access Admin only
 */
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    // Validate new password
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Check if salesman exists
    const salesman = await Salesman.findById(id);
    if (!salesman) {
      return res.status(404).json({
        success: false,
        message: 'Salesman not found'
      });
    }

    // Check if salesman has user account
    if (!salesman.user_id) {
      return res.status(404).json({
        success: false,
        message: 'No user account found for this salesman'
      });
    }

    // Get user
    const user = await User.findById(salesman.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await User.updatePassword(salesman.user_id, hashedPassword);

    console.log(`✅ Password reset for salesman: ${salesman.salesman_code} (${salesman.full_name})`);

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        salesman_id: salesman.id,
        salesman_code: salesman.salesman_code,
        salesman_name: salesman.full_name,
        username: user.username,
        new_password: new_password, // Return new password only once
        note: 'Please share these credentials securely with the salesman. This password cannot be retrieved later.'
      }
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

/**
 * Generate random password
 * Helper function for password reset
 */
function generateRandomPassword(length = 8) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Export the helper function for use in other parts of the application
exports.generateRandomPassword = generateRandomPassword;

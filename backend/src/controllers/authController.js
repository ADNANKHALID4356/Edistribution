const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Session = require('../models/Session');
const { generateToken } = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (but should be Admin only in production)
exports.register = async (req, res) => {
  try {
    const { username, email, password, full_name, phone, role_id } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email exists
    if (await User.emailExists(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if username exists
    if (await User.usernameExists(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const userId = await User.create({
      username,
      email,
      password: hashedPassword,
      full_name: full_name || username,
      phone: phone || null,
      role_id: role_id || 3 // Default to Salesman role
    });

    // Fetch created user
    const user = await User.findById(userId);

    // Generate token
    const token = generateToken(user.id, user.username, user.role_name);

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Save session
    await Session.create({
      user_id: user.id,
      token: token,
      device_info: req.headers['user-agent'] || 'Unknown',
      ip_address: req.ip || req.connection.remoteAddress,
      expires_at: expiresAt
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role_name
        },
        token: token
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  console.log('\n🔐 [BACKEND LOGIN] ========== Login Request Received ==========');
  
  try {
    const { username, password } = req.body;
    
    console.log('🔐 [BACKEND LOGIN] Request body:', { username, password: password ? '***' + password.slice(-2) : 'empty' });
    console.log('🔐 [BACKEND LOGIN] IP:', req.ip || req.connection.remoteAddress);
    console.log('🔐 [BACKEND LOGIN] User-Agent:', req.headers['user-agent']);

    // Validation
    console.log('🔐 [BACKEND LOGIN] Validating credentials...');
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find user (check both username and email)
    console.log('🔐 [BACKEND LOGIN] Finding user by username:', username);
    let user = await User.findByUsername(username);
    console.log('🔐 [BACKEND LOGIN] User found by username:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('🔐 [BACKEND LOGIN] Trying to find by email:', username);
      user = await User.findByEmail(username);
      console.log('🔐 [BACKEND LOGIN] User found by email:', user ? 'YES' : 'NO');
    }

    if (!user) {
      console.log('❌ [BACKEND LOGIN] User not found in database');
      console.log('🔐 [BACKEND LOGIN] ========== Login Failed ==========\n');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('🔐 [BACKEND LOGIN] User details:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
      salesman_id: user.salesman_id,
      is_active: user.is_active
    });
    
    // Check if user is active
    console.log('🔐 [BACKEND LOGIN] Checking if user is active...');
    if (!user.is_active) {
      console.log('❌ [BACKEND LOGIN] User account is deactivated');
      console.log('🔐 [BACKEND LOGIN] ========== Login Failed ==========\n');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    console.log('🔐 [BACKEND LOGIN] Verifying password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 [BACKEND LOGIN] Password valid:', isPasswordValid ? 'YES' : 'NO');
    
    if (!isPasswordValid) {
      console.log('❌ [BACKEND LOGIN] Invalid password');
      console.log('🔐 [BACKEND LOGIN] ========== Login Failed ==========\n');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user.id, user.username, user.role_name);

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Save session
    await Session.create({
      user_id: user.id,
      token: token,
      device_info: req.headers['user-agent'] || 'Unknown',
      ip_address: req.ip || req.connection.remoteAddress,
      expires_at: expiresAt
    });

    console.log('✅ [BACKEND LOGIN] Login successful!');
    console.log('🔐 [BACKEND LOGIN] Returning user data and token');
    console.log('🔐 [BACKEND LOGIN] ========== Login Complete ==========\n');
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          role_id: user.role_id,
          role_name: user.role_name,
          role: user.role_name, // Keep for backward compatibility
          permissions: user.permissions,
          salesman_id: user.salesman_id || null // Include salesman_id if exists
        },
        token: token
      }
    });

  } catch (error) {
    console.error('❌ [BACKEND LOGIN] Exception occurred:', error.message);
    console.error('❌ [BACKEND LOGIN] Stack trace:', error.stack);
    console.log('🔐 [BACKEND LOGIN] ========== Login Error ==========\n');
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      // Delete session
      await Session.delete(token);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role_name,
        permissions: user.permissions,
        last_login: user.last_login,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

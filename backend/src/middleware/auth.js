const { verifyToken } = require('../utils/generateToken');
const User = require('../models/User');
const Session = require('../models/Session');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  console.log('\n🔐 AUTH MIDDLEWARE - Checking authentication...');
  console.log(`📍 Route: ${req.method} ${req.originalUrl}`);
  
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log(`✅ Token found: ${token.substring(0, 20)}...`);
    } else {
      console.log('❌ No Authorization header found');
      console.log('Headers:', Object.keys(req.headers));
    }

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login.'
      });
    }

    // Verify token
    console.log('🔍 Verifying token...');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log('❌ Token verification failed');
      console.log('⚠️  JWT_SECRET may have changed or token is invalid');
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token. Please login again.'
      });
    }
    console.log(`✅ Token verified for user ID: ${decoded.id}`);

    // Skip session check for dashboard stats (performance optimization)
    const skipSessionCheck = req.originalUrl.includes('/dashboard/stats');
    
    if (!skipSessionCheck) {
      // Check if session exists
      console.log('🔍 Checking session...');
      const session = await Session.findByToken(token);
      if (!session) {
        console.log('❌ Session not found in database');
        console.log('⚠️  This could mean:');
        console.log('   1. User logged in before sessions were implemented');
        console.log('   2. Session was deleted');
        console.log('   3. Token is from a different environment');
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      }
      console.log(`✅ Session found for user ${session.user_id}`);
    } else {
      console.log('⏭️ Skipping session check for dashboard stats');
    }

    // Get user from database
    console.log('🔍 Fetching user from database...');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log(`❌ User not found with ID: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    console.log(`✅ User found: ${user.username} (Role: ${user.role_name})`);

    if (!user.is_active) {
      console.log('❌ User account is deactivated');
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Add user to request object
    req.user = user;
    console.log('✅ Authentication successful, proceeding to route handler...\n');
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    console.error('Stack:', error.stack);
    res.status(401).json({
      success: false,
      message: 'Not authorized',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role_name)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role_name}' is not authorized to access this route`
      });
    }

    next();
  };
};

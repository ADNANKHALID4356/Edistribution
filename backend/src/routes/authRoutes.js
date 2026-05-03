const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout, 
  getProfile 
} = require('../controllers/authController');
const { protect, authorize, ROLES } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Restricted user creation route
router.post('/register', protect, authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER), register);

// Protected routes
router.post('/logout', protect, logout);
router.get('/profile', protect, getProfile);

module.exports = router;

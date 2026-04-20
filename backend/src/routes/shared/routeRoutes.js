const express = require('express');
const router = express.Router();
const routeController = require('../../controllers/routeController');
const { protect } = require('../../middleware/auth');

// Get active routes (for dropdowns) - requires authentication
router.get('/active', protect, routeController.getActiveRoutes);

module.exports = router;

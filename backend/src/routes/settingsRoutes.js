// Settings Routes
// Purpose: API routes for company settings

const express = require('express');
const router = express.Router();
const { 
  getCompanySettings,
  updateCompanySettings,
  getInvoiceInfo
} = require('../controllers/settingsController');
const { protect, authorize, ROLES } = require('../middleware/auth');

// All settings routes are protected (require authentication)
router.get('/company', protect, authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER), getCompanySettings);
router.put('/company', protect, authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER), updateCompanySettings);
router.get('/company/invoice-info', protect, authorize(ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.MANAGER), getInvoiceInfo);

module.exports = router;

// Settings Routes
// Purpose: API routes for company settings

const express = require('express');
const router = express.Router();
const { 
  getCompanySettings,
  updateCompanySettings,
  getInvoiceInfo
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

// All settings routes are protected (require authentication)
router.get('/company', protect, getCompanySettings);
router.put('/company', protect, updateCompanySettings);
router.get('/company/invoice-info', protect, getInvoiceInfo);

module.exports = router;

// Company Settings Controller
// Purpose: Handle company configuration API requests

const CompanySettings = require('../models/CompanySettings');

/**
 * GET /api/settings/company
 * Get current company settings
 */
exports.getCompanySettings = async (req, res) => {
  try {
    const settings = await CompanySettings.getSettings();
    console.log('📤 Sending company settings to frontend:', settings);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('❌ Error in getCompanySettings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch company settings',
      error: error.message
    });
  }
};

/**
 * PUT /api/settings/company
 * Update company settings
 */
exports.updateCompanySettings = async (req, res) => {
  try {
    const settingsData = req.body;
    const userId = req.user?.id || null; // Get user ID from auth middleware

    // Validate required fields
    if (!settingsData.company_name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    const updatedSettings = await CompanySettings.updateSettings(settingsData, userId);

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: updatedSettings
    });
  } catch (error) {
    console.error('❌ Error in updateCompanySettings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company settings',
      error: error.message
    });
  }
};

/**
 * GET /api/settings/company/invoice-info
 * Get company info formatted for invoices
 */
exports.getInvoiceInfo = async (req, res) => {
  try {
    const invoiceInfo = await CompanySettings.getInvoiceInfo();
    
    res.json({
      success: true,
      data: invoiceInfo
    });
  } catch (error) {
    console.error('❌ Error in getInvoiceInfo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoice info',
      error: error.message
    });
  }
};

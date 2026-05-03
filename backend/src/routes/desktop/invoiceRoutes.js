/**
 * Desktop Invoice Routes
 * Sprint 7: Invoice & Bill Management
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../../controllers/invoiceController');
const { protect, authorize, ROLES } = require('../../middleware/auth');

// ========================================
// IMPORTANT: Specific routes MUST come before generic :id routes
// ========================================
router.use(protect);
const INVOICE_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER];

// Get invoice statistics
router.get('/statistics', authorize(...INVOICE_ROLES), invoiceController.getInvoiceStatistics);

// Bulk delete cancelled invoices (MUST be before /:id routes)
router.delete('/bulk-delete', authorize(...INVOICE_ROLES), invoiceController.bulkDeleteInvoices);

// Get invoices available for delivery (no or partial challans)
router.get('/available-for-delivery', authorize(...INVOICE_ROLES), invoiceController.getInvoicesAvailableForDelivery);

// Get unpaid invoices
router.get('/unpaid', authorize(...INVOICE_ROLES), invoiceController.getUnpaidInvoices);

// Get invoices by shop
router.get('/by-shop/:shopId', authorize(...INVOICE_ROLES), invoiceController.getInvoicesByShop);

// Get all invoices with filters and pagination
router.get('/', authorize(...INVOICE_ROLES), invoiceController.getAllInvoices);

// Record payment for invoice (MUST be before /:id routes)
router.put('/:id/payment', authorize(...INVOICE_ROLES), invoiceController.recordPayment);

// Get invoice by ID
router.get('/:id', authorize(...INVOICE_ROLES), invoiceController.getInvoiceById);

// Create new invoice
router.post('/', authorize(...INVOICE_ROLES), invoiceController.createInvoice);

// Update invoice (MUST be after specific PUT routes)
router.put('/:id', authorize(...INVOICE_ROLES), invoiceController.updateInvoice);

// Delete invoice (soft delete - cancel)
router.delete('/:id', authorize(...INVOICE_ROLES), invoiceController.deleteInvoice);

module.exports = router;

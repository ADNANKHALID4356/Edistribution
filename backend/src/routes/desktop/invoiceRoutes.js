/**
 * Desktop Invoice Routes
 * Sprint 7: Invoice & Bill Management
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../../controllers/invoiceController');

// ========================================
// IMPORTANT: Specific routes MUST come before generic :id routes
// ========================================

// Get invoice statistics
router.get('/statistics', invoiceController.getInvoiceStatistics);

// Bulk delete cancelled invoices (MUST be before /:id routes)
router.delete('/bulk-delete', invoiceController.bulkDeleteInvoices);

// Get invoices available for delivery (no or partial challans)
router.get('/available-for-delivery', invoiceController.getInvoicesAvailableForDelivery);

// Get unpaid invoices
router.get('/unpaid', invoiceController.getUnpaidInvoices);

// Get invoices by shop
router.get('/by-shop/:shopId', invoiceController.getInvoicesByShop);

// Get all invoices with filters and pagination
router.get('/', invoiceController.getAllInvoices);

// Record payment for invoice (MUST be before /:id routes)
router.put('/:id/payment', invoiceController.recordPayment);

// Get invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Create new invoice
router.post('/', invoiceController.createInvoice);

// Update invoice (MUST be after specific PUT routes)
router.put('/:id', invoiceController.updateInvoice);

// Delete invoice (soft delete - cancel)
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;

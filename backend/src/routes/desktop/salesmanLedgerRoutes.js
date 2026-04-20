/**
 * Salesman Ledger Routes
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const salesmanLedgerController = require('../../controllers/salesmanLedgerController');

// Create a new ledger entry (salary/payment)
router.post('/', protect, salesmanLedgerController.createEntry);

// Get ledger entries for a salesman
router.get('/salesman/:id', protect, salesmanLedgerController.getSalesmanLedger);

// Get salary summary for a salesman
router.get('/salesman/:id/summary', protect, salesmanLedgerController.getSalarySummary);

// Delete a ledger entry
router.delete('/:id', protect, salesmanLedgerController.deleteEntry);

module.exports = router;

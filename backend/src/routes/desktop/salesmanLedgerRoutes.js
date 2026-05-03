/**
 * Salesman Ledger Routes
 */

const express = require('express');
const router = express.Router();
const { protect, authorize, ROLES } = require('../../middleware/auth');
const salesmanLedgerController = require('../../controllers/salesmanLedgerController');
const SALESMAN_LEDGER_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.ACCOUNTANT];

// Create a new ledger entry (salary/payment)
router.post('/', protect, authorize(...SALESMAN_LEDGER_ROLES), salesmanLedgerController.createEntry);

// Get ledger entries for a salesman
router.get('/salesman/:id', protect, authorize(...SALESMAN_LEDGER_ROLES), salesmanLedgerController.getSalesmanLedger);

// Get salary summary for a salesman
router.get('/salesman/:id/summary', protect, authorize(...SALESMAN_LEDGER_ROLES), salesmanLedgerController.getSalarySummary);

// Delete a ledger entry
router.delete('/:id', protect, authorize(...SALESMAN_LEDGER_ROLES), salesmanLedgerController.deleteEntry);

module.exports = router;

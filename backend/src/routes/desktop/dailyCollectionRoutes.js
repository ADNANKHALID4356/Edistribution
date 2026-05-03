/**
 * Daily Collection Routes
 * Base path: /api/desktop/daily-collections
 */
const express = require('express');
const router = express.Router();
const { protect, authorize, ROLES } = require('../../middleware/auth');
const controller = require('../../controllers/dailyCollectionController');
const FINANCE_ROLES = [ROLES.ADMIN, ROLES.SENIOR_MANAGER, ROLES.ACCOUNTANT];

// All routes require authentication
router.use(protect);

// Get today's summary
router.get('/today', authorize(...FINANCE_ROLES), controller.getTodaySummary);

// Get daily summary (aggregated)
router.get('/summary', authorize(...FINANCE_ROLES), controller.getDailySummary);

// CRUD
router.get('/', authorize(...FINANCE_ROLES), controller.getAllCollections);
router.post('/', authorize(...FINANCE_ROLES), controller.createCollection);
router.get('/:id', authorize(...FINANCE_ROLES), controller.getCollectionById);
router.put('/:id', authorize(...FINANCE_ROLES), controller.updateCollection);
router.delete('/:id', authorize(...FINANCE_ROLES), controller.deleteCollection);

module.exports = router;

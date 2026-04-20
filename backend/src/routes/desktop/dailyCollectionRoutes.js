/**
 * Daily Collection Routes
 * Base path: /api/desktop/daily-collections
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../../middleware/auth');
const controller = require('../../controllers/dailyCollectionController');

// All routes require authentication
router.use(protect);

// Get today's summary
router.get('/today', authorize('Admin', 'Manager'), controller.getTodaySummary);

// Get daily summary (aggregated)
router.get('/summary', authorize('Admin', 'Manager'), controller.getDailySummary);

// CRUD
router.get('/', authorize('Admin', 'Manager'), controller.getAllCollections);
router.post('/', authorize('Admin', 'Manager'), controller.createCollection);
router.get('/:id', authorize('Admin', 'Manager'), controller.getCollectionById);
router.put('/:id', authorize('Admin', 'Manager'), controller.updateCollection);
router.delete('/:id', authorize('Admin'), controller.deleteCollection);

module.exports = router;

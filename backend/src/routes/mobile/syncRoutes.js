/**
 * Mobile Sync Routes
 * Sprint 9: Mobile Order Syncing - Part 1
 * Company: Ummahtechinnovations.com
 */

const express = require('express');
const router = express.Router();
const syncController = require('../../controllers/syncController');
const { protect } = require('../../middleware/auth');

// Rate limiting for sync endpoints to prevent abuse
const rateLimit = require('express-rate-limit');
const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many sync requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/mobile/sync/orders
 * @desc    Upload orders from mobile device in bulk (max 50 orders)
 * @access  Private (requires authentication)
 * @body    { salesman_id, device_info, orders: [] }
 */
router.post('/orders', protect, syncLimiter, syncController.syncOrders);

/**
 * @route   GET /api/mobile/sync/products
 * @desc    Get products with incremental sync support
 * @access  Private
 * @query   last_sync (optional) - ISO 8601 timestamp
 * @example GET /api/mobile/sync/products?last_sync=2025-01-01T00:00:00Z
 */
router.get('/products', protect, syncLimiter, syncController.getProducts);

/**
 * @route   GET /api/mobile/sync/shops
 * @desc    Get shops assigned to salesman with incremental sync
 * @access  Private
 * @query   salesman_id (required), last_sync (optional)
 * @example GET /api/mobile/sync/shops?salesman_id=1&last_sync=2025-01-01T00:00:00Z
 */
router.get('/shops', protect, syncLimiter, syncController.getShops);

/**
 * @route   GET /api/mobile/sync/routes
 * @desc    Get routes assigned to salesman with incremental sync
 * @access  Private
 * @query   salesman_id (required), last_sync (optional)
 * @example GET /api/mobile/sync/routes?salesman_id=1&last_sync=2025-01-01T00:00:00Z
 */
router.get('/routes', protect, syncLimiter, syncController.getRoutes);

/**
 * @route   POST /api/mobile/sync/status
 * @desc    Log sync status from mobile device (for monitoring)
 * @access  Private
 * @body    { salesman_id, entity_type, action, status, records_count, error_message, device_info }
 */
router.post('/status', protect, syncLimiter, syncController.logSyncStatus);

/**
 * @route   GET /api/mobile/sync/statistics/:salesman_id
 * @desc    Get sync statistics and recent logs for a salesman
 * @access  Private
 * @query   days (optional, default 7) - number of days to retrieve
 * @example GET /api/mobile/sync/statistics/1?days=30
 */
router.get('/statistics/:salesman_id', protect, syncLimiter, syncController.getSyncStatistics);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { readLimiter } = require('../middleware/rateLimiter');
const transactionController = require('../controllers/transactionController');

// Protected routes - require authentication and rate limiting
router.get('/', authenticate, readLimiter, transactionController.getUserTransactions);
router.get('/stats', authenticate, readLimiter, transactionController.getUserTransactionStats);
router.get('/group/:groupId', authenticate, readLimiter, transactionController.getGroupTransactions);

module.exports = router;

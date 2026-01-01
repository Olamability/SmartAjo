const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// Protected routes - require authentication
router.get('/', authenticate, transactionController.getUserTransactions);
router.get('/stats', authenticate, transactionController.getUserTransactionStats);
router.get('/group/:groupId', authenticate, transactionController.getGroupTransactions);

module.exports = router;

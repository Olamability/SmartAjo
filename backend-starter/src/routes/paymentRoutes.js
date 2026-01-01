const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

// Protected routes - require authentication
router.post('/initialize', authenticate, paymentController.initializePayment);
router.get('/verify/:reference', authenticate, paymentController.verifyPayment);

// Webhook route - no authentication (verified by signature)
router.post('/webhooks/paystack', paymentController.handlePaystackWebhook);

module.exports = router;

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { paymentLimiter, readLimiter } = require('../middleware/rateLimiter');
const paymentController = require('../controllers/paymentController');

// Protected routes - require authentication and rate limiting
router.post('/initialize', authenticate, paymentLimiter, paymentController.initializePayment);
router.get('/verify/:reference', authenticate, readLimiter, paymentController.verifyPayment);

// Webhook route - no authentication (verified by signature), but rate limited
router.post('/webhooks/paystack', paymentLimiter, paymentController.handlePaystackWebhook);

module.exports = router;

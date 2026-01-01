const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// TODO: Implement payment controller
// const paymentController = require('../controllers/paymentController');

router.post('/initialize', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Payment initialization endpoint not yet implemented',
    note: 'Please implement paymentController.initializePayment'
  });
});

router.get('/verify/:reference', authenticate, (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Payment verification endpoint not yet implemented',
    note: 'Please implement paymentController.verifyPayment'
  });
});

router.post('/webhooks/paystack', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Paystack webhook endpoint not yet implemented',
    note: 'Please implement paymentController.handlePaystackWebhook'
  });
});

module.exports = router;

const pool = require('../config/database');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Payment Controller - Paystack Integration
 * Handles payment initialization, verification, and webhooks
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize a payment transaction
async function initializePayment(req, res) {
  try {
    const {
      amount,
      groupId,
      type, // 'contribution', 'security_deposit', 'penalty'
      metadata
    } = req.body;

    const userId = req.userId;

    // Validate input
    if (!amount || !groupId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, groupId, type',
        code: 'VAL_001'
      });
    }

    // Validate payment type
    const validTypes = ['contribution', 'security_deposit', 'penalty'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment type',
        code: 'VAL_001'
      });
    }

    // Get user details
    const userResult = await pool.query(
      'SELECT email, full_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        code: 'USER_001'
      });
    }

    const user = userResult.rows[0];

    // Get group details
    const groupResult = await pool.query(
      'SELECT name FROM groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_001'
      });
    }

    const group = groupResult.rows[0];

    // Generate unique reference
    const reference = `ajo_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    await pool.query(
      `INSERT INTO transactions (
        user_id, group_id, type, amount, status, payment_reference, 
        payment_method, description, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        groupId,
        type,
        amount,
        'pending',
        reference,
        'paystack',
        `${type.replace('_', ' ')} for ${group.name}`,
        JSON.stringify(metadata || {})
      ]
    );

    // Initialize payment with Paystack
    try {
      const paystackResponse = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: user.email,
          amount: Math.round(amount * 100), // Convert to kobo (smallest currency unit)
          reference,
          currency: 'NGN',
          metadata: {
            userId,
            groupId,
            type,
            fullName: user.full_name,
            groupName: group.name,
            ...metadata
          },
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/callback`
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (paystackResponse.data.status) {
        res.json({
          success: true,
          data: {
            reference,
            authorizationUrl: paystackResponse.data.data.authorization_url,
            accessCode: paystackResponse.data.data.access_code
          },
          message: 'Payment initialized successfully'
        });
      } else {
        // Update transaction status to failed
        await pool.query(
          `UPDATE transactions SET status = 'failed' WHERE payment_reference = $1`,
          [reference]
        );

        res.status(500).json({
          success: false,
          error: 'Failed to initialize payment with Paystack',
          details: paystackResponse.data.message
        });
      }
    } catch (paystackError) {
      console.error('Paystack initialization error:', paystackError.response?.data || paystackError.message);
      
      // Update transaction status to failed
      await pool.query(
        `UPDATE transactions SET status = 'failed' WHERE payment_reference = $1`,
        [reference]
      );

      res.status(500).json({
        success: false,
        error: 'Failed to initialize payment',
        details: paystackError.response?.data?.message || 'Paystack service unavailable'
      });
    }
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize payment'
    });
  }
}

// Verify payment transaction
async function verifyPayment(req, res) {
  try {
    const { reference } = req.params;
    const userId = req.userId;

    // Get transaction from database
    const transactionResult = await pool.query(
      `SELECT * FROM transactions WHERE payment_reference = $1 AND user_id = $2`,
      [reference, userId]
    );

    if (transactionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        code: 'TRANSACTION_001'
      });
    }

    const transaction = transactionResult.rows[0];

    // If already verified, return the status
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        data: {
          reference: transaction.payment_reference,
          amount: parseFloat(transaction.amount),
          type: transaction.type,
          status: transaction.status,
          verifiedAt: transaction.updated_at
        },
        message: 'Payment already verified'
      });
    }

    // Verify with Paystack
    try {
      const paystackResponse = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
          }
        }
      );

      if (paystackResponse.data.status && paystackResponse.data.data.status === 'success') {
        const paystackData = paystackResponse.data.data;

        // Update transaction status
        await pool.query(
          `UPDATE transactions 
           SET status = 'completed', updated_at = CURRENT_TIMESTAMP
           WHERE payment_reference = $1`,
          [reference]
        );

        // Handle post-payment actions based on transaction type
        await handlePostPaymentActions(transaction);

        res.json({
          success: true,
          data: {
            reference: transaction.payment_reference,
            amount: parseFloat(transaction.amount),
            type: transaction.type,
            status: 'completed',
            paidAt: paystackData.paid_at,
            channel: paystackData.channel
          },
          message: 'Payment verified successfully'
        });
      } else {
        // Update transaction status to failed
        await pool.query(
          `UPDATE transactions SET status = 'failed' WHERE payment_reference = $1`,
          [reference]
        );

        res.status(400).json({
          success: false,
          error: 'Payment verification failed',
          code: 'PAYMENT_001'
        });
      }
    } catch (paystackError) {
      console.error('Paystack verification error:', paystackError.response?.data || paystackError.message);

      res.status(500).json({
        success: false,
        error: 'Failed to verify payment',
        details: paystackError.response?.data?.message || 'Paystack service unavailable'
      });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify payment'
    });
  }
}

// Handle Paystack webhook events
async function handlePaystackWebhook(req, res) {
  try {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const event = req.body;

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      case 'transfer.success':
        await handleTransferSuccess(event.data);
        break;
      case 'transfer.failed':
        await handleTransferFailed(event.data);
        break;
      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook'
    });
  }
}

// Helper function to handle post-payment actions
async function handlePostPaymentActions(transaction) {
  try {
    const { type, group_id, user_id } = transaction;

    if (type === 'security_deposit') {
      // Update group member's security deposit status
      await pool.query(
        `UPDATE group_members 
         SET security_deposit_paid = true,
             security_deposit_amount = $1
         WHERE group_id = $2 AND user_id = $3`,
        [transaction.amount, group_id, user_id]
      );
    } else if (type === 'contribution') {
      // Mark contribution as paid (this would link to a contributions table)
      // For now, we just record the transaction
      console.log(`Contribution payment recorded for user ${user_id} in group ${group_id}`);
    }
  } catch (error) {
    console.error('Post-payment action error:', error);
  }
}

// Helper function to handle successful charges
async function handleChargeSuccess(data) {
  try {
    const reference = data.reference;

    await pool.query(
      `UPDATE transactions 
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE payment_reference = $1 AND status = 'pending'`,
      [reference]
    );

    // Get transaction details for post-payment actions
    const result = await pool.query(
      `SELECT * FROM transactions WHERE payment_reference = $1`,
      [reference]
    );

    if (result.rows.length > 0) {
      await handlePostPaymentActions(result.rows[0]);
    }

    console.log(`Charge successful for reference: ${reference}`);
  } catch (error) {
    console.error('Handle charge success error:', error);
  }
}

// Helper function to handle failed charges
async function handleChargeFailed(data) {
  try {
    const reference = data.reference;

    await pool.query(
      `UPDATE transactions 
       SET status = 'failed', updated_at = CURRENT_TIMESTAMP
       WHERE payment_reference = $1`,
      [reference]
    );

    console.log(`Charge failed for reference: ${reference}`);
  } catch (error) {
    console.error('Handle charge failed error:', error);
  }
}

// Helper function to handle successful transfers (payouts)
async function handleTransferSuccess(data) {
  try {
    console.log('Transfer successful:', data);
    // Implement payout success logic here
  } catch (error) {
    console.error('Handle transfer success error:', error);
  }
}

// Helper function to handle failed transfers
async function handleTransferFailed(data) {
  try {
    console.log('Transfer failed:', data);
    // Implement payout failure logic here
  } catch (error) {
    console.error('Handle transfer failed error:', error);
  }
}

module.exports = {
  initializePayment,
  verifyPayment,
  handlePaystackWebhook
};

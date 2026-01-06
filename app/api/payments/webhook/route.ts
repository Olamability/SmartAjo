import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/server/db';
import { verifyWebhookSignature, verifyPayment } from '@/lib/server/paystack';
import { 
  successResponse, 
  errorResponse, 
  serverErrorResponse 
} from '@/lib/server/apiResponse';

export async function POST(req: NextRequest) {
  try {
    // Get signature from headers
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return errorResponse('Missing signature', 400);
    }

    // Get raw body
    const body = await req.text();

    // Verify webhook signature
    const isValid = verifyWebhookSignature(body, signature);

    if (!isValid) {
      return errorResponse('Invalid signature', 401);
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const { event, data } = payload;

    // Log webhook for debugging
    await query(
      `INSERT INTO payment_webhooks (provider, event_type, payload, reference, processed)
       VALUES ($1, $2, $3, $4, $5)`,
      ['paystack', event, payload, data.reference, false]
    );

    // Handle charge.success event
    if (event === 'charge.success') {
      const reference = data.reference;
      const status = data.status;

      if (status === 'success') {
        // Verify payment with Paystack API (extra security)
        const verification = await verifyPayment(reference);

        if (!verification.data || verification.data.status !== 'success') {
          return errorResponse('Payment verification failed', 400);
        }

        // Update transaction and related records
        await transaction(async (client) => {
          // Update transaction status
          const txResult = await client.query(
            `UPDATE transactions 
             SET status = 'completed', payment_reference = $1, metadata = metadata || $2
             WHERE reference = $3
             RETURNING id, user_id, group_id, type, amount, metadata`,
            [data.reference, JSON.stringify({ paystackData: data }), reference]
          );

          if (txResult.rows.length === 0) {
            throw new Error('Transaction not found');
          }

          const tx = txResult.rows[0];

          // If contribution, update contribution status
          if (tx.type === 'contribution') {
            await client.query(
              `UPDATE contributions 
               SET status = 'paid', paid_date = CURRENT_TIMESTAMP, payment_reference = $1
               WHERE transaction_ref = $2`,
              [data.reference, reference]
            );

            // Update group member's total contributions
            await client.query(
              `UPDATE group_members 
               SET total_contributions = total_contributions + 1
               WHERE group_id = $1 AND user_id = $2`,
              [tx.group_id, tx.user_id]
            );
          }

          // Create notification for user
          await client.query(
            `INSERT INTO notifications 
             (user_id, type, title, message, group_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              tx.user_id,
              'payment_received',
              'Payment Successful',
              `Your payment of ₦${tx.amount} has been received successfully.`,
              tx.group_id,
              JSON.stringify({ reference, amount: tx.amount }),
            ]
          );

          // Mark webhook as processed
          await client.query(
            'UPDATE payment_webhooks SET processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE reference = $1',
            [reference]
          );
        });

        return successResponse(null, 'Webhook processed successfully');
      }
    }

    // For other events, just log them
    return successResponse(null, 'Webhook received');
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Try to log error in database
    try {
      const body = await req.text();
      const payload = JSON.parse(body);
      await query(
        `UPDATE payment_webhooks 
         SET error_message = $1 
         WHERE reference = $2 AND processed = FALSE`,
        [error.message, payload.data?.reference]
      );
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return serverErrorResponse('Failed to process webhook');
  }
}

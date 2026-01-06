import { NextRequest } from 'next/server';
import { query, transaction } from '@/lib/server/db';
import { getCurrentUser } from '@/lib/server/auth';
import { initiatePaymentSchema } from '@/lib/server/validation';
import { paymentRateLimiter } from '@/lib/server/rateLimit';
import { 
  initializePayment, 
  generatePaymentReference, 
  toKobo 
} from '@/lib/server/paystack';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse, 
  unauthorizedResponse, 
  serverErrorResponse 
} from '@/lib/server/apiResponse';

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await paymentRateLimiter(req);
    if (rateLimitResult) return rateLimitResult;

    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return unauthorizedResponse('Not authenticated');
    }

    const body = await req.json();

    // Validate input
    const validation = initiatePaymentSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.format());
    }

    const { groupId, amount, type } = validation.data;

    // Verify group exists and user is a member
    const groupCheck = await query(
      `SELECT g.id, g.name, g.contribution_amount, g.service_fee_percentage, gm.user_id
       FROM groups g
       LEFT JOIN group_members gm ON g.id = gm.group_id AND gm.user_id = $1
       WHERE g.id = $2`,
      [currentUser.userId, groupId]
    );

    if (groupCheck.rows.length === 0) {
      return errorResponse('Group not found', 404);
    }

    const group = groupCheck.rows[0];

    if (!group.user_id && type === 'contribution') {
      return errorResponse('You are not a member of this group', 403);
    }

    // Calculate service fee
    const serviceFee = (amount * group.service_fee_percentage) / 100;
    const totalAmount = amount + serviceFee;

    // Generate payment reference
    const reference = generatePaymentReference('AJO');

    // Create transaction record
    await transaction(async (client) => {
      // Insert transaction
      await client.query(
        `INSERT INTO transactions 
         (user_id, group_id, type, amount, status, reference, payment_method, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          currentUser.userId,
          groupId,
          type,
          totalAmount,
          'pending',
          reference,
          'paystack',
          JSON.stringify({ 
            baseAmount: amount, 
            serviceFee, 
            groupName: group.name 
          }),
        ]
      );

      // If contribution, create contribution record
      if (type === 'contribution') {
        // Get current cycle for the group
        const cycleResult = await client.query(
          'SELECT current_cycle FROM groups WHERE id = $1',
          [groupId]
        );
        const currentCycle = cycleResult.rows[0]?.current_cycle || 1;

        await client.query(
          `INSERT INTO contributions 
           (group_id, user_id, amount, cycle, status, due_date, service_fee, transaction_ref)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)`,
          [groupId, currentUser.userId, amount, currentCycle, 'pending', serviceFee, reference]
        );
      }
    });

    // Get user email
    const userResult = await query('SELECT email FROM users WHERE id = $1', [currentUser.userId]);
    const userEmail = userResult.rows[0].email;

    // Initialize payment with Paystack
    const paystackResponse = await initializePayment({
      email: userEmail,
      amount: toKobo(totalAmount),
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/callback`,
      metadata: {
        userId: currentUser.userId,
        groupId,
        type,
        baseAmount: amount,
        serviceFee,
      },
    });

    return successResponse({
      authorization_url: paystackResponse.data.authorization_url,
      access_code: paystackResponse.data.access_code,
      reference: paystackResponse.data.reference,
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    return serverErrorResponse('Failed to initiate payment');
  }
}

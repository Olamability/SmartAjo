/**
 * Payment Verification API Service
 * 
 * Handles payment verification by calling the backend Edge Function.
 * This follows the mandatory verification flow from "Paystack steup.md":
 * - Frontend initializes payment
 * - Frontend callback triggers verification request
 * - Backend verifies with Paystack API
 * - Backend updates database
 * - Frontend receives confirmation
 */

import { createClient } from '@/lib/client/supabase';
import { getErrorMessage } from '@/lib/utils';

interface VerifyPaymentResponse {
  success: boolean;
  payment_status: string;
  verified: boolean;
  amount: number;
  message: string;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    channel: string;
    paid_at: string;
  };
  error?: string;
}

/**
 * Verify payment with backend
 * 
 * MANDATORY: All payments MUST be verified via backend before being
 * considered successful. Frontend callback does NOT equal payment success.
 */
export const verifyPayment = async (
  reference: string
): Promise<VerifyPaymentResponse> => {
  try {
    const supabase = createClient();

    // Call the verify-payment Edge Function
    const { data, error } = await supabase.functions.invoke('verify-payment', {
      body: { reference },
    });

    if (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        payment_status: 'unknown',
        verified: false,
        amount: 0,
        message: 'Failed to verify payment',
        error: error.message,
      };
    }

    return data;
  } catch (error) {
    console.error('Verify payment error:', error);
    return {
      success: false,
      payment_status: 'unknown',
      verified: false,
      amount: 0,
      message: 'Failed to verify payment',
      error: getErrorMessage(error, 'Failed to verify payment'),
    };
  }
};

/**
 * Get payment status from database
 * Used to check if a payment has been verified and processed
 */
export const getPaymentStatus = async (
  reference: string
): Promise<{
  success: boolean;
  payment?: {
    id: string;
    reference: string;
    status: string;
    verified: boolean;
    amount: number;
    paid_at: string;
  };
  error?: string;
}> => {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('payments')
      .select('id, reference, status, verified, amount, paid_at')
      .eq('reference', reference)
      .single();

    if (error) {
      console.error('Error fetching payment status:', error);
      return { success: false, error: error.message };
    }

    return { success: true, payment: data };
  } catch (error) {
    console.error('Get payment status error:', error);
    return {
      success: false,
      error: getErrorMessage(error, 'Failed to fetch payment status'),
    };
  }
};

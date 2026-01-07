import crypto from 'crypto';
import { parseJsonResponse } from '@/lib/utils';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

if (!PAYSTACK_SECRET_KEY) {
  console.warn('PAYSTACK_SECRET_KEY not set. Payment features will not work.');
}

export interface PaystackInitializePaymentParams {
  email: string;
  amount: number; // Amount in kobo (₦1 = 100 kobo)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned';
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
  };
}

// Initialize payment
export async function initializePayment(
  params: PaystackInitializePaymentParams
): Promise<PaystackInitializeResponse> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await parseJsonResponse<PaystackInitializeResponse>(response, 'Paystack initialize payment');

    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize payment');
    }

    return data;
  } catch (error) {
    console.error('Paystack initialize payment error:', error);
    throw error;
  }
}

// Verify payment
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await parseJsonResponse<PaystackVerifyResponse>(response, 'Paystack verify payment');

    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify payment');
    }

    return data;
  } catch (error) {
    console.error('Paystack verify payment error:', error);
    throw error;
  }
}

// Verify webhook signature
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY not configured');
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

// Generate payment reference
export function generatePaymentReference(prefix: string = 'AJO'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `${prefix}-${timestamp}-${random}`;
}

// Convert amount to kobo (Paystack uses kobo)
export function toKobo(amount: number): number {
  return Math.round(amount * 100);
}

// Convert kobo to naira
export function toNaira(kobo: number): number {
  return kobo / 100;
}

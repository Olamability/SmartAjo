import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// NOTE: In-memory rate limiting is suitable for development and single-server deployments.
// For production serverless environments (e.g., Vercel), consider using:
// - Redis (Upstash Redis for Vercel)
// - Database-backed solution
// - Edge rate limiting (Vercel Edge Config)
const rateLimitStore: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
}

const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const DEFAULT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

export function rateLimit(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs || DEFAULT_WINDOW_MS;
  const maxRequests = config.maxRequests || DEFAULT_MAX_REQUESTS;

  return async (req: NextRequest) => {
    // Get client identifier (IP address or user ID)
    const clientId = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    // Clean up expired entries
    Object.keys(rateLimitStore).forEach((key) => {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    });

    // Get or create rate limit entry
    if (!rateLimitStore[clientId]) {
      rateLimitStore[clientId] = {
        count: 1,
        resetTime: now + windowMs,
      };
      return null; // Allow request
    }

    const entry = rateLimitStore[clientId];

    // Check if window has expired
    if (entry.resetTime < now) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
      return null; // Allow request
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment count
    entry.count++;
    return null; // Allow request
  };
}

// Specific rate limiters for different endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 requests per window
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per window
});

export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
});

// Helper function to check rate limit and return result object
export async function checkRateLimit(req: NextRequest, limiter = apiRateLimiter): Promise<{ success: boolean; response?: NextResponse }> {
  const result = await limiter(req);
  if (result) {
    return { success: false, response: result };
  }
  return { success: true };
}

const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks
 */

// Standard rate limiter for most API endpoints
const apiLimiter = rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints (login, signup)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 payment requests per hour
  message: {
    success: false,
    error: 'Too many payment requests, please try again later.',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed rate limiter for read-only endpoints (GET requests)
const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  paymentLimiter,
  readLimiter
};

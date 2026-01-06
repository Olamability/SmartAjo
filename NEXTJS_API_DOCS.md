# Next.js API Documentation

This document describes all the API routes available in the Ajo Secure Next.js application.

## Base URL

All API routes are relative to `/api`

For local development: `http://localhost:3000/api`

## Authentication

Most endpoints require authentication via httpOnly cookies that are automatically set upon login.

---

## Authentication Endpoints

### POST /api/auth/signup

Create a new user account.

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123!"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "fullName": "John Doe",
      "phone": "+2348012345678",
      "isVerified": false,
      "kycStatus": "not_started",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "message": "User created successfully. Please verify your email with the OTP sent."
  },
  "message": "Signup successful"
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### POST /api/auth/login

Authenticate a user and set auth cookies.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "john@example.com",
      "fullName": "John Doe",
      "phone": "+2348012345678",
      "isVerified": true,
      "kycStatus": "verified"
    }
  },
  "message": "Login successful"
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### POST /api/auth/logout

Logout the current user and clear auth cookies.

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logout successful"
}
```

---

### POST /api/auth/verify-email

Verify email address using OTP.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Email verified successfully"
}
```

**Rate Limit:** 5 requests per 15 minutes

---

### POST /api/auth/resend-otp

Resend OTP to email address.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "OTP sent successfully"
}
```

**Rate Limit:** 5 requests per 15 minutes

---

## User Endpoints

### GET /api/users/me

Get current authenticated user profile.

**Auth Required:** Yes

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "fullName": "John Doe",
    "phone": "+2348012345678",
    "isVerified": true,
    "kycStatus": "verified",
    "bvn": "12345678901",
    "profileImage": "https://...",
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLoginAt": "2024-01-02T00:00:00Z"
  }
}
```

---

### PATCH /api/users/me

Update current user profile.

**Auth Required:** Yes

**Request Body:**
```json
{
  "fullName": "John Updated",
  "phone": "+2348012345679",
  "bvn": "12345678901",
  "profileImage": "https://..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "john@example.com",
    "fullName": "John Updated",
    // ... other fields
    "updatedAt": "2024-01-02T00:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

---

## Payment Endpoints

### POST /api/payments/initiate

Initiate a payment transaction with Paystack.

**Auth Required:** Yes

**Request Body:**
```json
{
  "groupId": "uuid",
  "amount": 5000,
  "type": "contribution"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "...",
    "reference": "AJO-1234567890-123456"
  }
}
```

**Rate Limit:** 10 requests per minute

---

### POST /api/payments/webhook

Paystack webhook endpoint for payment notifications.

**Note:** This endpoint is called by Paystack, not by the frontend.

**Request Headers:**
- `x-paystack-signature`: Webhook signature for verification

**Request Body:** Paystack event payload

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Webhook processed successfully"
}
```

---

### GET /api/payments/history

Get payment history for the authenticated user.

**Auth Required:** Yes

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "type": "contribution",
        "amount": 5000,
        "status": "completed",
        "date": "2024-01-01T00:00:00Z",
        "reference": "AJO-...",
        "payment_reference": "...",
        "description": "...",
        "metadata": {},
        "group_name": "Monthly Savings",
        "group_id": "uuid"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message",
  "details": {} // Optional, for validation errors
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `422`: Unprocessable Entity (validation errors)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

---

## Rate Limiting

Rate limits are applied per client IP address:

- **Authentication endpoints**: 5 requests per 15 minutes
- **Payment endpoints**: 10 requests per minute
- **General API endpoints**: 100 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

---

## Security

All sensitive operations use:
- **httpOnly cookies** for JWT storage
- **HTTPS** in production
- **CSRF protection**
- **Rate limiting**
- **Input validation** with Zod
- **Webhook signature verification** for Paystack

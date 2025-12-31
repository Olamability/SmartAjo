# API Documentation - Ajo Secure

This document outlines the backend API requirements for the Ajo Secure platform. The frontend is already built and ready; this API specification defines what the backend needs to implement.

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.ajosecure.com/api
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## API Endpoints

### Authentication

#### POST /auth/signup

Register a new user.

**Request Body:**
```json
{
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "password": "string",
  "confirmPassword": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "fullName": "string",
      "phone": "string",
      "isVerified": false,
      "kycStatus": "not_started"
    },
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

#### POST /auth/login

Authenticate user and get tokens.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {},
    "accessToken": "string",
    "refreshToken": "string"
  }
}
```

#### POST /auth/logout

Invalidate user session.

**Headers:** Authorization required

#### POST /auth/refresh-token

Get new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

#### POST /auth/verify-email

Verify user email with OTP.

**Request Body:**
```json
{
  "email": "string",
  "otp": "string"
}
```

#### POST /auth/resend-otp

Resend verification OTP.

**Request Body:**
```json
{
  "email": "string"
}
```

### User Management

#### GET /users/me

Get current user profile.

**Headers:** Authorization required

#### PUT /users/me

Update user profile.

**Headers:** Authorization required

**Request Body:**
```json
{
  "fullName": "string",
  "phone": "string",
  "profileImage": "string"
}
```

#### POST /users/kyc

Submit KYC information.

**Headers:** Authorization required

**Request Body:**
```json
{
  "bvn": "string",
  "dateOfBirth": "string",
  "address": "string"
}
```

### Group Management

#### POST /groups

Create a new savings group.

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "contributionAmount": "number",
  "frequency": "daily|weekly|monthly",
  "totalMembers": "number",
  "securityDepositPercentage": "number",
  "startDate": "string (ISO 8601)"
}
```

#### GET /groups

Get all groups (with filters).

**Query Parameters:**
- `status` - Group status filter
- `page` - Page number
- `limit` - Items per page

#### GET /groups/:id

Get group details.

**Headers:** Authorization required

#### POST /groups/:id/join

Join a group.

**Headers:** Authorization required

#### GET /groups/my-groups

Get user's groups.

**Headers:** Authorization required

#### GET /groups/available

Get groups available to join.

**Headers:** Authorization required

### Contributions

#### POST /contributions/:id/pay

Make a contribution payment.

**Headers:** Authorization required

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentUrl": "string",
    "reference": "string"
  }
}
```

#### GET /contributions/my-contributions

Get user's contributions.

**Headers:** Authorization required

**Query Parameters:**
- `groupId` - Filter by group
- `status` - Filter by status

### Security Deposits

#### POST /groups/:id/security-deposit

Pay security deposit for a group.

**Headers:** Authorization required

#### GET /security-deposits/my-deposits

Get user's security deposits.

**Headers:** Authorization required

### Transactions

#### GET /transactions

Get transaction history.

**Headers:** Authorization required

**Query Parameters:**
- `type` - Transaction type
- `startDate` - Start date
- `endDate` - End date
- `page` - Page number
- `limit` - Items per page

#### GET /transactions/:id

Get transaction details.

**Headers:** Authorization required

### Payouts

#### GET /payouts

Get payout history.

**Headers:** Authorization required

#### GET /payouts/:id

Get payout details.

**Headers:** Authorization required

### Webhooks

#### POST /webhooks/paystack

Handle Paystack webhook events.

**Request Headers:**
- `x-paystack-signature` - Webhook signature

**Request Body:**
```json
{
  "event": "string",
  "data": {}
}
```

## Payment Integration

### Paystack Integration

1. **Initialize Payment**
   - Endpoint: `/contributions/:id/pay`
   - Creates payment and returns Paystack authorization URL
   - User is redirected to Paystack for payment

2. **Webhook Handling**
   - Endpoint: `/webhooks/paystack`
   - Verifies webhook signature
   - Updates contribution/deposit status
   - Triggers payout if cycle is complete

3. **Verify Payment**
   - Called after webhook confirmation
   - Updates database records
   - Sends confirmation notifications

### Payment Flow

```
1. User initiates payment
2. Backend creates payment record
3. Backend initializes Paystack payment
4. User completes payment on Paystack
5. Paystack sends webhook to backend
6. Backend verifies and updates records
7. Backend processes payout if applicable
8. User receives confirmation
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  kyc_status VARCHAR(20) DEFAULT 'not_started',
  bvn VARCHAR(11),
  profile_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Groups Table

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  contribution_amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  total_members INTEGER NOT NULL,
  current_members INTEGER DEFAULT 0,
  security_deposit_amount DECIMAL(10, 2) NOT NULL,
  security_deposit_percentage INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'forming',
  current_cycle INTEGER DEFAULT 0,
  total_cycles INTEGER NOT NULL,
  service_fee_percentage INTEGER DEFAULT 10,
  start_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Group Members Table

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES users(id),
  rotation_position INTEGER NOT NULL,
  security_deposit_paid BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'active',
  total_contributions INTEGER DEFAULT 0,
  total_penalties DECIMAL(10, 2) DEFAULT 0,
  has_received_payout BOOLEAN DEFAULT FALSE,
  payout_date TIMESTAMP,
  payout_amount DECIMAL(10, 2),
  joined_at TIMESTAMP DEFAULT NOW()
);
```

### Contributions Table

```sql
CREATE TABLE contributions (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  cycle INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  due_date TIMESTAMP NOT NULL,
  paid_date TIMESTAMP,
  penalty DECIMAL(10, 2) DEFAULT 0,
  service_fee DECIMAL(10, 2) NOT NULL,
  transaction_ref VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Transactions Table

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  group_id UUID REFERENCES groups(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  description TEXT,
  reference VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Codes

- `AUTH_001` - Invalid credentials
- `AUTH_002` - Token expired
- `AUTH_003` - Invalid token
- `USER_001` - User not found
- `USER_002` - Email already exists
- `GROUP_001` - Group not found
- `GROUP_002` - Group is full
- `GROUP_003` - Already a member
- `PAY_001` - Payment failed
- `PAY_002` - Insufficient funds
- `VAL_001` - Validation error

## Rate Limiting

- Authentication endpoints: 5 requests per 15 minutes per IP
- API endpoints: 100 requests per 15 minutes per user
- Webhook endpoints: 1000 requests per hour

## Security Requirements

1. Use HTTPS only
2. Implement JWT with short expiration (15 minutes)
3. Use refresh tokens with rotation
4. Validate all inputs
5. Sanitize all outputs
6. Implement CORS properly
7. Use parameterized queries (prevent SQL injection)
8. Hash passwords with bcrypt (12+ rounds)
9. Verify webhook signatures
10. Implement request signing for sensitive operations

## Testing

Backend should include:
- Unit tests for business logic
- Integration tests for API endpoints
- Load tests for critical paths
- Security tests for vulnerabilities

## Monitoring

Implement:
- Error tracking (Sentry)
- Performance monitoring
- Database query monitoring
- API endpoint monitoring
- Payment success rates
- User activity tracking

## Deployment

Backend should be deployable via:
- Docker containers
- Kubernetes
- Serverless (AWS Lambda, etc.)

Include:
- Health check endpoint: `/health`
- Metrics endpoint: `/metrics`
- API documentation: `/docs` (Swagger)

---

For questions or clarifications, contact: api@ajosecure.com

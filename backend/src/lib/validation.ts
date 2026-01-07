import 'server-only';

import { z } from 'zod';

// Auth schemas
export const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export const resendOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const changePasswordSchema = z.object({
  token: z.string(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// User profile schema
export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().min(10).optional(),
  bvn: z.string().length(11).optional(),
  profileImage: z.string().url().optional(),
});

// Payment schemas
export const initiatePaymentSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'), // Matches UUID type in database/schema.sql
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['contribution', 'security_deposit']),
});

// Group schemas
export const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().optional(),
  contributionAmount: z.number().positive('Contribution amount must be positive'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  totalMembers: z.number().min(2).max(50),
  securityDepositPercentage: z.number().min(0).max(100),
  serviceFeePercentage: z.number().min(0).max(100).default(10),
  startDate: z.string().datetime().optional(),
});

export const joinGroupSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'), // Matches UUID type in database/schema.sql
});

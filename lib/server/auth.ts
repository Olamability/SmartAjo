import 'server-only';

import bcrypt from 'bcryptjs';
import { createClient } from '@/lib/server/supabase';

// Password hashing utilities
// Note: These are kept for backward compatibility and potential future use cases
// (e.g., additional password verification, admin password resets, etc.)
// Supabase Auth handles password hashing for standard authentication flows

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP expiry time (10 minutes)
export function getOTPExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + 10);
  return expiry;
}

// Get current user from Supabase session
export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }
    
    return { id: user.id, email: user.email };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Alias for getCurrentUser for compatibility
export async function getUserFromRequest(): Promise<{ id: string; email: string } | null> {
  return getCurrentUser();
}

// Authenticate request and return user from Supabase session
export async function authenticateRequest(): Promise<{ authenticated: boolean; user?: { id: string; email: string } }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { authenticated: false };
    }
    return { authenticated: true, user };
  } catch (error) {
    return { authenticated: false };
  }
}

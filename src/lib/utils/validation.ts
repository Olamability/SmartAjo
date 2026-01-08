/**
 * Validation utilities for authentication
 */

import { User as AuthUser } from '@supabase/supabase-js';

/**
 * Validates that an authenticated user has a valid email address
 * 
 * @param authUser - Authenticated user from Supabase Auth
 * @throws Error if user is missing email address
 */
export function validateAuthUser(authUser: AuthUser): void {
  if (!authUser.email) {
    throw new Error('User account is missing email address. Please contact support.');
  }
}

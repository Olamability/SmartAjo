/**
 * Profile management utilities
 * Shared logic for user profile creation and management
 */

import { SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import { POSTGRES_ERROR_CODES } from '@/lib/constants/database';

/**
 * Ensures a user profile exists in the database
 * If the profile doesn't exist, creates it from auth metadata
 * 
 * @param supabase - Supabase client instance
 * @param authUser - Authenticated user from Supabase Auth
 * @returns Promise that resolves to true if profile exists or was created
 * @throws Error if profile creation fails (except for duplicate key errors)
 */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  authUser: AuthUser
): Promise<boolean> {
  // Check if profile exists
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();
  
  if (profile) {
    return true;
  }
  
  // Create profile from auth metadata
  const userEmail = authUser.email || '';
  if (!userEmail) {
    throw new Error('User account is missing email address. Please contact support.');
  }
  
  const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
  const phone = authUser.user_metadata?.phone || '';
  
  const { error } = await supabase.from('users').insert({
    id: authUser.id,
    email: userEmail,
    full_name: fullName,
    phone: phone,
    is_verified: !!authUser.email_confirmed_at,
    is_active: true,
    kyc_status: 'not_started',
  });
  
  // Ignore duplicate key errors (profile might have been created concurrently)
  if (error && error.code !== POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
    throw error;
  }
  
  return true;
}

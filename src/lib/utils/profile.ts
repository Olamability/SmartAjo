/**
 * Profile management utilities
 * Shared logic for user profile creation and management
 */

import { SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import { POSTGRES_ERROR_CODES } from '@/lib/constants/database';
import { validateAuthUser } from './validation';

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
  // Validate auth user has email
  validateAuthUser(authUser);
  
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
  const userEmail = authUser.email!; // We validated this above
  const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User';
  
  // Phone is required (NOT NULL in schema)
  // Generate temporary unique phone if not provided using first 12 chars of UUID for brevity
  // Format: temp_xxxxxxxxxxxx (5 + 12 = 17 chars, within VARCHAR(20) limit)
  const phone = authUser.user_metadata?.phone || `temp_${authUser.id.substring(0, 12)}`;
  
  // Use the create_user_profile RPC function which has SECURITY DEFINER
  // This bypasses RLS policies and prevents "new row violates row-level security" errors
  const { error } = await supabase.rpc('create_user_profile', {
    p_user_id: authUser.id,
    p_email: userEmail,
    p_phone: phone,
    p_full_name: fullName,
  });
  
  // Ignore duplicate key errors (profile might have been created concurrently)
  // The function uses ON CONFLICT DO NOTHING, so it's safe to call multiple times
  if (error && error.code !== POSTGRES_ERROR_CODES.UNIQUE_VIOLATION) {
    throw error;
  }
  
  return true;
}

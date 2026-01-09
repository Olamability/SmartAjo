// Authentication service using Supabase Auth
import { User, SignUpFormData, LoginFormData } from '@/types';
import { createClient } from '@/lib/client/supabase';
import { getErrorMessage, withTimeout } from '@/lib/utils';
import { 
  AUTH_OPERATION_TIMEOUT, 
  USER_DATA_FETCH_TIMEOUT, 
  DB_WRITE_TIMEOUT 
} from '@/lib/constants/timeout';
import { convertKycStatus } from '@/lib/constants/database';
import { ensureUserProfile } from '@/lib/utils/profile';
import type { PostgrestSingleResponse, PostgrestResponse, SupabaseClient } from '@supabase/supabase-js';

// Database user type
interface DbUser {
  id: string;
  email: string;
  phone: string;
  full_name: string;
  created_at: string;
  is_verified: boolean;
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  kyc_data?: {
    bvn?: string;
    nin?: string;
    verification_status?: string;
    verified_at?: string;
  };
  avatar_url?: string;
  is_active?: boolean;
}

/**
 * Type-safe wrapper for fetching a single user from the database
 */
async function fetchUserById(
  supabase: SupabaseClient,
  userId: string
): Promise<PostgrestSingleResponse<DbUser>> {
  return supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single() as unknown as Promise<PostgrestSingleResponse<DbUser>>;
}

/**
 * Type-safe wrapper for creating a user profile via RPC
 */
async function createUserProfileRPC(
  supabase: SupabaseClient,
  params: {
    userId: string;
    email: string;
    phone: string;
    fullName: string;
  }
): Promise<PostgrestSingleResponse<string>> {
  return supabase.rpc('create_user_profile', {
    p_user_id: params.userId,
    p_email: params.email,
    p_phone: params.phone,
    p_full_name: params.fullName,
  }) as unknown as Promise<PostgrestSingleResponse<string>>;
}

/**
 * Type-safe wrapper for updating user last login
 */
async function updateUserLastLogin(
  supabase: SupabaseClient,
  userId: string
): Promise<PostgrestResponse<DbUser>> {
  return supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)
    .select() as unknown as Promise<PostgrestResponse<DbUser>>;
}

/**
 * Type-safe wrapper for updating user profile data
 */
async function updateUserData(
  supabase: SupabaseClient,
  userId: string,
  updates: Record<string, string | Record<string, unknown>>
): Promise<PostgrestSingleResponse<DbUser>> {
  return supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single() as unknown as Promise<PostgrestSingleResponse<DbUser>>;
}

// Signup function
// Uses Supabase Auth directly for authentication
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const supabase = createClient();
    
    // Sign up with Supabase Auth with timeout (30 seconds for auth operations)
    const authResponse = await withTimeout(
      supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone,
          },
        },
      }),
      AUTH_OPERATION_TIMEOUT,
      'Signup request timed out. Please check your internet connection and try again.'
    );

    const { data: authData, error: authError } = authResponse;

    if (authError) {
      console.error('Signup auth error:', {
        message: authError.message,
        status: authError.status,
      });
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Signup failed - unable to create user account. Please try again or contact support.' };
    }

    // Wait for database trigger to create user record with retry logic
    // The trigger should create the record automatically, but we'll add a manual insert as fallback
    let userData: DbUser | null = null;
    let retries = 0;
    const maxRetries = 3;
    
    while (!userData && retries < maxRetries) {
      try {
        // First, try to fetch the user record (trigger may have already created it)
        const fetchResponse = await withTimeout(
          fetchUserById(supabase, authData.user.id),
          USER_DATA_FETCH_TIMEOUT,
          'Unable to fetch user data.'
        );

        if (fetchResponse.data) {
          userData = fetchResponse.data;
          break;
        }

        // If user record doesn't exist and this is first attempt, try manual insert using RPC
        if (retries === 0) {
          console.log('User record not found, attempting manual insert using RPC...');
          const rpcResponse = await withTimeout(
            createUserProfileRPC(supabase, {
              userId: authData.user.id,
              email: data.email,
              phone: data.phone,
              fullName: data.fullName,
            }),
            DB_WRITE_TIMEOUT,
            'Database operation timed out.'
          );

          if (rpcResponse.error) {
            console.error('Error calling create_user_profile RPC:', rpcResponse.error);
            // Continue to retry fetch, the trigger may have created it
          } else {
            console.log('User profile created via RPC, fetching...');
          }
        }
        
        // Wait before retrying
        if (!userData && retries < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1)));
        }
        
      } catch (error) {
        console.error(`Error on attempt ${retries + 1}:`, error);
      }
      
      retries++;
    }

    if (!userData) {
      console.error('Failed to create or fetch user data after multiple attempts');
      // Return basic user info if all attempts fail
      return {
        success: true,
        user: {
          id: authData.user.id,
          email: data.email,
          phone: data.phone,
          fullName: data.fullName,
          createdAt: new Date().toISOString(),
          isVerified: false,
          kycStatus: 'not_started',
        },
      };
    }

    return {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        fullName: userData.full_name,
        createdAt: userData.created_at,
        isVerified: userData.is_verified,
        kycStatus: convertKycStatus(userData.kyc_status),
        bvn: typeof userData.kyc_data?.bvn === 'string' ? userData.kyc_data.bvn : undefined,
        profileImage: userData.avatar_url,
      },
    };
  } catch (error) {
    console.error('Signup error:', error);
    return { 
      success: false, 
      error: getErrorMessage(error, 'An error occurred during signup')
    };
  }
};

// Login function
// Uses Supabase Auth directly for authentication
export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const supabase = createClient();
    
    // Sign in with Supabase Auth with timeout (30 seconds for auth operations)
    const authResponse = await withTimeout(
      supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      }),
      AUTH_OPERATION_TIMEOUT,
      'Login request timed out. Please check your internet connection and try again.'
    );

    const { data: authData, error: authError } = authResponse;

    if (authError) {
      console.error('Login auth error:', {
        message: authError.message,
        status: authError.status,
      });
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Login failed - invalid credentials or account not found' };
    }

    // Fetch user data from public.users table with timeout
    const fetchResponse = await withTimeout(
      fetchUserById(supabase, authData.user.id),
      USER_DATA_FETCH_TIMEOUT,
      'Unable to fetch user data. Please try again.'
    );

    const { error: fetchError } = fetchResponse;
    let { data: userData } = fetchResponse;

    // If user profile doesn't exist, try to create it using shared utility
    if (fetchError || !userData) {
      console.warn('User profile not found, attempting to create from auth metadata:', fetchError?.message);
      
      try {
        await ensureUserProfile(supabase, authData.user);
        
        // Try fetching again after creating profile
        const refetchResponse = await withTimeout(
          fetchUserById(supabase, authData.user.id),
          USER_DATA_FETCH_TIMEOUT,
          'Unable to fetch user data after creation.'
        );

        userData = refetchResponse.data;
        
        if (!userData) {
          console.error('Still unable to fetch user profile after creation attempt');
          return { success: false, error: 'Failed to load user profile. Please contact support.' };
        }
      } catch (createError) {
        console.error('Error creating missing profile:', createError);
        return { success: false, error: 'Unable to access user profile. Please contact support.' };
      }
    }

    // Check if account is active
    if (!userData.is_active) {
      await supabase.auth.signOut();
      return { success: false, error: 'Account is deactivated. Please contact support.' };
    }

    // Update last login timestamp (non-blocking, fire and forget with timeout)
    // Explicitly fire-and-forget pattern (15 seconds for non-critical operation)
    void withTimeout(
      updateUserLastLogin(supabase, userData.id),
      DB_WRITE_TIMEOUT,
      'Last login update timed out'
    )
      .then(() => {
        console.log('Last login timestamp updated');
      })
      .catch((error) => {
        console.error('Failed to update last login timestamp:', error);
        // Non-critical, don't block login
      });

    return {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        fullName: userData.full_name,
        createdAt: userData.created_at,
        isVerified: userData.is_verified,
        kycStatus: convertKycStatus(userData.kyc_status),
        bvn: typeof userData.kyc_data?.bvn === 'string' ? userData.kyc_data.bvn : undefined,
        profileImage: userData.avatar_url,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: getErrorMessage(error, 'An error occurred during login')
    };
  }
};

// Logout function
// Signs out from Supabase Auth
export const logout = async (): Promise<void> => {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Verify email with OTP
export const verifyUserEmail = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();
    
    // Verify OTP with Supabase
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Update user verification status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', user.id);
    }

    return { success: true };
  } catch (error) {
    console.error('Verification error:', error);
    return { 
      success: false, 
      error: getErrorMessage(error, 'An error occurred during verification')
    };
  }
};

// Resend OTP
export const resendOTP = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();
    
    // Resend OTP via Supabase
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { 
      success: false, 
      error: getErrorMessage(error, 'An error occurred while resending OTP')
    };
  }
};

// Update user profile
export const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: false, error: 'Not authenticated' };
    }

    // Map frontend fields to database fields
    const dbUpdates: Record<string, string | Record<string, unknown>> = {};
    if (updates.fullName) dbUpdates.full_name = updates.fullName;
    if (updates.phone) dbUpdates.phone = updates.phone;
    if (updates.profileImage) dbUpdates.avatar_url = updates.profileImage;
    if (updates.bvn) {
      const { data: currentUser } = await supabase
        .from('users')
        .select('kyc_data')
        .eq('id', authUser.id)
        .single();
      
      dbUpdates.kyc_data = { 
        ...(currentUser?.kyc_data || {}), 
        bvn: updates.bvn 
      };
    }

    // Update user in database
    const { data, error } = await updateUserData(supabase, authUser.id, dbUpdates);

    if (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Failed to update profile' };
    }

    return {
      success: true,
      user: {
        id: data.id,
        email: data.email,
        phone: data.phone,
        fullName: data.full_name,
        createdAt: data.created_at,
        isVerified: data.is_verified,
        kycStatus: convertKycStatus(data.kyc_status),
        bvn: typeof data.kyc_data?.bvn === 'string' ? data.kyc_data.bvn : undefined,
        profileImage: data.avatar_url,
      },
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return { 
      success: false, 
      error: getErrorMessage(error, 'An error occurred while updating profile')
    };
  }
};

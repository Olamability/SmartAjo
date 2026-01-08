// Authentication service using Supabase Auth
import { User, SignUpFormData, LoginFormData } from '@/types';
import { createClient } from '@/lib/client/supabase';
import { getErrorMessage } from '@/lib/utils';

// Signup function
// Uses Supabase Auth directly for authentication
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const supabase = createClient();
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
        },
      },
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Signup failed - no user returned' };
    }

    // Insert user data into public.users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        phone: data.phone,
        full_name: data.fullName,
        is_verified: false,
        is_active: true,
        kyc_status: 'not_started',
      });

    if (insertError) {
      console.error('Error inserting user data:', insertError);
      // Continue anyway - auth user was created
    }

    // Fetch the complete user record
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (fetchError || !userData) {
      // Return basic user info if fetch fails
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
        kycStatus: userData.kyc_status,
        bvn: userData.kyc_data?.bvn,
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
    
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Login failed - no user returned' };
    }

    // Fetch user data from public.users table
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (fetchError || !userData) {
      console.error('Error fetching user data:', fetchError);
      return { success: false, error: 'Failed to fetch user data' };
    }

    // Check if account is active
    if (!userData.is_active) {
      await supabase.auth.signOut();
      return { success: false, error: 'Account is deactivated. Please contact support.' };
    }

    // Update last login timestamp
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userData.id);

    return {
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        phone: userData.phone,
        fullName: userData.full_name,
        createdAt: userData.created_at,
        isVerified: userData.is_verified,
        kycStatus: userData.kyc_status,
        bvn: userData.kyc_data?.bvn,
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
    const dbUpdates: Record<string, any> = {};
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
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', authUser.id)
      .select()
      .single();

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
        kycStatus: data.kyc_status,
        bvn: data.kyc_data?.bvn,
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

// Authentication service using Supabase Auth
import { User, SignUpFormData, LoginFormData } from '@/types';
import { createClient } from '@/lib/supabase/client';

// Signup function
// Calls API route which handles Supabase authentication server-side
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Signup error: Expected JSON response but got', contentType);
      return { success: false, error: 'Server error: Invalid response format' };
    }

    const result = await response.json();
    
    if (response.ok && result.success && result.data?.user) {
      return { success: true, user: result.data.user };
    }
    
    return { success: false, error: result.error || 'Signup failed' };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An error occurred during signup' };
  }
};

// Login function
// Calls API route which handles Supabase authentication server-side
export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Login error: Expected JSON response but got', contentType);
      return { success: false, error: 'Server error: Invalid response format' };
    }

    const result = await response.json();
    
    if (response.ok && result.success && result.data?.user) {
      return { success: true, user: result.data.user };
    }
    
    return { success: false, error: result.error || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

// Logout function
// Signs out from Supabase Auth client-side
export const logout = async (): Promise<void> => {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Call logout API to clean up any server-side state
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Verify email with OTP
export const verifyUserEmail = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Verification error: Expected JSON response but got', contentType);
      return { success: false, error: 'Server error: Invalid response format' };
    }

    const result = await response.json();
    
    if (response.ok && result.success) {
      return { success: true };
    }
    
    return { success: false, error: result.error || 'Verification failed' };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: 'An error occurred during verification' };
  }
};

// Resend OTP
export const resendOTP = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Resend OTP error: Expected JSON response but got', contentType);
      return { success: false, error: 'Server error: Invalid response format' };
    }

    const result = await response.json();
    
    if (response.ok && result.success) {
      return { success: true };
    }
    
    return { success: false, error: result.error || 'Failed to resend OTP' };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { success: false, error: 'An error occurred while resending OTP' };
  }
};

// Update user profile
export const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Update profile error: Expected JSON response but got', contentType);
      return { success: false, error: 'Server error: Invalid response format' };
    }

    const result = await response.json();
    
    if (response.ok && result.success && result.data) {
      return { success: true, user: result.data };
    }
    
    return { success: false, error: result.error || 'Failed to update profile' };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'An error occurred while updating profile' };
  }
};

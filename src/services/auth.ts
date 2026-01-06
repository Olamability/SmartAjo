// Authentication service using Next.js API routes
import { User, SignUpFormData, LoginFormData } from '@/types';
import { setCurrentUser, getCurrentUser } from './storage';

// Signup function
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (response.ok && result.success && result.data?.user) {
      const user = result.data.user;
      setCurrentUser(user);
      return { success: true, user };
    }
    
    return { success: false, error: result.error || 'Signup failed' };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An error occurred during signup' };
  }
};

// Login function
export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (response.ok && result.success && result.data?.user) {
      const user = result.data.user;
      setCurrentUser(user);
      return { success: true, user };
    }
    
    return { success: false, error: result.error || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

// Logout function
export const logout = async (): Promise<void> => {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    setCurrentUser(null);
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

// Check if user is authenticated
// Note: This checks client-side storage and should be considered as UI state only.
// Actual authentication is enforced server-side via httpOnly cookies.
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return getCurrentUser() !== null;
};

// Get authenticated user from client storage
// Note: This is for UI display purposes only.
// Server-side authentication is handled via httpOnly cookies in API routes.
export const getAuthUser = (): User | null => {
  return getCurrentUser();
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

    const result = await response.json();
    
    if (response.ok && result.success && result.data) {
      const updatedUser = result.data;
      setCurrentUser(updatedUser);
      return { success: true, user: updatedUser };
    }
    
    return { success: false, error: result.error || 'Failed to update profile' };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'An error occurred while updating profile' };
  }
};

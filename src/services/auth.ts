// Authentication service with backend API integration
import { User, SignUpFormData, LoginFormData } from '@/types';
import { api, setAccessToken, setRefreshToken, clearTokens, getAccessToken } from './api';

// Storage key for current user
const CURRENT_USER_KEY = 'ajo_current_user';

// Store user in localStorage for quick access (not sensitive data)
const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
};

const getCurrentUser = (): User | null => {
  try {
    const userData = localStorage.getItem(CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Authentication functions
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/signup', data);

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      
      // Store tokens
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Store user
      setCurrentUser(user);

      return { success: true, user };
    }

    return { success: false, error: response.error || 'Failed to create account' };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An error occurred during signup' };
  }
};

export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', data);

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      
      // Store tokens
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Store user
      setCurrentUser(user);

      return { success: true, user };
    }

    return { success: false, error: response.error || 'Invalid email or password' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

export const logout = async (): Promise<void> => {
  try {
    // Call backend logout endpoint to invalidate session
    // Set a timeout to prevent hanging
    await Promise.race([
      api.post('/auth/logout'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      )
    ]);
  } catch (error) {
    // Log error but continue with local cleanup
    console.error('Logout error:', error);
  } finally {
    // Always clear local data regardless of backend response
    clearTokens();
    setCurrentUser(null);
  }
};

export const verifyUserEmail = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post<{ user: User }>('/auth/verify-email', { email, otp });

    if (response.success && response.data) {
      const { user } = response.data;
      setCurrentUser(user);
      return { success: true };
    }

    return { success: false, error: response.error || 'Invalid or expired OTP' };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: 'An error occurred during verification' };
  }
};

export const resendOTP = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post('/auth/resend-otp', { email });

    if (response.success) {
      return { success: true };
    }

    return { success: false, error: response.error || 'Failed to resend OTP' };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { success: false, error: 'An error occurred while resending OTP' };
  }
};

export const isAuthenticated = (): boolean => {
  return getAccessToken() !== null && getCurrentUser() !== null;
};

export const getAuthUser = (): User | null => {
  return getCurrentUser();
};

export const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    if (!isAuthenticated()) {
      return null;
    }

    const response = await api.get<User>('/users/me');

    if (response.success && response.data) {
      setCurrentUser(response.data);
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('Fetch user error:', error);
    return null;
  }
};

export const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.patch<User>('/users/me', updates);

    if (response.success && response.data) {
      const updatedUser = response.data;
      setCurrentUser(updatedUser);
      return { success: true, user: updatedUser };
    }

    return { success: false, error: response.error || 'Failed to update profile' };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: 'An error occurred while updating profile' };
  }
};

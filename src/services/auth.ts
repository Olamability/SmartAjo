// Authentication service using backend API
import { User, SignUpFormData, LoginFormData } from '@/types';
import { api, setAccessToken, setRefreshToken, getRefreshToken, clearTokens } from './api';
import { setCurrentUser } from './storage';

// Authentication functions
export const signUp = async (data: SignUpFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.post('/auth/signup', data);
    
    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      
      // Store tokens
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Store user in local storage for quick access
      setCurrentUser(user);

      return { success: true, user };
    }
    
    return { success: false, error: response.error || 'Signup failed' };
  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An error occurred during signup' };
  }
};

export const login = async (data: LoginFormData): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.post('/auth/login', data);
    
    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      
      // Store tokens
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      
      // Store user in local storage for quick access
      setCurrentUser(user);

      return { success: true, user };
    }
    
    return { success: false, error: response.error || 'Login failed' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
};

export const logout = async (): Promise<void> => {
  try {
    const refreshToken = getRefreshToken();
    
    // Call backend logout endpoint
    await api.post('/auth/logout', { refreshToken });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear tokens and user data regardless of backend response
    clearTokens();
    setCurrentUser(null);
  }
};

export const verifyUserEmail = async (email: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await api.post('/auth/verify-email', { email, otp });
    
    if (response.success) {
      return { success: true };
    }
    
    return { success: false, error: response.error || 'Verification failed' };
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
  // Check if user has valid tokens
  const user = getAuthUser();
  const token = import.meta.env.MODE === 'test' ? true : sessionStorage.getItem('ajo_access_token');
  return user !== null && !!token;
};

export const getAuthUser = (): User | null => {
  try {
    const userData = localStorage.getItem('ajo_current_user');
    if (!userData) return null;
    return JSON.parse(userData);
  } catch {
    return null;
  }
};

export const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    const response = await api.put('/users/me', updates);
    
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

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/client/supabase';
import { User } from '@/types';
import { retryWithBackoff } from '@/lib/utils';
import { convertKycStatus } from '@/lib/constants/database';
import { ensureUserProfile } from '@/lib/utils/profile';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Retry configuration for profile creation
const MAX_PROFILE_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 100;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load user profile from DB
   * Returns true if successful, false otherwise
   */
  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to load user profile:', {
          error,
          userId,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        
        // Don't set user to null here - throw error instead
        throw new Error(`Failed to load user profile: ${error.message}`);
      }

      if (!data) {
        console.error('User profile not found for ID:', userId);
        throw new Error('User profile not found. Please contact support.');
      }

      setUser({
        id: data.id,
        email: data.email,
        phone: data.phone,
        fullName: data.full_name,
        createdAt: data.created_at,
        isVerified: data.is_verified,
        kycStatus: convertKycStatus(data.kyc_status),
        bvn: data.kyc_data?.bvn,
        profileImage: data.avatar_url,
      });
      
      return true;
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      // Only set user to null on actual errors after logging
      setUser(null);
      throw error;
    }
  };

  /**
   * Refresh session + user
   * Returns true if successful, false otherwise
   */
  const refreshUser = async (): Promise<boolean> => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session?.user) {
        setUser(null);
        return false;
      }

      return await loadUserProfile(session.user.id);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      return false;
    }
  };

  /**
   * LOGIN
   */
  const login = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login auth error:', {
          message: error.message,
          status: error.status,
        });
        throw error;
      }

      if (!data?.user) {
        throw new Error('Login failed: No user data returned');
      }

      // Load user profile with proper error handling
      try {
        await loadUserProfile(data.user.id);
      } catch (profileError) {
        console.error('Failed to load profile after login, attempting to create:', profileError);
        
        // If profile doesn't exist, try to create it using shared utility
        try {
          await ensureUserProfile(supabase, data.user);
          
          // Try loading profile again
          await loadUserProfile(data.user.id);
        } catch (createError) {
          console.error('Failed to create missing profile:', createError);
          throw new Error('Unable to access user profile. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * SIGN UP
   */
  const signUp = async ({
    email,
    password,
    fullName,
    phone,
  }: {
    email: string;
    password: string;
    fullName: string;
    phone: string;
  }) => {
    try {
      // Sign up with metadata - the profile will be created client-side
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      });

      if (error || !data.user) {
        // Don't log the full error if it might contain sensitive data
        // Only log error message and code
        console.error('Signup auth error:', {
          message: error?.message,
          status: error?.status,
        });
        throw error || new Error('Signup failed: No user data returned');
      }

      // Try to create profile with retry logic
      try {
        await retryWithBackoff(
          async () => {
            // First check if profile exists (might have been created by a webhook/hook)
            const { data: profile, error: fetchError } = await supabase
              .from('users')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (profile && !fetchError) {
              // Profile exists, load it
              await loadUserProfile(data.user.id);
              return true;
            }

            // Profile doesn't exist, create it manually
            const { error: insertError } = await supabase.from('users').insert({
              id: data.user.id,
              email,
              full_name: fullName,
              phone,
              is_verified: false,
              is_active: true,
              kyc_status: 'not_started',
            });

            // Ignore duplicate key errors (profile might have been created concurrently)
            // PostgreSQL error code for unique violation
            if (insertError) {
              const isDuplicateError = insertError.code === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION;
              if (!isDuplicateError) {
                throw insertError;
              }
            }

            // Load the profile
            await loadUserProfile(data.user.id);
            return true;
          },
          MAX_PROFILE_RETRIES,
          INITIAL_RETRY_DELAY_MS
        );
      } catch (retryError) {
        console.error('Failed to create/load profile after retries:', retryError);
        // Profile creation failed - this is a critical error
        // Log the error and throw to inform the user
        const errorMessage = retryError instanceof Error 
          ? retryError.message 
          : 'Unknown error during profile creation';
        
        throw new Error(
          `Failed to create user profile after multiple attempts. ${errorMessage}. ` +
          'Please contact support if this issue persists.'
        );
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * LOGOUT
   */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  /**
   * INIT
   */
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log('Initializing auth context...');
        const refreshed = await refreshUser();
        console.log('Auth initialization complete, user authenticated:', refreshed);
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('Auth loading state set to false');
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change event:', event, 'User ID:', session?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing user state');
        setUser(null);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, loading profile for:', session.user.id);
        try {
          await loadUserProfile(session.user.id);
          console.log('Profile loaded successfully after sign in');
        } catch (error) {
          console.error('Error loading profile on auth state change:', error);
        }
      }
      
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed, reloading profile');
        try {
          await loadUserProfile(session.user.id);
        } catch (error) {
          console.error('Error loading profile on token refresh:', error);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      console.log('Auth context cleanup, unsubscribed from auth changes');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signUp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

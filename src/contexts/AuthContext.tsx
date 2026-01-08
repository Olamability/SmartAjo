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
  refreshUser: () => Promise<void>;
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
        kycStatus: (data.kyc_status === 'approved' ? 'verified' : data.kyc_status) as 'not_started' | 'pending' | 'verified' | 'rejected',
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
        console.error('Login auth error:', error);
        throw error;
      }

      if (!data?.user) {
        throw new Error('Login failed: No user data returned');
      }

      // Load user profile with proper error handling
      await loadUserProfile(data.user.id);
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
        console.error('Signup auth error:', error);
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
            if (insertError && 
                !insertError.code?.includes('23505') && 
                !insertError.message.includes('duplicate') &&
                !insertError.message.includes('unique constraint')) {
              throw insertError;
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
        // Don't throw - let user proceed to dashboard even if profile load failed
        // The profile might exist but there could be an RLS policy issue
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
        await refreshUser();
      } catch (error) {
        console.error('Error during auth initialization:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await loadUserProfile(session.user.id);
        } catch (error) {
          console.error('Error loading profile on auth state change:', error);
        }
      }
      
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED' && session?.user) {
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

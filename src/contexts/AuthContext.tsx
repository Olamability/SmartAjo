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
import { convertKycStatus, POSTGRES_ERROR_CODES } from '@/lib/constants/database';
import { ensureUserProfile } from '@/lib/utils/profile';
import { reportError } from '@/lib/utils/errorTracking';

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
        reportError(profileError, {
          operation: 'load_profile_after_login',
          userId: data.user.id,
        });
        
        // If profile doesn't exist, try to create it using shared utility
        try {
          await ensureUserProfile(supabase, data.user);
          
          // Try loading profile again
          await loadUserProfile(data.user.id);
        } catch (createError) {
          reportError(createError, {
            operation: 'create_missing_profile',
            userId: data.user.id,
          });
          throw new Error('Unable to access user profile. Please contact support.');
        }
      }
    } catch (error) {
      reportError(error, {
        operation: 'login',
        email: email,
      });
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
      // Sign up with Supabase Auth
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
        console.error('Signup auth error:', {
          message: error?.message,
          status: error?.status,
        });
        throw error || new Error('Signup failed: No user data returned');
      }

      // Create user profile in database using RPC function with SECURITY DEFINER
      // This bypasses RLS policies and prevents "new row violates row-level security" errors
      const { error: insertError } = await supabase.rpc('create_user_profile', {
        p_user_id: data.user.id,
        p_email: email,
        p_phone: phone,
        p_full_name: fullName,
      });

      // The RPC function uses ON CONFLICT DO NOTHING, so duplicate key errors are handled internally
      // Only throw on actual errors
      if (insertError) {
        console.error('Failed to create user profile:', insertError);
        throw new Error(
          `Failed to create user profile: ${insertError.message}. Please contact support.`
        );
      }

      // Load the user profile
      await loadUserProfile(data.user.id);
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

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/client/supabase';
import { User } from '@/types';
import { convertKycStatus } from '@/lib/constants/database';
import { reportError } from '@/lib/utils/errorTracking';
import { retryWithBackoff } from '@/lib/utils';
import { parseAtomicRPCResponse, isTransientError } from '@/lib/utils/auth';

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

/**
 * Helper function to create user profile via atomic RPC function
 * Single source of truth for profile creation
 */
async function createUserProfileViaRPC(
  authUser: { id: string; email?: string; user_metadata?: any }
): Promise<void> {
  const supabase = createClient();
  
  const userEmail = authUser.email;
  if (!userEmail) {
    throw new Error('User email is required for profile creation');
  }
  
  const fullName = authUser.user_metadata?.full_name || userEmail.split('@')[0] || 'User';
  const phone = authUser.user_metadata?.phone || `temp_${authUser.id.substring(0, 12)}`;
  
  console.log('createUserProfileViaRPC: Calling RPC with params:', {
    userId: authUser.id,
    email: userEmail,
    phone: phone,
    fullName: fullName
  });
  
  const rpcResponse = await supabase.rpc('create_user_profile_atomic', {
    p_user_id: authUser.id,
    p_email: userEmail,
    p_phone: phone,
    p_full_name: fullName,
  });
  
  console.log('createUserProfileViaRPC: RPC response:', rpcResponse);
  
  parseAtomicRPCResponse(rpcResponse, 'User profile creation');
  console.log('createUserProfileViaRPC: Profile created successfully');
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load user profile from DB
   * Uses exponential backoff only for genuine transient errors (network issues)
   * No arbitrary delays - session should be ready when this is called
   */
  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      console.log(`loadUserProfile: Loading profile for user: ${userId}`);
      
      // Verify we have an active session (no retry, should be ready)
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('No active session. Please try logging in again.');
      }
      
      if (sessionData.session.user.id !== userId) {
        throw new Error('Session user mismatch');
      }
      
      // Use exponential backoff only for transient network/DB errors
      const data = await retryWithBackoff(
        async () => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) {
            // Check if this is a transient error worth retrying
            if (!isTransientError(error)) {
              // Non-transient error (RLS, not found, etc) - don't retry
              console.error('loadUserProfile: Non-transient error:', error);
              throw new Error(`Failed to load user profile: ${error.message}`);
            }
            
            // Transient error - let retry handle it
            throw error;
          }

          if (!data) {
            throw new Error('User profile not found. Please contact support.');
          }

          return data;
        },
        3, // Max 3 retries for transient errors
        100 // Start with 100ms, exponential backoff
      );

      console.log('loadUserProfile: Profile loaded successfully');
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
      console.error('loadUserProfile: Error loading profile:', error);
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

      try {
        await loadUserProfile(session.user.id);
        return true;
      } catch (profileError) {
        console.error('Failed to load profile during refresh:', profileError);
        
        // Try to create profile if it doesn't exist
        // This handles edge cases where profile wasn't created during signup
        try {
          await createUserProfileViaRPC(session.user);
          await loadUserProfile(session.user.id);
          return true;
        } catch (createError) {
          console.error('Failed to create profile during refresh:', createError);
          setUser(null);
          return false;
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
      return false;
    }
  };

  /**
   * LOGIN  
   * Uses event-driven session handling via onAuthStateChange
   * Immediately loads profile after authentication
   */
  const login = async (email: string, password: string) => {
    try {
      console.log('login: Starting login for:', email);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('login: Auth error:', error.message);
        throw error;
      }

      if (!data?.user || !data.session) {
        throw new Error('Login failed: No user data returned');
      }

      console.log('login: Auth successful, session established');
      
      // Load profile immediately after successful auth
      // The retry logic with exponential backoff will handle any session propagation delays
      try {
        await loadUserProfile(data.user.id);
        console.log('login: Profile loaded successfully');
      } catch (profileError) {
        console.error('login: Profile loading failed:', profileError);
        reportError(profileError, {
          operation: 'load_profile_after_login',
          userId: data.user.id,
        });
        
        // If profile doesn't exist, try to create it atomically
        try {
          console.log('login: Attempting to create missing profile');
          await createUserProfileViaRPC(data.user);
          
          // Try loading again
          await loadUserProfile(data.user.id);
          console.log('login: Profile loaded successfully after creation');
        } catch (createError) {
          console.error('login: Failed to create/load profile:', createError);
          reportError(createError, {
            operation: 'create_missing_profile',
            userId: data.user.id,
          });
          
          // Sign out to prevent broken state
          await supabase.auth.signOut();
          
          throw new Error('Unable to access your account. Please contact support or try signing up again.');
        }
      }
    } catch (error) {
      console.error('login: Login failed:', error);
      reportError(error, {
        operation: 'login',
        email: email,
      });
      throw error;
    }
  };

  /**
   * SIGN UP
   * Uses atomic profile creation - no delays or retries needed
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
      console.log('signUp: Starting signup for:', email);
      
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
        console.error('Signup auth error:', error?.message);
        throw error || new Error('Signup failed: No user data returned');
      }

      // Check if email confirmation is required
      const needsEmailConfirmation = data.user && !data.session;
      
      console.log('Signup successful:', {
        userId: data.user.id,
        email: data.user.email,
        needsEmailConfirmation,
      });

      // Create user profile atomically - single source of truth
      try {
        console.log('signUp: Creating user profile in database');
        await createUserProfileViaRPC(data.user);
        console.log('signUp: User profile created successfully');
      } catch (profileCreationError) {
        console.error('signUp: Failed to create user profile:', profileCreationError);
        // Log only user ID for privacy, not email
        console.error('signUp: Profile creation error for user:', data.user.id);
        
        // If profile creation fails, clean up the auth user
        console.log('signUp: Signing out auth user due to profile creation failure');
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.error('signUp: Error signing out after profile creation failure:', signOutError);
        }
        
        throw new Error(
          `Failed to create user profile: ${profileCreationError instanceof Error ? profileCreationError.message : 'Unknown error'}. Please contact support.`
        );
      }

      // If email confirmation is required, don't try to load profile yet
      if (needsEmailConfirmation) {
        console.log('Email confirmation required - profile will be loaded after confirmation');
        throw new Error('CONFIRMATION_REQUIRED:Please check your email to confirm your account before signing in.');
      }

      // Load the user profile only if we have an active session
      if (data.session) {
        try {
          console.log('signUp: Loading user profile after signup');
          await loadUserProfile(data.user.id);
          console.log('User profile loaded successfully after signup');
        } catch (profileError) {
          console.error('Failed to load profile after signup:', profileError);
          // If profile loading fails after successful signup, sign out and report error
          await supabase.auth.signOut();
          throw new Error('Account created but failed to load profile. Please try logging in.');
        }
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
        console.log('User signed in via auth state change, loading profile');
        try {
          await loadUserProfile(session.user.id);
          console.log('Profile loaded successfully via auth state change');
        } catch (error) {
          console.error('Error loading profile on auth state change:', error);
          
          // Try to create the profile if it doesn't exist
          try {
            console.log('Attempting to create missing profile...');
            await createUserProfileViaRPC(session.user);
            await loadUserProfile(session.user.id);
            console.log('Profile created and loaded successfully');
          } catch (createError) {
            console.error('Failed to create profile on auth state change:', createError);
            // If profile creation fails, sign out to prevent broken state
            await supabase.auth.signOut();
          }
        }
      }
      
      // Handle token refresh - just reload the profile
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

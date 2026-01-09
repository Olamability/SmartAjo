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
import { ensureUserProfile } from '@/lib/utils/profile';
import { reportError } from '@/lib/utils/errorTracking';
import { isDuplicateError, calculateRetryDelay } from '@/lib/utils/errors';

// Session propagation timing constants
// Supabase auth sessions take time to propagate to PostgreSQL RLS policies
const SESSION_PROPAGATION_DELAY = 1000; // Initial wait after auth
const SESSION_PROPAGATION_RETRY_DELAY = 1500; // Wait between retries for RLS
const PROFILE_COMMIT_DELAY = 500; // Wait for profile creation to commit

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
  const loadUserProfile = async (userId: string, retries = 2): Promise<boolean> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`loadUserProfile: Loading profile for user: ${userId} (attempt ${attempt + 1}/${retries + 1})`);
        
        // First, verify we have an active session
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('loadUserProfile: Current session:', {
          hasSession: !!sessionData.session,
          sessionUserId: sessionData.session?.user?.id,
          matchesUserId: sessionData.session?.user?.id === userId,
        });
        
        // If no session or mismatched user, this is the problem
        if (!sessionData.session) {
          console.error('loadUserProfile: No active session found');
          if (attempt < retries) {
            console.log('loadUserProfile: Waiting for session to be established...');
            await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt, SESSION_PROPAGATION_DELAY)));
            continue;
          }
          throw new Error('No active session. Please try logging in again.');
        }
        
        if (sessionData.session.user.id !== userId) {
          console.error('loadUserProfile: Session user ID mismatch', {
            expected: userId,
            actual: sessionData.session.user.id,
          });
          throw new Error('Session user mismatch');
        }
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('loadUserProfile: Failed to load user profile:', {
            error,
            userId,
            attempt: attempt + 1,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          
          lastError = error;
          
          // Special handling for RLS policy violations  
          if (error.code === 'PGRST301' || error.message?.includes('row-level security')) {
            console.error('loadUserProfile: RLS policy blocking access - session may not be properly established');
            if (attempt < retries) {
              console.log('loadUserProfile: Waiting for session to propagate...');
              await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt, SESSION_PROPAGATION_RETRY_DELAY)));
              continue;
            }
          }
          
          // If not found and we have retries left, wait before retry with linear backoff
          if (attempt < retries && (error.code === 'PGRST116' || error.message?.includes('not found'))) {
            console.log(`loadUserProfile: Profile not found, waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt, SESSION_PROPAGATION_DELAY)));
            continue;
          }
          
          throw new Error(`Failed to load user profile: ${error.message}`);
        }

        if (!data) {
          console.error('loadUserProfile: User profile not found for ID:', userId);
          lastError = new Error('User profile not found');
          
          if (attempt < retries) {
            console.log(`loadUserProfile: No data returned, waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt, SESSION_PROPAGATION_DELAY)));
            continue;
          }
          
          throw new Error('User profile not found. Please contact support.');
        }

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
        console.error(`loadUserProfile: Error in loadUserProfile (attempt ${attempt + 1}):`, error);
        lastError = error;
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, calculateRetryDelay(attempt, SESSION_PROPAGATION_DELAY)));
          continue;
        }
      }
    }
    
    // All retries exhausted
    console.error('loadUserProfile: All retry attempts exhausted');
    setUser(null);
    throw lastError || new Error('Failed to load user profile after multiple attempts');
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
        try {
          await ensureUserProfile(supabase, session.user);
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
   */
  const login = async (email: string, password: string) => {
    try {
      console.log('login: Starting login for:', email);
      
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('login: Auth error:', {
          message: error.message,
          status: error.status,
        });
        throw error;
      }

      if (!data?.user) {
        throw new Error('Login failed: No user data returned');
      }

      console.log('login: Auth successful, session established');
      
      // IMPORTANT: Wait for session to propagate to database connections
      // This ensures RLS policies can properly access auth.uid()
      console.log('login: Waiting for session to propagate...');
      await new Promise(resolve => setTimeout(resolve, SESSION_PROPAGATION_DELAY));

      console.log('login: Now loading profile');

      // Load user profile with proper error handling and retries
      try {
        await loadUserProfile(data.user.id, 2); // 2 retries for a total of 3 attempts
        console.log('login: Profile loaded successfully');
      } catch (profileError) {
        console.error('login: Profile loading failed after retries:', profileError);
        reportError(profileError, {
          operation: 'load_profile_after_login',
          userId: data.user.id,
        });
        
        // If profile doesn't exist, try to create it using different methods
        try {
          console.log('login: Attempting to create missing profile');
          
          // Try using the RPC function first
          try {
            const { error: rpcError } = await supabase.rpc('create_user_profile', {
              p_user_id: data.user.id,
              p_email: email,
              p_phone: data.user.user_metadata?.phone || `temp_${data.user.id.substring(0, 12)}`,
              p_full_name: data.user.user_metadata?.full_name || email.split('@')[0],
            });
            
            if (rpcError && !isDuplicateError(rpcError)) {
              console.warn('login: RPC function failed, trying direct insert:', rpcError.message);
              throw rpcError;
            }
            
            console.log('login: Profile created via RPC function');
          } catch (rpcError) {
            // Fallback to ensureUserProfile if RPC fails
            console.log('login: RPC failed, falling back to ensureUserProfile');
            await ensureUserProfile(supabase, data.user);
          }
          
          // Wait for the profile to be fully committed AND session to propagate
          await new Promise(resolve => setTimeout(resolve, SESSION_PROPAGATION_RETRY_DELAY));
          
          // Try loading profile again with retries
          console.log('login: Retrying profile load after creation');
          await loadUserProfile(data.user.id, 2);
          console.log('login: Profile loaded successfully after creation');
        } catch (createError) {
          console.error('login: Failed to create/load profile:', createError);
          reportError(createError, {
            operation: 'create_missing_profile',
            userId: data.user.id,
          });
          
          // Sign out to prevent broken state
          await supabase.auth.signOut();
          
          throw new Error('Unable to access your account. Your profile may not exist. Please contact support or try signing up again.');
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
        console.error('Signup auth error:', {
          message: error?.message,
          status: error?.status,
        });
        throw error || new Error('Signup failed: No user data returned');
      }

      // Check if email confirmation is required
      const needsEmailConfirmation = data.user && !data.session;
      
      console.log('Signup successful:', {
        userId: data.user.id,
        email: data.user.email,
        needsEmailConfirmation,
      });

      // Create user profile in database with fallback mechanisms
      try {
        console.log('signUp: Creating user profile in database');
        
        // Try using RPC function first
        const { error: rpcError } = await supabase.rpc('create_user_profile', {
          p_user_id: data.user.id,
          p_email: email,
          p_phone: phone,
          p_full_name: fullName,
        });

        // Only throw on actual errors (not duplicate key or function missing)
        if (rpcError) {
          console.warn('signUp: RPC function issue:', rpcError.message);
          
          // Check if the function doesn't exist in the database
          if (rpcError.message?.includes('Could not find the function') || 
              rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')) {
            console.log('signUp: RPC function not found, trying direct insert as fallback');
            
            // Fallback: Try direct insert (will work if user has INSERT permission)
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: email,
                phone: phone,
                full_name: fullName,
                is_verified: false,
                is_active: true,
                kyc_status: 'not_started',
              });
            
            if (insertError && !isDuplicateError(insertError)) {
              console.error('signUp: Direct insert also failed:', insertError);
              throw new Error(
                'Database setup incomplete. Please ensure the create_user_profile function exists in your Supabase database. See supabase/migrations/2026-01-08-add-user-creation-trigger.sql'
              );
            }
            
            console.log('signUp: Profile created via direct insert');
          } else if (!isDuplicateError(rpcError)) {
            throw rpcError;
          } else {
            console.log('signUp: Profile already exists (duplicate), continuing');
          }
        } else {
          console.log('signUp: User profile created successfully via RPC');
        }
      } catch (profileCreationError) {
        console.error('signUp: Failed to create user profile:', profileCreationError);
        
        // Sign out the auth user since profile creation failed
        await supabase.auth.signOut();
        
        throw new Error(
          `Failed to create user profile: ${profileCreationError instanceof Error ? profileCreationError.message : 'Unknown error'}. Please contact support.`
        );
      }

      // If email confirmation is required, don't try to load profile yet
      // The user will need to confirm their email first
      if (needsEmailConfirmation) {
        console.log('Email confirmation required - profile will be loaded after confirmation');
        throw new Error('CONFIRMATION_REQUIRED:Please check your email to confirm your account before signing in.');
      }

      // Load the user profile only if we have an active session
      if (data.session) {
        try {
          console.log('signUp: Loading user profile after signup');
          
          // Wait a moment for the profile to be fully committed
          await new Promise(resolve => setTimeout(resolve, PROFILE_COMMIT_DELAY));
          
          await loadUserProfile(data.user.id, 2); // Use retries
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
        console.log('User signed in via auth state change, loading profile for:', session.user.id);
        try {
          await loadUserProfile(session.user.id, 2);
          console.log('Profile loaded successfully after sign in via auth state change');
        } catch (error) {
          console.error('Error loading profile on auth state change:', error);
          // Try to create the profile if it doesn't exist
          try {
            console.log('Attempting to create missing profile...');
            
            // Try RPC first
            try {
              const { error: rpcError } = await supabase.rpc('create_user_profile', {
                p_user_id: session.user.id,
                p_email: session.user.email || '',
                p_phone: session.user.user_metadata?.phone || `temp_${session.user.id.substring(0, 12)}`,
                p_full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              });
              
              if (rpcError && !isDuplicateError(rpcError)) {
                console.warn('RPC failed, using ensureUserProfile:', rpcError.message);
                throw rpcError;
              }
            } catch (rpcErr) {
              await ensureUserProfile(supabase, session.user);
            }
            
            await new Promise(resolve => setTimeout(resolve, PROFILE_COMMIT_DELAY));
            await loadUserProfile(session.user.id, 2);
            console.log('Profile created and loaded successfully');
          } catch (createError) {
            console.error('Failed to create profile on auth state change:', createError);
            // If profile creation fails, sign out to prevent broken state
            await supabase.auth.signOut();
          }
        }
      }
      
      // Handle token refresh
      if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('Token refreshed, reloading profile');
        try {
          await loadUserProfile(session.user.id, 1); // Fewer retries for refresh
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

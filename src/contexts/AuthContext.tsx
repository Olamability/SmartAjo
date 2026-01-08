'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { createClient } from '@/lib/client/supabase';
import { withTimeout } from '@/lib/utils';
import { AUTH_SESSION_TIMEOUT, USER_DATA_FETCH_TIMEOUT } from '@/lib/constants/timeout';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const refreshUser = async () => {
    try {
      // Get session with timeout (30 seconds for financial app security)
      const sessionResponse = await withTimeout(
        supabase.auth.getSession(),
        AUTH_SESSION_TIMEOUT,
        'Session check timed out. Please check your internet connection and try again.'
      );
      
      const { data: { session } } = sessionResponse;
      
      if (session?.user) {
        // Fetch user details from database using Supabase with timeout (15 seconds)
        const fetchPromise = supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        const fetchResponse = await withTimeout(
          fetchPromise as unknown as Promise<any>,
          USER_DATA_FETCH_TIMEOUT,
          'Unable to load user data. Please check your internet connection and try again.'
        );
        
        const { data: userData, error: fetchError } = fetchResponse;
        
        // Handle fetch errors
        if (fetchError) {
          console.error('Failed to fetch user:', fetchError);
          // Check if it's an RLS policy error (insufficient permissions)
          if (fetchError.code === 'PGRST301' || fetchError.message?.includes('permission')) {
            console.error('RLS policy may be blocking access. Check Supabase RLS policies.');
          }
          setUser(null);
          return;
        }
        
        if (userData) {
          setUser({
            id: userData.id,
            email: userData.email,
            phone: userData.phone,
            fullName: userData.full_name,
            createdAt: userData.created_at,
            isVerified: userData.is_verified,
            kycStatus: userData.kyc_status,
            bvn: userData.kyc_data?.bvn,
            profileImage: userData.avatar_url,
          });
          return;
        }
      }
      
      setUser(null);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // On timeout or unexpected errors, clear user state
      // This prevents the app from getting stuck
      setUser(null);
    }
  };

  const logoutUser = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Initialize user from session
    refreshUser().finally(() => setLoading(false));

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    setUser,
    refreshUser,
    logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

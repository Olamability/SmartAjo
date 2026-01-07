'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { createClient } from '@/lib/supabase/client';

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch user details from our backend
        const response = await fetch('/api/users/me');
        
        // Handle network errors
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // User is not authenticated or session expired
            setUser(null);
            return;
          }
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setUser(result.data);
          return;
        }
      }
      
      setUser(null);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      // On network or unexpected errors, clear user state
      setUser(null);
    }
  };

  const logoutUser = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Call logout API to clean up any server-side state
      await fetch('/api/auth/logout', { method: 'POST' });
      
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

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { getAuthUser, isAuthenticated as checkAuth, logout } from '@/services/auth';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => void;
  logoutUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = () => {
    const currentUser = getAuthUser();
    setUser(currentUser);
  };

  const logoutUser = async () => {
    await logout();
    setUser(null);
  };

  useEffect(() => {
    // Initialize user from storage
    refreshUser();
    setLoading(false);

    // Listen for Supabase auth state changes
    try {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Session is managed, but we still rely on our backend for user details
          refreshUser();
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to initialize Supabase auth listener:', error);
      // Continue without auth state listener - app will still work with manual refresh
      setLoading(false);
    }
  }, []);

  const value = {
    user,
    isAuthenticated: checkAuth(),
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

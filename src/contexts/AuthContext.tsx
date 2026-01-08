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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load user profile from DB
   */
  const loadUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Failed to load user profile:', error);
      setUser(null);
      return;
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
  };

  /**
   * Refresh session + user
   */
  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session?.user) {
      setUser(null);
      return;
    }

    await loadUserProfile(session.user.id);
  };

  /**
   * LOGIN
   */
  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    await loadUserProfile(data.user.id);
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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error || !data.user) throw error;

    // Create profile
    const { error: insertError } = await supabase.from('users').insert({
      id: data.user.id,
      email,
      full_name: fullName,
      phone,
      role: 'tenant', // default
    });

    if (insertError) throw insertError;

    await loadUserProfile(data.user.id);
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
    refreshUser().finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }

      if (event === 'SIGNED_IN' && session?.user) {
        await loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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

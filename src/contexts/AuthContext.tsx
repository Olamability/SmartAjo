'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { getAuthUser, isAuthenticated as checkAuth, logout } from '@/services/auth';

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

  const logoutUser = () => {
    logout();
    setUser(null);
  };

  useEffect(() => {
    refreshUser();
    setLoading(false);
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

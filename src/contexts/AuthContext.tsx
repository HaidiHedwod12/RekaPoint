import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthUser } from '../types';
import { getCurrentUser, login as authLogin, logout as authLogout } from '../lib/auth';
import { supabase, enableRealtime } from '../lib/supabase';
import { unsubscribeAll } from '../lib/database';
import { getMonthlySettings } from '../lib/database';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  getMonthlyUserSettings: (month: number, year: number) => Promise<{ minimal_poin: number; can_view_poin: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const authUser = await authLogin(username, password);
      setUser(authUser.user);
      // Set user context for database operations
      await supabase.rpc('set_current_user', { user_id: authUser.user.id });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const getMonthlyUserSettings = async (month: number, year: number) => {
    if (!user) {
      return { minimal_poin: 150, can_view_poin: false };
    }
    
    try {
      return await getMonthlySettings(user.id, month, year);
    } catch (error) {
      console.error('Error getting monthly settings:', error);
      return { minimal_poin: user.minimal_poin || 150, can_view_poin: user.can_view_poin || false };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, getMonthlyUserSettings }}>
      {children}
    </AuthContext.Provider>
  );
};
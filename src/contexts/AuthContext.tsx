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
        
        if (currentUser) {
          // Mark session as active
          sessionStorage.setItem('app_session_active', 'true');
        }
        
        setUser(currentUser);
        
        // Enable realtime when user is loaded
        if (currentUser) {
          enableRealtime();
          
          // Subscribe to user updates for current user
          const userSubscription = supabase
            .channel('user-updates')
            .on('broadcast', { event: 'user_updated' }, (payload: any) => {
              console.log('User update received:', payload);
              if (payload.payload?.id === currentUser.id) {
                setUser(payload.payload);
              }
            })
            .on('broadcast', { event: 'minimal_poin_updated' }, (payload: any) => {
              console.log('Minimal poin update received:', payload);
              if (payload.payload?.userId === currentUser.id) {
                setUser(prev => prev ? { ...prev, minimal_poin: payload.payload.minimalPoin } : null);
              }
            })
            .on('broadcast', { event: 'can_view_poin_updated' }, (payload: any) => {
              console.log('Can view poin update received:', payload);
              if (payload.payload?.userId === currentUser.id) {
                setUser(prev => prev ? { ...prev, can_view_poin: payload.payload.canViewPoin } : null);
              }
            })
            .subscribe();
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Clear any invalid session
        authLogout();
        sessionStorage.removeItem('app_session_active');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    
    // Set up beforeunload listener to detect tab close
    const handleBeforeUnload = () => {
      // Clear session marker when tab is about to close
      sessionStorage.removeItem('app_session_active');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeAll();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const authUser = await authLogin(username, password);
      setUser(authUser.user);
      
      // Mark session as active after successful login
      sessionStorage.setItem('app_session_active', 'true');
      
      // Set user context for database operations
      await supabase.rpc('set_current_user', { user_id: authUser.user.id });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authLogout();
    setUser(null);
    // Clear session marker on logout
    sessionStorage.removeItem('app_session_active');
    // Cleanup all subscriptions on logout
    unsubscribeAll();
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
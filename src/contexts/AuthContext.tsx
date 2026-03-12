import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { getCurrentUser, login as authLogin, logout as authLogout } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
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
      // Cek apakah sesi aktif di tab ini
      const sessionActive = sessionStorage.getItem('app_session_active');

      if (!sessionActive) {
        // Jika tidak ada sesi aktif (tab baru), logout
        authLogout();
        setUser(null);
        setLoading(false);
        return;
      }
      
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
      // Tandai sesi sebagai aktif di sessionStorage
      sessionStorage.setItem('app_session_active', 'true');
      await supabase.rpc('set_current_user', { user_id: authUser.user.id });
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authLogout();
    setUser(null);
    // Hapus tanda sesi saat logout
    sessionStorage.removeItem('app_session_active');
  };



  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
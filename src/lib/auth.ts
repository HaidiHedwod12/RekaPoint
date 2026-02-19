import { supabase, supabaseAdmin, checkSupabaseConnection } from './supabase';
import { User, AuthUser } from '../types';
import Cookies from 'js-cookie';

export const login = async (username: string, password: string): Promise<AuthUser> => {
  try {
    console.log('Attempting login for username:', username);

    // First authenticate with Supabase Auth using email/password
    // const email = `${username.trim().toLowerCase()}@rekapoint.local`;

    // Skip Supabase auth for now, use direct database login
    console.log('Using direct database login for:', username);

    // Get user from database using admin client to bypass RLS
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle();

    console.log('Database query result:', { userData, userError });

    if (userError) {
      console.error('Database error:', userError);
      throw new Error('Error mengakses database: ' + userError.message);
    }

    if (!userData) {
      console.log('User not found for username:', username);
      throw new Error('Username tidak ditemukan');
    }

    console.log('User found, checking password...');

    // Check password
    if (userData.password_hash !== password.trim()) {
      console.log('Password mismatch');
      throw new Error('Password salah');
    }

    console.log('Login successful for user:', userData.nama);

    // Set user context for RLS using admin client
    try {
      await supabaseAdmin.rpc('set_current_user', { user_id: userData.id });
      console.log('User context set successfully');
    } catch (contextError) {
      console.log('Could not set user context:', contextError);
      // Continue anyway - not critical for basic functionality
    }

    const token = generateToken(userData);
    Cookies.set('auth_token', token, { expires: 7 });

    return {
      user: userData,
      token
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = async () => {
  // Sign out from Supabase
  await supabase.auth.signOut();
  // Remove cookie
  Cookies.remove('auth_token');
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const token = Cookies.get('auth_token');
    if (!token) return null;

    const userData = parseToken(token);
    return userData;
  } catch (error) {
    // Clear invalid token
    Cookies.remove('auth_token');
    return null;
  }
};

const generateToken = (user: User): string => {
  // Simple token generation - in production, use proper JWT
  return btoa(JSON.stringify(user));
};

const parseToken = (token: string): User => {
  try {
    return JSON.parse(atob(token));
  } catch (error) {
    throw new Error('Invalid token');
  }
};
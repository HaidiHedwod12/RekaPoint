import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create a single instance to avoid multiple client warnings
let supabaseInstance: any = null;
let supabaseAdminInstance: any = null;
export const supabase = supabaseInstance || (supabaseInstance = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    realtime: {
      enabled: true,
      params: {
        eventsPerSecond: 10,
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: 1000
      }
    },
    db: {
      schema: 'public'
    }
    }
));

// Create admin client with service role for admin operations
export const supabaseAdmin = supabaseAdminInstance || (supabaseAdminInstance = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
    }
));

// Enhanced realtime connection with better error handling
export const enableRealtime = () => {
  console.log('Enabling Supabase realtime...');
  
  const channel = supabase.channel('public:*')
    .subscribe((status) => {
      console.log('Realtime connection status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime connection established successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime connection error');
      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Realtime connection timed out');
      } else if (status === 'CLOSED') {
        console.log('🔒 Realtime connection closed');
      }
    });
    
  return channel;
};

export const checkSupabaseConnection = () => {
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder') || supabaseKey.includes('placeholder')) {
    console.error('Supabase connection not configured properly');
    return false;
  }
  console.log('Supabase connection configured');
  return true;
};

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    const { data, error } = await supabase
      .from('judul')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
};
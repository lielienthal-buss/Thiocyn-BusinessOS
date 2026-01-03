import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase Client Configuration
 * 
 * IMPORTANT: For the 'Admin Login' to work, you MUST provide 
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY 
 * in your environment variables.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * Helper to check if the app is connected to a real Supabase instance.
 * Useful for toggling between "Demo Mode" and "Live Mode" in the UI.
 */
export const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !url.includes('placeholder') && !!key && !key.includes('placeholder');
};

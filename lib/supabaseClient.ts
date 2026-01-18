import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debugging log (remove later)
console.log('Supabase Config Check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  mode: import.meta.env.MODE
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing. Check .env variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to check if the app is connected to a real Supabase instance.
 * This function will now rely directly on the presence of the VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * being correctly set in the environment.
 */
export const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !url.includes('placeholder') && !!key && !key.includes('placeholder');
};
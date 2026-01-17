import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Supabase Client Configuration
// Directly using import.meta.env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// as per user's instruction.

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
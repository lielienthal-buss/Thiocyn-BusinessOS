import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase Client Configuration
 * 
 * IMPORTANT: For the 'Admin Login' to work, you MUST provide 
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY 
 * in your environment variables.
 */

const getEnv = (key: string) => {
  // Vite client-side
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const vite = import.meta.env[`VITE_${key}`];
    if (vite) return vite;
  }

  // Next.js client/server or Node server
  try {
    const nextPublic = (globalThis as any)?.process?.env?.[`NEXT_PUBLIC_${key}`];
    if (nextPublic) return nextPublic;
    const plain = (globalThis as any)?.process?.env?.[key];
    if (plain) return plain;
  } catch (e) { /* ignore */ }

  return null;
};

const supabaseUrl = getEnv('SUPABASE_URL') || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to check if the app is connected to a real Supabase instance.
 * Useful for toggling between "Demo Mode" and "Live Mode" in the UI.
 */
export const isSupabaseConfigured = () => {
  const url = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY');
  return !!url && !url.includes('placeholder') && !!key && !key.includes('placeholder');
};
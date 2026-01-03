import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Supabase Client Configuration
 * Optimized for Vercel deployment using NEXT_PUBLIC_ prefix for client-side access.
 * Fallback to standard process.env for server-side / build-time environments.
 */

const getEnv = (key: string) => {
  try {
    // Check for Vercel/Next.js style public variables first
    const publicValue = (globalThis as any).process?.env?.[`NEXT_PUBLIC_${key}`];
    if (publicValue) return publicValue;

    // Check for standard variables
    return (globalThis as any).process?.env?.[key] || null;
  } catch (e) {
    return null;
  }
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
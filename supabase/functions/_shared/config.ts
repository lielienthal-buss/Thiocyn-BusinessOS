import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AppConfig {
  company_name: string;
  program_name: string;
  from_email: string;
  from_name: string;
  app_url: string;
  logo_url: string | null;
  calendly_url: string | null;
  ai_instruction: string | null;
  feature_flags: Record<string, boolean>;
}

const DEFAULTS: AppConfig = {
  company_name: 'Company',
  program_name: 'Internship Program',
  from_email: Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@example.com',
  from_name: 'Hiring Team',
  app_url: Deno.env.get('APP_URL') || 'https://localhost',
  logo_url: null,
  calendly_url: null,
  ai_instruction: null,
  feature_flags: { kanban: true, ai_analysis: true, onboarding: true, public_positions: true },
};

export async function getConfig(supabase: SupabaseClient): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('recruiter_settings')
    .select('company_name, program_name, from_email, from_name, app_url, logo_url, calendly_url, ai_instruction, feature_flags')
    .eq('id', 1)
    .single();

  if (error || !data) return DEFAULTS;

  return {
    company_name: data.company_name || DEFAULTS.company_name,
    program_name: data.program_name || DEFAULTS.program_name,
    from_email: data.from_email || DEFAULTS.from_email,
    from_name: data.from_name || DEFAULTS.from_name,
    app_url: data.app_url || DEFAULTS.app_url,
    logo_url: data.logo_url || null,
    calendly_url: data.calendly_url || null,
    ai_instruction: data.ai_instruction || null,
    feature_flags: data.feature_flags || DEFAULTS.feature_flags,
  };
}

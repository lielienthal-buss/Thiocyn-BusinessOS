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
  funnel_owners: Record<string, string | null>;
}

const DEFAULTS: AppConfig = {
  company_name: 'Company',
  program_name: 'Internship Program',
  from_email: Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@example.com',
  from_name: 'Hiring Team',
  app_url: Deno.env.get('APP_URL') || 'https://thiocyn-businessos.vercel.app',
  logo_url: null,
  calendly_url: null,
  ai_instruction: null,
  feature_flags: { kanban: true, ai_analysis: true, onboarding: true, public_positions: true },
  funnel_owners: {},
};

export async function getConfig(supabase: SupabaseClient): Promise<AppConfig> {
  const { data, error } = await supabase
    .from('recruiter_settings')
    .select('company_name, program_name, from_email, from_name, app_url, logo_url, calendly_url, ai_instruction, feature_flags, funnel_owners')
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
    funnel_owners: data.funnel_owners || {},
  };
}

/** Resolve the Calendly link for a given funnel-table-name.
 *  Looks up funnel_owners[funnelKey] -> team_members.calendly_url,
 *  falls back to recruiter_settings.calendly_url if no owner set or owner has no link. */
export async function resolveFunnelCalendlyUrl(
  supabase: SupabaseClient,
  config: AppConfig,
  funnelKey: string
): Promise<string | null> {
  const ownerId = config.funnel_owners?.[funnelKey];
  if (ownerId) {
    const { data } = await supabase
      .from('team_members')
      .select('calendly_url')
      .eq('id', ownerId)
      .maybeSingle();
    if (data?.calendly_url) return data.calendly_url;
  }
  return config.calendly_url || null;
}

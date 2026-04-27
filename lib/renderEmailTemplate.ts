import { supabase } from './supabaseClient';
import type { Application } from '@/types';

export interface RenderedEmail {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  bodyHtml: string;
  bodyPlain: string;
  calendlyUrlUsed: string | null;
  templateFound: boolean;
}

interface TemplateRow {
  slug: string;
  subject: string;
  body: string;
}

interface SettingsRow {
  company_name: string | null;
  program_name: string | null;
  from_name: string | null;
  from_email: string | null;
  app_url: string | null;
  calendly_url: string | null;
  funnel_owners: Record<string, string | null> | null;
}

async function fetchTemplate(slug: string, lang: 'de' | 'en'): Promise<TemplateRow | null> {
  const localizedSlug = `${slug}_${lang}`;
  const { data: localized } = await supabase
    .from('email_templates')
    .select('slug, subject, body')
    .eq('slug', localizedSlug)
    .maybeSingle();
  if (localized) return localized;
  // Fallback: base slug (currently English in DB)
  const { data: base } = await supabase
    .from('email_templates')
    .select('slug, subject, body')
    .eq('slug', slug)
    .maybeSingle();
  return base ?? null;
}

async function fetchSettings(): Promise<SettingsRow | null> {
  const { data } = await supabase
    .from('recruiter_settings')
    .select('company_name, program_name, from_name, from_email, app_url, calendly_url, funnel_owners')
    .eq('id', 1)
    .maybeSingle();
  return (data as SettingsRow) ?? null;
}

async function resolveOwnerCalendly(ownerId: string | null | undefined): Promise<string | null> {
  if (!ownerId) return null;
  const { data } = await supabase
    .from('team_members')
    .select('calendly_url')
    .eq('id', ownerId)
    .maybeSingle();
  return (data?.calendly_url as string | null) ?? null;
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function applyVars(text: string, vars: Record<string, string>): string {
  let out = text;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
  }
  return out;
}

export async function renderEmailForApplication(
  application: Pick<Application, 'id' | 'full_name' | 'email' | 'access_token'>,
  templateSlug: string,
  lang: 'de' | 'en' = 'de',
  funnelKey: string = 'applications'
): Promise<RenderedEmail> {
  // Custom (no-template) mode: empty body for ad-hoc messages from list view
  if (templateSlug === 'custom') {
    const settings = await fetchSettings();
    const greeting = lang === 'de'
      ? `Hallo ${application.full_name?.split(' ')[0] || 'zusammen'},`
      : `Hi ${application.full_name?.split(' ')[0] || 'there'},`;
    const signature = lang === 'de'
      ? `<br><br>Beste Grüße<br>${settings?.from_name || 'HSB Hiring Team'}`
      : `<br><br>Best regards<br>${settings?.from_name || 'HSB Hiring Team'}`;
    const subject = lang === 'de'
      ? `Zu deiner Bewerbung bei ${settings?.company_name || 'House of Sustainable Brands'}`
      : `Regarding your application to ${settings?.company_name || 'House of Sustainable Brands'}`;
    const bodyHtml = `<p>${greeting}</p><p></p><p>${signature}</p>`;
    return {
      to: application.email,
      fromName: settings?.from_name || 'Hiring Team',
      fromEmail: settings?.from_email || 'noreply@example.com',
      subject,
      bodyHtml,
      bodyPlain: htmlToPlain(bodyHtml),
      calendlyUrlUsed: null,
      templateFound: true,
    };
  }

  const [template, settings] = await Promise.all([
    fetchTemplate(templateSlug, lang),
    fetchSettings(),
  ]);

  const ownerId = settings?.funnel_owners?.[funnelKey] ?? null;
  const ownerCalendly = await resolveOwnerCalendly(ownerId);
  const calendlyUrl = ownerCalendly || settings?.calendly_url || null;

  const vars: Record<string, string> = {
    full_name: application.full_name || 'Candidate',
    task_link: `${settings?.app_url || ''}/task/${application.access_token || ''}`,
    calendly_url: calendlyUrl || '[CALENDLY-LINK FEHLT — bitte in Settings hinterlegen]',
    company_name: settings?.company_name || 'Company',
    program_name: settings?.program_name || 'Program',
  };

  const subjectRaw = template?.subject || `[Template "${templateSlug}" nicht gefunden]`;
  const bodyHtmlRaw = template?.body || `<p>Template "${templateSlug}" nicht in der DB gefunden.</p>`;

  const subject = applyVars(subjectRaw, vars);
  const bodyHtml = applyVars(bodyHtmlRaw, vars);
  const bodyPlain = htmlToPlain(bodyHtml);

  return {
    to: application.email,
    fromName: settings?.from_name || 'Hiring Team',
    fromEmail: settings?.from_email || 'noreply@example.com',
    subject,
    bodyHtml,
    bodyPlain,
    calendlyUrlUsed: calendlyUrl,
    templateFound: !!template,
  };
}

export const STAGE_AFTER_SEND: Record<string, string> = {
  task_invite: 'task_requested',
  interview_invite: 'interview',
  rejection: 'rejected',
  application_received: 'applied',
  offer: 'hired',
  // 'custom' has no automatic stage — user picks via "Mark as Sent"
};

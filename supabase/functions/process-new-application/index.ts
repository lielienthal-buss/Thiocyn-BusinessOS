// process-new-application
// Triggered by Supabase Database Webhooks on INSERT into:
//   - applications (Founders University)
//   - ambassador_applications
//   - ma_inquiries
//
// Single side effect: Slack notification ("neue Bewerbung").
// Bewerbungen werden manuell im Dashboard bearbeitet — keine Auto-Reply an Bewerber.
// Mail-Kontakt mit Bewerber startet erst nach Hire (siehe send-intern-invite).
//
// Setup: see docs/HIRING_FUNNEL_SETUP.md.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');
const APP_URL = Deno.env.get('APP_URL') ?? 'https://hsb-os.vercel.app';

type SupabaseWebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
};

const TABLE_LABEL: Record<string, string> = {
  applications: 'Founders University',
  ambassador_applications: 'Ambassador',
  ma_inquiries: 'M&A / Founders',
};

const TABLE_DASHBOARD_TAB: Record<string, string> = {
  applications: '/admin/dashboard',          // Recruiting → Applications
  ambassador_applications: '/admin/dashboard', // Ambassador
  ma_inquiries: '/admin/dashboard',          // Admin → M&A Inquiries
};

async function notifySlack(table: string, record: Record<string, unknown>): Promise<{ skipped: boolean; ok?: boolean }> {
  if (!SLACK_WEBHOOK_URL) return { skipped: true };

  const label = TABLE_LABEL[table] ?? table;
  const name = (record.full_name ?? record.founder_name ?? record.name ?? 'Unknown') as string;
  const email = (record.email ?? '?') as string;
  const extra = (record.company_name ?? record.handle ?? record.brand ?? '') as string;
  const dashboardUrl = `${APP_URL}${TABLE_DASHBOARD_TAB[table] ?? '/admin/dashboard'}`;

  const message = {
    text: `📨 Neue Bewerbung: ${label} · ${name}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*📨 Neue Bewerbung — ${label}*\n*${name}* · ${email}${extra ? ` · ${extra}` : ''}`,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Eingang: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} · <${dashboardUrl}|Im Dashboard öffnen ↗>` },
        ],
      },
    ],
  };

  const resp = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  return { skipped: false, ok: resp.ok };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = (await req.json()) as SupabaseWebhookPayload;

    if (payload.type !== 'INSERT') {
      return new Response(JSON.stringify({ skipped: true, reason: 'not an INSERT' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slackResult = await notifySlack(payload.table, payload.record).catch((e) => ({ skipped: false, ok: false, error: String(e) }));

    return new Response(
      JSON.stringify({ ok: true, slack: slackResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[process-new-application]', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

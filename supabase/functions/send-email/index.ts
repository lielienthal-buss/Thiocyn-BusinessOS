import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getConfig } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const {
      application_id,
      template_slug,
      lang = 'de',
      subject_override,
      body_override,
    } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // If both overrides provided → skip template lookup, app + config still needed for from/to
    const hasOverride = typeof subject_override === 'string' && typeof body_override === 'string';

    // Try language-specific template first (e.g. task_invite_de or task_invite_en), fall back to base slug
    const localizedSlug = `${template_slug}_${lang}`;
    const [appResult, localizedResult, config] = await Promise.all([
      supabase.from('applications').select('*').eq('id', application_id).single(),
      hasOverride
        ? Promise.resolve({ data: null })
        : supabase.from('email_templates').select('*').eq('slug', localizedSlug).maybeSingle(),
      getConfig(supabase),
    ]);

    if (appResult.error || !appResult.data) throw new Error('Application not found');
    const app = appResult.data;

    let subject: string;
    let body: string;

    if (hasOverride) {
      subject = subject_override;
      body = body_override;
    } else {
      const templateResult = !localizedResult.data
        ? await supabase.from('email_templates').select('*').eq('slug', template_slug).maybeSingle()
        : localizedResult;
      if (!templateResult.data) throw new Error('Template not found');
      const template = templateResult.data;
      const taskLink = `${config.app_url}/task/${app.access_token}`;
      subject = template.subject
        .replace(/\{\{full_name\}\}/g, app.full_name || 'Candidate')
        .replace(/\{\{company_name\}\}/g, config.company_name)
        .replace(/\{\{program_name\}\}/g, config.program_name);
      body = template.body
        .replace(/\{\{full_name\}\}/g, app.full_name || 'Candidate')
        .replace(/\{\{task_link\}\}/g, taskLink)
        .replace(/\{\{calendly_url\}\}/g, config.calendly_url || '[CALENDLY LINK]')
        .replace(/\{\{company_name\}\}/g, config.company_name)
        .replace(/\{\{program_name\}\}/g, config.program_name);
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.from_name} <${config.from_email}>`,
        to: app.email,
        subject,
        html: body,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Resend error: ${error}`);
    }

    const stageUpdates: Record<string, object> = {
      task_invite: { stage: 'task_requested', task_sent_at: new Date().toISOString() },
      interview_invite: { stage: 'interview' },
      rejection: { stage: 'rejected', decided_at: new Date().toISOString() },
    };

    if (stageUpdates[template_slug]) {
      await supabase.from('applications').update(stageUpdates[template_slug]).eq('id', application_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

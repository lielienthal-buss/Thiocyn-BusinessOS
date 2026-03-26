import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Read open tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date')
      .neq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(20);

    // Read new finance mails
    const { data: newMails } = await supabase
      .from('finance_mails')
      .select('id, sender, subject, preview, received_at, category, ai_priority')
      .eq('status', 'new')
      .order('received_at', { ascending: false })
      .limit(20);

    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

    const systemPrompt = `You are Emma, the time manager and personal assistant for Luis Lielienthal, Founders Associate at Hartlimes GmbH.

Rules:
- Work hours: 09:00–18:00
- 09:00–12:00 is deep work / booking window — NEVER schedule admin there
- 13:00–18:00 is Emma's management window
- Mo/Di are fully booked — do not suggest blocks on those days
- Max 4 time blocks per afternoon

Finance mail classification:
- invoice → forward_vanessa (Vanessa is the bookkeeper)
- reminder → urgent_luis (Luis must handle)
- dispute → urgent_luis (Luis must handle)
- info → no_action

Respond ONLY with valid JSON in exactly this structure:
{
  "blocks": [
    { "start": "13:00", "end": "14:00", "title": "Block title", "type": "admin|deep-work|call|review", "tasks": ["task id or description"] }
  ],
  "mailActions": [
    { "mailId": "id", "subject": "subject", "action": "forward_vanessa|urgent_luis|no_action", "category": "invoice|reminder|dispute|info|other", "priority": "high|normal|low" }
  ],
  "summary": "Emma's one-sentence daily briefing for Luis"
}`;

    const userContent = `Today is ${today}.

Open tasks (${tasks?.length ?? 0}):
${(tasks ?? []).map(t => `- [${t.id}] ${t.title} (status: ${t.status}, priority: ${t.priority ?? 'normal'}${t.due_date ? `, due: ${t.due_date}` : ''})`).join('\n') || 'None'}

New finance mails (${newMails?.length ?? 0}):
${(newMails ?? []).map(m => `- [${m.id}] From: ${m.sender} | Subject: ${m.subject}${m.preview ? ` | Preview: ${m.preview.substring(0, 100)}` : ''}`).join('\n') || 'None'}

Generate today's work plan and classify each finance mail.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text ?? '{}';

    // Parse JSON from response (handle potential markdown code blocks)
    let plan: { blocks: unknown[]; mailActions: unknown[]; summary: string };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      plan = JSON.parse(jsonMatch?.[0] ?? rawText);
    } catch {
      plan = { blocks: [], mailActions: [], summary: rawText };
    }

    return new Response(
      JSON.stringify(plan),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

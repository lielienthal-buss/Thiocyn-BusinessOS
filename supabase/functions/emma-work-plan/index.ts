import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callClaude(apiKey: string, system: string, user: string, maxTokens = 800): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text ?? '{}';
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? text);
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

    // Load data in parallel
    const [{ data: tasks }, { data: mails }] = await Promise.all([
      supabase.from('tasks').select('id, title, status, priority, due_date')
        .neq('status', 'done').order('created_at', { ascending: false }).limit(20),
      supabase.from('finance_mails').select('id, sender, subject, preview, received_at, category, ai_priority')
        .eq('status', 'new').order('received_at', { ascending: false }).limit(20),
    ]);

    const taskList = (tasks ?? []).map(t =>
      `- [${t.id}] ${t.title} (${t.status}, priority: ${t.priority ?? 'normal'}${t.due_date ? `, due: ${t.due_date}` : ''})`
    ).join('\n') || 'None';

    const mailList = (mails ?? []).map(m =>
      `- [${m.id}] From: ${m.sender} | Subject: ${m.subject}`
    ).join('\n') || 'None';

    // Two parallel Claude calls — one for blocks, one for mail classification
    const [blocksRaw, mailsRaw] = await Promise.all([
      callClaude(
        apiKey,
        `You are Emma, a work time management assistant. Today is ${today}.
Rules:
- Work hours: 09:00–18:00
- 09:00–12:00 = deep work / booking window — NEVER schedule admin there
- 13:00–18:00 = management window
- Mo/Di fully booked — no blocks on those days
- Max 4 blocks per afternoon

Return ONLY valid JSON:
{"blocks":[{"start":"13:00","end":"14:00","title":"Block title","type":"admin|deep-work|call|review","tasks":["task description"]}],"summary":"one sentence briefing"}`,
        `Today is ${today}.\n\nOpen tasks (${tasks?.length ?? 0}):\n${taskList}\n\nGenerate today's time blocks.`,
        600
      ),
      callClaude(
        apiKey,
        `Classify finance emails and recommend actions.
Rules:
- invoice → forward_accounting
- reminder → urgent_owner
- dispute → urgent_owner
- info → no_action

Return ONLY valid JSON:
{"mailActions":[{"mailId":"id","subject":"subject","action":"forward_accounting|urgent_owner|no_action","category":"invoice|reminder|dispute|info|other","priority":"high|normal|low"}]}`,
        `Classify these finance mails (${mails?.length ?? 0}):\n${mailList}`,
        600
      ),
    ]);

    const { blocks = [], summary = '' } = parseJson<{ blocks: unknown[]; summary: string }>(
      blocksRaw, { blocks: [], summary: '' }
    );
    const { mailActions = [] } = parseJson<{ mailActions: unknown[] }>(
      mailsRaw, { mailActions: [] }
    );

    return new Response(
      JSON.stringify({ blocks, mailActions, summary }),
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callClaude(apiKey: string, system: string, user: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text ?? '[]';
  } catch {
    return '[]';
  }
}

function parseJson<T>(text: string, fallback: T): T {
  try {
    const match = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? text);
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) return new Response(JSON.stringify({ error: 'Missing user_id' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
    const today = new Date().toISOString().split('T')[0];

    // Check cache
    const { data: cached } = await supabase
      .from('daily_briefings')
      .select('*')
      .eq('user_id', user_id)
      .eq('date', today)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load data in parallel
    const [{ data: financeMails }, { data: userMails }, { data: disputes }, { data: teamTasks }] = await Promise.all([
      supabase.from('finance_mails').select('id,sender,subject,preview,ai_priority,category,received_at')
        .eq('status', 'new').order('received_at', { ascending: false }).limit(20),
      supabase.from('user_mails').select('id,sender,subject,preview,ai_priority,category,received_at')
        .eq('user_id', user_id).eq('status', 'new').order('received_at', { ascending: false }).limit(20),
      supabase.from('disputes').select('id,brand,case_id,platform,amount,currency,deadline,status')
        .neq('status', 'resolved').order('deadline', { ascending: true }).limit(10),
      supabase.from('team_tasks').select('id,title,brand,assigned_to_email,status,priority,due_date')
        .neq('status', 'done').order('priority', { ascending: false }).limit(30),
    ]);

    if (!apiKey) {
      // No API key — return raw data without AI summaries
      const briefing = {
        user_id, date: today,
        finance: (financeMails ?? []).map(m => ({
          id: m.id, type: 'mail', priority: m.ai_priority ?? 'normal',
          title: m.subject, from: m.sender, category: m.category,
          recommendation: 'Prüfen', date: m.received_at,
        })).concat((disputes ?? []).map(d => ({
          id: d.id, type: 'dispute', priority: d.deadline && new Date(d.deadline) < new Date(Date.now() + 3 * 86400000) ? 'high' : 'normal',
          title: `${d.platform} – ${d.case_id}`, from: d.brand,
          category: 'dispute', recommendation: 'Frist prüfen',
          date: d.deadline,
        }))),
        mails: (userMails ?? []).map(m => ({
          id: m.id, priority: m.ai_priority ?? 'normal',
          title: m.subject, from: m.sender, category: m.category,
          recommendation: 'Prüfen', date: m.received_at,
        })),
        interns: (teamTasks ?? []).map(t => ({
          id: t.id, assignee: t.assigned_to_email ?? 'unassigned',
          title: t.title, brand: t.brand, status: t.status,
          priority: t.priority, due_date: t.due_date,
          recommendation: t.status === 'blocked' ? 'Geblockt – nachfassen' : t.due_date && new Date(t.due_date) < new Date() ? 'Überfällig' : 'Im Plan',
        })),
        summary: 'Briefing ohne KI-Zusammenfassung (kein API-Key)',
        generated_at: new Date().toISOString(),
      };

      await supabase.from('daily_briefings').upsert(briefing);
      return new Response(JSON.stringify(briefing), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build prompts
    const financeInput = [
      ...(financeMails ?? []).map(m => `[mail:${m.id}] ${m.subject} | Von: ${m.sender} | Kategorie: ${m.category} | Priorität: ${m.ai_priority}`),
      ...(disputes ?? []).map(d => `[dispute:${d.id}] ${d.platform} ${d.case_id} | ${d.brand} | ${d.amount}${d.currency} | Frist: ${d.deadline ?? 'keine'}`),
    ].join('\n') || 'Keine offenen Finance-Items';

    const mailsInput = (userMails ?? [])
      .map(m => `[${m.id}] ${m.subject} | Von: ${m.sender} | Kategorie: ${m.category}`)
      .join('\n') || 'Keine neuen Mails';

    const internInput = (teamTasks ?? [])
      .map(t => `[${t.id}] ${t.title} | ${t.assigned_to_email ?? 'unassigned'} | ${t.status} | Prio: ${t.priority} | Fällig: ${t.due_date ?? '–'}`)
      .join('\n') || 'Keine offenen Tasks';

    const today_de = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });

    // Three parallel Claude calls
    const [financeRaw, mailsRaw, internsRaw] = await Promise.all([
      callClaude(apiKey,
        `Du bist ein Finance-Assistent. Heute ist ${today_de}. Analysiere Finance-Mails und Disputes.
Gib eine priorisierte Liste zurück als JSON-Array:
[{"id":"original-id","type":"mail|dispute","priority":"high|normal|low","title":"kurzer Titel","from":"Absender","category":"Kategorie","recommendation":"konkrete Handlungsempfehlung in max 8 Worten","date":"ISO-Datum"}]
Nur JSON, keine Erklärung.`,
        financeInput),
      callClaude(apiKey,
        `Du bist ein Mail-Assistent. Heute ist ${today_de}. Analysiere eingehende Mails.
Gib eine priorisierte Liste zurück als JSON-Array:
[{"id":"original-id","priority":"high|normal|low","title":"kurzer Titel","from":"Absender","category":"Kategorie","recommendation":"konkrete Handlungsempfehlung in max 8 Worten","date":"ISO-Datum"}]
Nur JSON, keine Erklärung.`,
        mailsInput),
      callClaude(apiKey,
        `Du bist ein Team-Assistent. Heute ist ${today_de}. Analysiere Intern-Tasks.
Gib eine Liste zurück als JSON-Array:
[{"id":"task-id","assignee":"E-Mail oder Name","title":"Task-Titel","brand":"Brand","status":"status","priority":1-5,"due_date":"ISO oder null","recommendation":"Aktion in max 8 Worten"}]
Markiere überfällige Tasks und geblockte Tasks deutlich in der Empfehlung. Nur JSON.`,
        internInput),
    ]);

    const finance = parseJson<unknown[]>(financeRaw, []);
    const mails = parseJson<unknown[]>(mailsRaw, []);
    const interns = parseJson<unknown[]>(internsRaw, []);

    // Short summary
    const highFinance = finance.filter((f: any) => f.priority === 'high').length;
    const highMails = mails.filter((m: any) => m.priority === 'high').length;
    const blockedInterns = interns.filter((i: any) => String(i.recommendation).toLowerCase().includes('block') || String(i.recommendation).toLowerCase().includes('überfäll')).length;
    const summary = `${highFinance + highMails} dringende Items${blockedInterns > 0 ? `, ${blockedInterns} Intern${blockedInterns > 1 ? 's' : ''} geblockt/überfällig` : ''}.`;

    const briefing = { user_id, date: today, finance, mails, interns, summary, generated_at: new Date().toISOString() };
    await supabase.from('daily_briefings').upsert(briefing);

    return new Response(JSON.stringify(briefing), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

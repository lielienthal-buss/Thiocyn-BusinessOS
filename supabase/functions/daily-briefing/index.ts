import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

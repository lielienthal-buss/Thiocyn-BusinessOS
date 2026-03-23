import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { application_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: app, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (error || !app) throw new Error('Application not found');

    const prompt = `You are an HR assistant for Take A Shot GmbH, a holding company with 6 sustainable D2C brands.

Analyze this internship applicant briefly (max 120 words):

Name: ${app.full_name}
Project Highlight: ${app.project_highlight || 'Not provided'}
Personality Scores (BFI): ${JSON.stringify(app.psychometrics || {})}
Preferred Areas: ${(app.project_interest || []).join(', ') || 'Not specified'}
Work Sample: ${app.work_sample_text ? app.work_sample_text.substring(0, 500) : 'Not submitted'}

We value: ownership, proactivity, fast-paced execution, AI-savviness.
We avoid: people who wait for instructions, lack initiative.

Neuroticism note: ${(app.psychometrics?.neuroticism || 0) >= 80 ? '⚠️ HIGH neuroticism score — flag this.' : 'Within acceptable range.'}

Respond in this format:
VERDICT: [STRONG YES / YES / MAYBE / NO]
REASON: [2-3 sentences]
WATCH OUT: [1 potential concern or "None"]`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const geminiData = await geminiResponse.json();
    const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis failed';

    // Store AI score as a simple flag (1=strong yes, 0.75=yes, 0.5=maybe, 0.25=no)
    const verdictScores: Record<string, number> = {
      'STRONG YES': 100, 'YES': 75, 'MAYBE': 50, 'NO': 25,
    };
    const verdictMatch = analysis.match(/VERDICT:\s*(STRONG YES|YES|MAYBE|NO)/);
    const aiScore = verdictMatch ? (verdictScores[verdictMatch[1]] || 50) : 50;

    await supabase
      .from('applications')
      .update({ aiScore, ai_analysis: analysis })
      .eq('id', application_id);

    return new Response(JSON.stringify({ analysis, aiScore }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

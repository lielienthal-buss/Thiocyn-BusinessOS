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
    const { application_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [appResult, config] = await Promise.all([
      supabase.from('applications').select('*').eq('id', application_id).single(),
      getConfig(supabase),
    ]);

    if (appResult.error || !appResult.data) throw new Error('Application not found');
    const app = appResult.data;

    const companyContext = config.ai_instruction ||
      `${config.company_name} is a company running the ${config.program_name}. We value ownership, proactivity, fast-paced execution, and AI-savviness. We avoid people who wait for instructions or lack initiative.`;

    const prompt = `You are an HR assistant for ${config.company_name}.

${companyContext}

Analyze this internship applicant briefly (max 120 words):

Name: ${app.full_name}
Project Highlight: ${app.project_highlight || 'Not provided'}
Personality Scores (BFI): ${JSON.stringify(app.psychometrics || {})}
Preferred Areas: ${(app.project_interest || []).join(', ') || 'Not specified'}
Work Sample: ${app.work_sample_text ? app.work_sample_text.substring(0, 500) : 'Not submitted'}

Neuroticism note: ${(app.psychometrics?.neuroticism || 0) >= 80 ? '⚠️ HIGH neuroticism score — flag this.' : 'Within acceptable range.'}

Respond in this format:
VERDICT: [STRONG YES / YES / MAYBE / NO]
REASON: [2-3 sentences]
WATCH OUT: [1 potential concern or "None"]`;

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const analysis = claudeData.content?.[0]?.text || 'Analysis failed';

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

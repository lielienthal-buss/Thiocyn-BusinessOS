import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECTION_CONTEXT: Record<string, string> = {
  command:   'Command Center — high-level overview of all operations, KPIs, and alerts.',
  creative:  'Creative Studio — content creation, ad creatives, UGC, and campaign assets.',
  revenue:   'Revenue & Analytics — sales performance, ad spend, ROAS, and growth metrics.',
  hiring:    'Hiring & Academy — intern pipeline, onboarding, task tracking, and team management.',
  finance:   'Finance — invoices, disputes, payments, and financial reporting.',
  support:   'Support — customer inquiries, disputes, and ticket resolution.',
  admin:     'Admin — system configuration, user management, and platform settings.',
  account:   'Account — user account settings and preferences.',
  workspace: 'Workspace — files, notes, and team collaboration.',
};

const SYSTEM_PROMPT = (section: string): string => {
  const sectionInfo = SECTION_CONTEXT[section] ?? `${section} section of the dashboard.`;
  return `You are Jarvis, an AI operations assistant for a multi-brand D2C company managing 6 consumer brands. You support the company's owner-operator directly inside their Business OS dashboard.

Current context: ${sectionInfo}

Your operating principles:
- Be concise and direct. No filler, no preamble. Get to the point immediately.
- Prioritize actionable answers over explanations. When asked what to do, say what to do.
- You understand D2C e-commerce: Meta Ads, Shopify, content pipelines, creator programs, finance ops, and team management.
- When you lack data to give a specific answer, say so briefly and suggest the right next action.
- Use bullet points for multi-step answers. Keep total replies under 200 words unless explicitly asked for more detail.
- You are aware of the current dashboard section — tailor your answers to that context.
- Tone: professional, sharp, no fluff. Like a senior ops manager who respects people's time.`;
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { message, section = 'command', history = [] } = body as {
      message: string;
      section?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    // Validate required field
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return new Response(JSON.stringify({ error: 'Missing or empty message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build messages array: history + current message
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history.filter((m) => m.role === 'user' || m.role === 'assistant'),
      { role: 'user', content: message.trim() },
    ];

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT(section),
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: 'AI service error', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicRes.json();
    const reply: string = data.content?.[0]?.text ?? "I couldn't generate a response. Please try again.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('jarvis-chat error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

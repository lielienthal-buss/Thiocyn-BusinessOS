import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const DEPARTMENT_PROMPTS: Record<string, string> = {
  marketing: 'Du bist der AI-Senior für den Marketing-Intern bei Hart Limes GmbH. Antworte auf Deutsch. Konkret, praxisorientiert.',
  ecommerce: 'Du bist der AI-Senior für den E-Commerce-Intern bei Hart Limes GmbH. Fokus: Shopify, Listings, Fulfillment. Antworte auf Deutsch.',
  support: 'Du bist der AI-Senior für den Customer Support-Intern bei Hart Limes GmbH. Antworte auf Deutsch. Freundlich, lösungsorientiert.',
  analytics: 'Du bist der AI-Senior für den Analytics-Intern bei Hart Limes GmbH. Antworte auf Deutsch. Daten-fokussiert.',
  finance: 'Du bist der AI-Senior für den Finance-Intern bei Hart Limes GmbH. Antworte auf Deutsch. Präzise, sachlich.',
  recruiting: 'Du bist der AI-Senior für den Recruiting-Intern bei Hart Limes GmbH. Antworte auf Deutsch. Potenzial-Erkennung.',
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 0.00000025, output: 0.00000125 },
  'claude-sonnet-4-6': { input: 0.000003, output: 0.000015 },
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, internId, department, model = 'claude-haiku-4-5-20251001' } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get intern account + budget
    const { data: intern, error: internErr } = await supabase
      .from('intern_accounts')
      .select('id, budget_tokens_monthly, is_active')
      .eq('id', internId)
      .single()

    if (internErr || !intern || !intern.is_active) {
      return new Response(JSON.stringify({ error: 'Intern account not found or inactive' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check current month usage
    const month = new Date().toISOString().slice(0, 7) // e.g. '2026-03'
    const { data: usage } = await supabase
      .from('intern_token_usage')
      .select('tokens_input, tokens_output')
      .eq('intern_id', internId)
      .eq('month', month)
      .maybeSingle()

    const totalUsed = (usage?.tokens_input ?? 0) + (usage?.tokens_output ?? 0)
    if (totalUsed >= intern.budget_tokens_monthly) {
      return new Response(JSON.stringify({ error: 'Monatliches Token-Budget aufgebraucht. Wende dich an den Admin.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Anthropic
    const systemPrompt = DEPARTMENT_PROMPTS[department] ?? 'Du bist ein hilfreicher AI-Assistent bei Hart Limes GmbH.'
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: systemPrompt,
        messages,
      }),
    })

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      return new Response(JSON.stringify({ error: anthropicData.error?.message ?? 'Anthropic API Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log token usage
    const inputTokens = anthropicData.usage?.input_tokens ?? 0
    const outputTokens = anthropicData.usage?.output_tokens ?? 0
    const costs = MODEL_COSTS[model] ?? MODEL_COSTS['claude-haiku-4-5-20251001']
    const costUsd = inputTokens * costs.input + outputTokens * costs.output

    await supabase.from('intern_token_usage').upsert({
      intern_id: internId,
      month,
      tokens_input: (usage?.tokens_input ?? 0) + inputTokens,
      tokens_output: (usage?.tokens_output ?? 0) + outputTokens,
      cost_usd: costUsd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'intern_id,month' })

    return new Response(JSON.stringify({
      content: anthropicData.content?.[0]?.text ?? '',
      usage: { input: inputTokens, output: outputTokens, cost_usd: costUsd },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MailAnalysis {
  sender_company: string | null;
  invoice_number: string | null;
  amount: string | null;
  currency: string | null;
  due_date: string | null;
  service_description: string | null;
  summary: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { mail_id } = await req.json();
    if (!mail_id) {
      return new Response(JSON.stringify({ error: 'mail_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load mail from DB
    const { data: mail, error: mailError } = await supabase
      .from('finance_mails')
      .select('id, sender, subject, preview, category, ai_priority, received_at')
      .eq('id', mail_id)
      .single();

    if (mailError || !mail) {
      return new Response(JSON.stringify({ error: 'Mail not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    const systemPrompt = `You are a finance assistant analyzing business emails.
Extract structured invoice/finance data.

Return ONLY valid JSON matching this exact structure:
{
  "sender_company": "company name or null",
  "invoice_number": "invoice/reference number or null",
  "amount": "formatted amount like '1.250,00' or null",
  "currency": "EUR/USD/GBP or null",
  "due_date": "YYYY-MM-DD or null",
  "service_description": "brief description of service/product or null",
  "summary": "one sentence summarizing this mail"
}`;

    const userContent = `Analyze this finance email:

From: ${mail.sender}
Subject: ${mail.subject}
Received: ${new Date(mail.received_at).toLocaleDateString('de-DE')}
Category: ${mail.category ?? 'unknown'}
${mail.preview ? `\nContent preview:\n${mail.preview}` : ''}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    const anthropicData = await res.json();
    const rawText = anthropicData.content?.[0]?.text ?? '{}';

    let analysis: MailAnalysis;
    try {
      const match = rawText.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match?.[0] ?? rawText);
    } catch {
      analysis = {
        sender_company: null,
        invoice_number: null,
        amount: null,
        currency: null,
        due_date: null,
        service_description: null,
        summary: mail.subject,
      };
    }

    // Store analysis in DB
    await supabase
      .from('finance_mails')
      .update({ ai_analysis: analysis })
      .eq('id', mail_id);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

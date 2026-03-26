import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ImapFlow } from 'npm:imapflow';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function classifyMail(
  apiKey: string,
  sender: string,
  subject: string,
  preview: string | null
): Promise<{ category: string; priority: string; action: string }> {
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
        max_tokens: 150,
        system: `Classify incoming finance emails. Return ONLY valid JSON with no explanation:
{"category":"invoice|reminder|dispute|info|other","priority":"high|normal|low","action":"forward_accounting|urgent_owner|no_action"}

Rules:
- invoice: bills, receipts, Rechnung, Faktura → forward_accounting
- reminder: overdue, Mahnung, Zahlungserinnerung → urgent_owner
- dispute: complaint, Einspruch, Streitfall → urgent_owner
- info: newsletters, confirmations → no_action`,
        messages: [
          {
            role: 'user',
            content: `From: ${sender}\nSubject: ${subject}${preview ? `\nPreview: ${preview.substring(0, 300)}` : ''}`,
          },
        ],
      }),
    });
    const data = await res.json();
    const text = data.content?.[0]?.text ?? '{}';
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? '{}');
  } catch {
    return { category: 'other', priority: 'normal', action: 'no_action' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!;
    const host = Deno.env.get('ALLINKL_IMAP_HOST')!;
    const port = parseInt(Deno.env.get('ALLINKL_IMAP_PORT') ?? '993');
    const user = Deno.env.get('ALLINKL_IMAP_USER')!;
    const password = Deno.env.get('ALLINKL_IMAP_PASS')!;

    const client = new ImapFlow({
      host,
      port,
      secure: true,
      auth: { user, pass: password },
      logger: false,
    });

    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    const mails: Array<{
      id: string;
      sender: string;
      subject: string;
      preview: string | null;
      received_at: string;
    }> = [];

    try {
      const messages = [];
      for await (const msg of client.fetch(
        '1:*',
        { envelope: true, bodyParts: ['TEXT'] },
        { uid: false }
      )) {
        messages.push(msg);
      }

      const recent = messages.slice(-30);

      for (const msg of recent) {
        const envelope = msg.envelope;
        if (!envelope) continue;

        const id = `imap-${envelope.messageId ?? `${envelope.date?.getTime()}-${Math.random()}`}`;
        const sender = envelope.from?.[0]
          ? `${envelope.from[0].name ?? ''} <${envelope.from[0].address ?? ''}>`.trim()
          : 'unknown';

        // Extract plain text preview from body
        let preview: string | null = null;
        try {
          const textBuf = msg.bodyParts?.get('TEXT');
          if (textBuf) {
            const raw = new TextDecoder().decode(textBuf);
            // Strip quoted-printable encoding artifacts and excess whitespace
            preview = raw
              .replace(/=\r?\n/g, '')
              .replace(/=[0-9A-Fa-f]{2}/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 600) || null;
          }
        } catch {
          // body fetch failed, continue without preview
        }

        mails.push({
          id: id.replace(/[<>]/g, ''),
          sender,
          subject: envelope.subject ?? '(no subject)',
          preview,
          received_at: envelope.date?.toISOString() ?? new Date().toISOString(),
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();

    // Insert new mails + classify each with Claude
    let inserted = 0;
    for (const mail of mails) {
      const { data: existing } = await supabase
        .from('finance_mails')
        .select('id')
        .eq('id', mail.id)
        .maybeSingle();

      if (!existing) {
        // Classify before inserting
        const classification = await classifyMail(
          anthropicKey,
          mail.sender,
          mail.subject,
          mail.preview
        );

        await supabase.from('finance_mails').insert({
          id: mail.id,
          sender: mail.sender,
          subject: mail.subject,
          preview: mail.preview,
          received_at: mail.received_at,
          status: 'new',
          category: classification.category ?? 'other',
          ai_priority: classification.priority ?? 'normal',
          ai_action: classification.action ?? 'no_action',
        });
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({ inserted, total: mails.length }),
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ImapFlow } from 'npm:imapflow';
import { classifyMail } from '../_shared/mail-classifier.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { imap_host, imap_port, imap_user, imap_pass, user_id, account_id } = await req.json();

    if (!imap_host || !imap_user || !imap_pass || !user_id) {
      return new Response(JSON.stringify({ error: 'Missing credentials' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const client = new ImapFlow({
      host: imap_host,
      port: imap_port ?? 993,
      secure: true,
      auth: { user: imap_user, pass: imap_pass },
      logger: false,
      // Prevent unhandled error events from crashing the Deno worker
      emitLogs: false,
    });

    // Catch error events so they don't crash the worker
    client.on('error', (err: Error) => {
      console.error('ImapFlow error event:', err.message);
    });

    const mails: Array<{
      id: string;
      sender: string;
      subject: string;
      preview: string | null;
      received_at: string;
    }> = [];

    try {
      // 30s connection timeout
      await fetchWithTimeout(client.connect(), 30_000);

      const lock = await fetchWithTimeout(client.getMailboxLock('INBOX'), 15_000);

      try {
        const messages = [];
        for await (const msg of client.fetch('1:*', { envelope: true, bodyParts: ['TEXT'] }, { uid: false })) {
          messages.push(msg);
        }

        for (const msg of messages.slice(-30)) {
          const envelope = msg.envelope;
          if (!envelope) continue;

          const id = `imap-${(envelope.messageId ?? `${envelope.date?.getTime()}-${Math.random()}`).replace(/[<>]/g, '')}`;
          const sender = envelope.from?.[0]
            ? `${envelope.from[0].name ?? ''} <${envelope.from[0].address ?? ''}>`.trim()
            : 'unknown';

          let preview: string | null = null;
          try {
            const textBuf = msg.bodyParts?.get('TEXT');
            if (textBuf) {
              preview = new TextDecoder().decode(textBuf)
                .replace(/=\r?\n/g, '').replace(/=[0-9A-Fa-f]{2}/g, ' ').replace(/\s+/g, ' ')
                .trim().substring(0, 600) || null;
            }
          } catch { /* skip */ }

          mails.push({
            id,
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
    } catch (imapErr) {
      // Try graceful close, ignore errors
      try { client.close(); } catch { /* ignore */ }
      throw imapErr;
    }

    // Upsert new mails with classification
    let inserted = 0;
    for (const mail of mails) {
      const { data: existing } = await supabase
        .from('user_mails')
        .select('id')
        .eq('id', mail.id)
        .eq('user_id', user_id)
        .maybeSingle();

      if (!existing) {
        const c = classifyMail(mail.sender, mail.subject, mail.preview);
        const category = c.category;
        const ai_priority = c.priority;
        await supabase.from('user_mails').insert({
          id: mail.id,
          user_id,
          account_id: account_id ?? null,
          sender: mail.sender,
          subject: mail.subject,
          preview: mail.preview,
          received_at: mail.received_at,
          status: 'new',
          category,
          ai_priority,
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

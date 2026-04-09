import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * finance-pipeline-webhook
 *
 * Unified webhook endpoint for the Finance Pipeline.
 * Called by Make.com scenarios to sync data from GMI and Qonto.
 *
 * Routes (via `source` field in JSON body):
 *   source: "gmi"   → Creates a new pipeline entry from a GMI invoice
 *   source: "qonto" → Matches an existing entry and marks it as paid
 *
 * Auth: Service role (called from Make, not browser).
 */

interface GmiPayload {
  source: 'gmi';
  vendor: string;
  invoice_number?: string;
  amount: number;
  currency?: string;
  entity: string;
  due_date?: string;
  notes?: string;
  received_at?: string;
}

interface QontoPayload {
  source: 'qonto';
  vendor: string;
  amount: number;
  currency?: string;
  paid_at?: string;
  transaction_id?: string;
}

type WebhookPayload = GmiPayload | QontoPayload;

// Normalize vendor name for matching (lowercase, trim, remove common suffixes)
function normalizeVendor(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*(gmbh|inc|ltd|ag|ug|e\.k\.|ohg|kg)\s*\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // Auth check: require a shared secret in the Authorization header
    const authHeader = req.headers.get('authorization') ?? '';
    const webhookSecret = Deno.env.get('FINANCE_WEBHOOK_SECRET');
    if (webhookSecret && !authHeader.includes(webhookSecret)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers }
      );
    }

    const body: WebhookPayload = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ─── GMI: New invoice received ───────────────────────────────────
    if (body.source === 'gmi') {
      const gmi = body as GmiPayload;

      if (!gmi.vendor || !gmi.amount || !gmi.entity) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: vendor, amount, entity' }),
          { status: 400, headers }
        );
      }

      // Check for duplicates (same vendor + amount + invoice_number within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let duplicateQuery = supabase
        .from('finance_pipeline')
        .select('id')
        .eq('vendor', gmi.vendor)
        .eq('amount', gmi.amount)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (gmi.invoice_number) {
        duplicateQuery = duplicateQuery.eq('invoice_number', gmi.invoice_number);
      }

      const { data: existing } = await duplicateQuery.limit(1);
      if (existing && existing.length > 0) {
        return new Response(
          JSON.stringify({ status: 'skipped', reason: 'duplicate', existing_id: existing[0].id }),
          { status: 200, headers }
        );
      }

      const { data, error } = await supabase.from('finance_pipeline').insert({
        vendor: gmi.vendor,
        invoice_number: gmi.invoice_number || null,
        amount: gmi.amount,
        currency: gmi.currency || 'EUR',
        entity: gmi.entity,
        due_date: gmi.due_date || null,
        notes: gmi.notes || null,
        received_at: gmi.received_at || new Date().toISOString().slice(0, 10),
      }).select('id').single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers }
        );
      }

      return new Response(
        JSON.stringify({ status: 'created', id: data.id }),
        { status: 201, headers }
      );
    }

    // ─── Qonto: Payment matched ─────────────────────────────────────
    if (body.source === 'qonto') {
      const qonto = body as QontoPayload;

      if (!qonto.vendor || !qonto.amount) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: vendor, amount' }),
          { status: 400, headers }
        );
      }

      const paidDate = qonto.paid_at || new Date().toISOString().slice(0, 10);
      const normalizedVendor = normalizeVendor(qonto.vendor);

      // Strategy 1: Exact match by vendor + amount + not yet paid
      const { data: exactMatches } = await supabase
        .from('finance_pipeline')
        .select('id, vendor')
        .eq('amount', qonto.amount)
        .is('paid_at', null)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(20);

      let matchId: string | null = null;

      if (exactMatches && exactMatches.length > 0) {
        // Find best vendor match
        const match = exactMatches.find(
          (m) => normalizeVendor(m.vendor) === normalizedVendor
        );
        if (match) {
          matchId = match.id;
        } else {
          // Fuzzy: check if vendor name contains or is contained
          const fuzzyMatch = exactMatches.find(
            (m) =>
              normalizeVendor(m.vendor).includes(normalizedVendor) ||
              normalizedVendor.includes(normalizeVendor(m.vendor))
          );
          if (fuzzyMatch) matchId = fuzzyMatch.id;
        }
      }

      if (!matchId) {
        // No match found — create a new entry with paid_at already set (Qonto-only entry)
        const { data: newEntry, error: insertErr } = await supabase
          .from('finance_pipeline')
          .insert({
            vendor: qonto.vendor,
            amount: qonto.amount,
            currency: qonto.currency || 'EUR',
            entity: 'thiocyn', // Default — can be corrected manually
            payment_method: 'qonto',
            paid_at: paidDate,
            notes: qonto.transaction_id
              ? `Qonto Tx: ${qonto.transaction_id}`
              : 'Auto-created from Qonto (no GMI match)',
          })
          .select('id')
          .single();

        if (insertErr) {
          return new Response(
            JSON.stringify({ error: insertErr.message }),
            { status: 500, headers }
          );
        }

        return new Response(
          JSON.stringify({ status: 'created_unmatched', id: newEntry.id }),
          { status: 201, headers }
        );
      }

      // Match found — update it
      const updatePayload: Record<string, unknown> = {
        paid_at: paidDate,
        payment_method: 'qonto',
      };
      if (qonto.transaction_id) {
        updatePayload.notes = `Qonto Tx: ${qonto.transaction_id}`;
      }

      const { error: updateErr } = await supabase
        .from('finance_pipeline')
        .update(updatePayload)
        .eq('id', matchId);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: updateErr.message }),
          { status: 500, headers }
        );
      }

      return new Response(
        JSON.stringify({ status: 'matched', id: matchId }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unknown source. Use "gmi" or "qonto".' }),
      { status: 400, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers }
    );
  }
});

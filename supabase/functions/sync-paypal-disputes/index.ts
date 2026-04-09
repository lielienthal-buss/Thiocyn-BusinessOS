import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * sync-paypal-disputes
 *
 * Fetches PayPal disputes and upserts them into the disputes table.
 * Reads PayPal credentials from integration_secrets table.
 *
 * Auth: verify_jwt: false (internal/cron use only).
 * Query params:
 *   ?status=OPEN (default) | ALL
 *   ?sync_details=true (default) | false
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // ─── Parse query params ──────────────────────────────────────
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status') || 'OPEN';
    const syncDetails = url.searchParams.get('sync_details') !== 'false';

    // ─── Supabase client ─────────────────────────────────────────
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    );

    // ─── Read PayPal credentials from integration_secrets ────────
    const [{ data: clientIdRow, error: e1 }, { data: clientSecretRow, error: e2 }] =
      await Promise.all([
        supabase
          .from('integration_secrets')
          .select('encrypted_value')
          .eq('integration', 'paypal')
          .eq('key_name', 'client_id')
          .maybeSingle(),
        supabase
          .from('integration_secrets')
          .select('encrypted_value')
          .eq('integration', 'paypal')
          .eq('key_name', 'client_secret')
          .maybeSingle(),
      ]);

    if (e1 || e2) {
      return new Response(
        JSON.stringify({ error: 'Failed to read PayPal credentials.', details: (e1 || e2)?.message }),
        { headers, status: 500 }
      );
    }

    if (!clientIdRow?.encrypted_value || !clientSecretRow?.encrypted_value) {
      return new Response(
        JSON.stringify({ error: 'PayPal credentials not configured in integration_secrets.' }),
        { headers, status: 404 }
      );
    }

    const clientId = clientIdRow.encrypted_value;
    const clientSecret = clientSecretRow.encrypted_value;

    // ─── Authenticate with PayPal Live API ───────────────────────
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      return new Response(
        JSON.stringify({ error: 'PayPal authentication failed.', status: tokenRes.status, details: errBody }),
        { headers, status: 502 }
      );
    }

    const { access_token } = await tokenRes.json();
    const ppHeaders = {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    };

    // ─── Determine which statuses to fetch ───────────────────────
    const disputeStatuses =
      statusParam === 'ALL'
        ? ['OPEN', 'WAITING_FOR_SELLER_RESPONSE', 'WAITING_FOR_BUYER_RESPONSE', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED']
        : ['OPEN', 'WAITING_FOR_SELLER_RESPONSE', 'WAITING_FOR_BUYER_RESPONSE', 'UNDER_REVIEW'];

    // ─── Fetch disputes (paginated, all statuses) ────────────────
    let allDisputes: any[] = [];

    for (const dsStatus of disputeStatuses) {
      let nextPageToken: string | null = null;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams({
          page_size: '50',
          status: dsStatus,
        });
        if (nextPageToken) {
          params.set('next_page_token', nextPageToken);
        }

        const listRes = await fetch(
          `https://api-m.paypal.com/v1/customer/disputes?${params}`,
          { headers: ppHeaders }
        );

        if (!listRes.ok) {
          // Some statuses may return 422 if not applicable — skip gracefully
          if (listRes.status === 422 || listRes.status === 400) {
            break;
          }
          const errBody = await listRes.text();
          return new Response(
            JSON.stringify({ error: `Failed to fetch disputes (status=${dsStatus}).`, details: errBody }),
            { headers, status: 502 }
          );
        }

        const listData = await listRes.json();
        const items = listData.items || [];
        allDisputes = allDisputes.concat(items);

        // Check for next page via HATEOAS links
        const nextLink = (listData.links || []).find((l: any) => l.rel === 'next');
        if (nextLink) {
          const nextUrl = new URL(nextLink.href);
          nextPageToken = nextUrl.searchParams.get('next_page_token');
          hasMore = !!nextPageToken;
        } else {
          hasMore = false;
        }
      }
    }

    // Deduplicate by dispute_id (a dispute may appear in multiple status queries)
    const seen = new Set<string>();
    allDisputes = allDisputes.filter((d) => {
      if (seen.has(d.dispute_id)) return false;
      seen.add(d.dispute_id);
      return true;
    });

    // ─── Fetch details for each dispute ──────────────────────────
    const detailedDisputes: any[] = [];

    if (syncDetails) {
      for (const dispute of allDisputes) {
        try {
          const detailRes = await fetch(
            `https://api-m.paypal.com/v1/customer/disputes/${dispute.dispute_id}`,
            { headers: ppHeaders }
          );
          if (detailRes.ok) {
            detailedDisputes.push(await detailRes.json());
          } else {
            // Fallback to list-level data
            detailedDisputes.push(dispute);
          }
        } catch {
          detailedDisputes.push(dispute);
        }
      }
    } else {
      detailedDisputes.push(...allDisputes);
    }

    // ─── Upsert into disputes table ──────────────────────────────
    let inserted = 0;
    let updated = 0;
    const results: any[] = [];

    for (const d of detailedDisputes) {
      // Extract transaction info
      const txInfo = d.disputed_transactions?.[0] || {};
      const transactionId = txInfo.buyer_transaction_id || txInfo.seller_transaction_id || null;

      // Try to extract Shopify order from invoice_number or custom field
      const invoiceNumber = txInfo.invoice_number || null;
      const customField = txInfo.custom || null;
      const shopifyOrderId = invoiceNumber || customField || null;

      // Extract buyer message from messages array or extensions
      let buyerMessage: string | null = null;
      if (d.messages && d.messages.length > 0) {
        const buyerMsg = d.messages.find((m: any) => m.posted_by === 'BUYER');
        if (buyerMsg) buyerMessage = buyerMsg.content;
      }
      if (!buyerMessage && d.reason) {
        buyerMessage = d.extensions?.buyer_message || null;
      }

      // Map PayPal status to a simpler status for the existing column
      const mappedStatus = mapPayPalStatus(d.status);

      const row = {
        paypal_dispute_id: d.dispute_id,
        case_id: d.dispute_id,
        brand: 'thiocyn', // default brand — PayPal account is Thiocyn
        platform: 'paypal',
        amount: parseFloat(d.dispute_amount?.value || '0'),
        currency: d.dispute_amount?.currency_code || 'EUR',
        deadline: d.seller_response_due_date || null,
        seller_response_due_date: d.seller_response_due_date || null,
        status: mappedStatus,
        reason: d.reason || null,
        dispute_life_cycle_stage: d.dispute_life_cycle_stage || null,
        buyer_message: buyerMessage,
        transaction_id: transactionId,
        shopify_order_id: shopifyOrderId,
        notes: buildNotes(d),
        paypal_create_time: d.create_time || null,
        paypal_update_time: d.update_time || null,
        updated_at: new Date().toISOString(),
      };

      // Check if dispute already exists
      const { data: existing } = await supabase
        .from('disputes')
        .select('id')
        .eq('paypal_dispute_id', d.dispute_id)
        .maybeSingle();

      let upsertError;
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('disputes')
          .update(row)
          .eq('paypal_dispute_id', d.dispute_id);
        upsertError = error;
        if (!error) updated++;
      } else {
        // Insert new
        const { error } = await supabase.from('disputes').insert(row);
        upsertError = error;
        if (!error) inserted++;
      }

      results.push({
        dispute_id: d.dispute_id,
        status: d.status,
        reason: d.reason,
        amount: `${d.dispute_amount?.value || '?'} ${d.dispute_amount?.currency_code || ''}`,
        seller_response_due: d.seller_response_due_date || null,
        action: existing ? 'updated' : 'inserted',
        error: upsertError?.message || null,
      });
    }

    // ─── Return result ───────────────────────────────────────────
    return new Response(
      JSON.stringify({
        total_found: detailedDisputes.length,
        inserted,
        updated,
        statuses_queried: disputeStatuses,
        disputes: results,
      }),
      { headers, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error.', details: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// ─── Helpers ───────────────────────────────────────────────────────

function mapPayPalStatus(ppStatus: string): string {
  const map: Record<string, string> = {
    OPEN: 'open',
    WAITING_FOR_SELLER_RESPONSE: 'action_required',
    WAITING_FOR_BUYER_RESPONSE: 'waiting',
    UNDER_REVIEW: 'under_review',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    OTHER: 'open',
  };
  return map[ppStatus] || 'open';
}

function buildNotes(d: any): string {
  const parts: string[] = [];
  if (d.reason) parts.push(`Reason: ${d.reason}`);
  if (d.dispute_life_cycle_stage) parts.push(`Stage: ${d.dispute_life_cycle_stage}`);
  if (d.status) parts.push(`PayPal Status: ${d.status}`);
  if (d.disputed_transactions?.[0]?.buyer?.name) {
    parts.push(`Buyer: ${d.disputed_transactions[0].buyer.name}`);
  }
  return parts.join(' | ') || null as any;
}

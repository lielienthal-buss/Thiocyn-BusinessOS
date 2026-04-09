import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * sync-paypal-reports
 *
 * Fetches PayPal balance + transaction data for a given month.
 * Reads PayPal credentials from integration_secrets table.
 *
 * Auth: Bearer token must match SUPABASE_SERVICE_ROLE_KEY (for cron/automation use).
 * Query params: ?month=YYYY-MM (defaults to current month)
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    // ─── Auth: internal use only (verify_jwt: false) ──────────────
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ─── Parse month parameter ───────────────────────────────────
    const url = new URL(req.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = url.searchParams.get('month') || defaultMonth;

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return new Response(
        JSON.stringify({ error: 'Invalid month format. Use YYYY-MM.' }),
        { headers, status: 400 }
      );
    }

    const [year, mon] = month.split('-').map(Number);
    const startDate = `${month}-01T00:00:00Z`;
    // Last day of month
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59Z`;

    // ─── Read PayPal credentials from integration_secrets ────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    );

    const { data: clientIdRow, error: e1 } = await supabase
      .from('integration_secrets')
      .select('encrypted_value')
      .eq('integration', 'paypal')
      .eq('key_name', 'client_id')
      .maybeSingle();

    const { data: clientSecretRow, error: e2 } = await supabase
      .from('integration_secrets')
      .select('encrypted_value')
      .eq('integration', 'paypal')
      .eq('key_name', 'client_secret')
      .maybeSingle();

    if (e1 || e2) {
      return new Response(
        JSON.stringify({ error: 'Failed to read PayPal credentials from database.', details: (e1 || e2)?.message }),
        { headers, status: 500 }
      );
    }

    if (!clientIdRow?.encrypted_value || !clientSecretRow?.encrypted_value) {
      return new Response(
        JSON.stringify({ error: 'PayPal credentials not configured. Store client_id and client_secret in integration_secrets with integration=paypal.' }),
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

    // ─── Fetch balances (opening + closing) ──────────────────────
    const [openingRes, closingRes] = await Promise.all([
      fetch(`https://api-m.paypal.com/v1/reporting/balances?as_of_time=${startDate}&currency_code=EUR`, {
        headers: ppHeaders,
      }),
      fetch(`https://api-m.paypal.com/v1/reporting/balances?as_of_time=${endDate}&currency_code=EUR`, {
        headers: ppHeaders,
      }),
    ]);

    let openingBalance = { value: 'N/A', currency: 'EUR' };
    let closingBalance = { value: 'N/A', currency: 'EUR' };

    if (openingRes.ok) {
      const ob = await openingRes.json();
      if (ob.balances && ob.balances.length > 0) {
        const eurBalance = ob.balances.find((b: any) => b.currency === 'EUR') || ob.balances[0];
        openingBalance = {
          value: eurBalance.total_balance?.value || eurBalance.available_balance?.value || '0.00',
          currency: eurBalance.currency || 'EUR',
        };
      }
    }

    if (closingRes.ok) {
      const cb = await closingRes.json();
      if (cb.balances && cb.balances.length > 0) {
        const eurBalance = cb.balances.find((b: any) => b.currency === 'EUR') || cb.balances[0];
        closingBalance = {
          value: eurBalance.total_balance?.value || eurBalance.available_balance?.value || '0.00',
          currency: eurBalance.currency || 'EUR',
        };
      }
    }

    // ─── Fetch transactions (paginated) ──────────────────────────
    let allTransactions: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const txParams = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        fields: 'all',
        page_size: '500',
        page: String(page),
      });
      const txRes = await fetch(`https://api-m.paypal.com/v1/reporting/transactions?${txParams}`, {
        method: 'GET',
        headers: ppHeaders,
      });

      if (!txRes.ok) {
        const errBody = await txRes.text();
        return new Response(
          JSON.stringify({
            error: 'Failed to fetch PayPal transactions.',
            status: txRes.status,
            details: errBody,
            page,
          }),
          { headers, status: 502 }
        );
      }

      const txData = await txRes.json();
      const txList = txData.transaction_details || [];
      allTransactions = allTransactions.concat(txList);

      // Check if more pages exist
      const totalPages = txData.total_pages || 1;
      if (page >= totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // ─── Calculate totals ────────────────────────────────────────
    let totalIncoming = 0;
    let totalOutgoing = 0;

    for (const tx of allTransactions) {
      const info = tx.transaction_info;
      if (!info?.transaction_amount?.value) continue;

      const amount = parseFloat(info.transaction_amount.value);
      if (amount > 0) {
        totalIncoming += amount;
      } else {
        totalOutgoing += Math.abs(amount);
      }
    }

    // ─── Return result ───────────────────────────────────────────
    return new Response(
      JSON.stringify({
        month,
        opening_balance: openingBalance,
        closing_balance: closingBalance,
        transaction_count: allTransactions.length,
        total_incoming: totalIncoming.toFixed(2),
        total_outgoing: totalOutgoing.toFixed(2),
        transactions: allTransactions,
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

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * sync-shopify-sales
 *
 * Pulls orders from Shopify Admin API (via Partners access),
 * matches discount/affiliate codes to creators, updates:
 * - creator sales & revenue
 * - product_performance
 * - shopify_sync_log
 *
 * POST body:
 *   {
 *     brand_slug: string,              — required
 *     access_token?: string,           — Shopify access token (or from brand_configs)
 *     store_url?: string,              — e.g. 'paigh.myshopify.com' (or from brand_configs)
 *     days_back?: number,              — how many days to sync (default: 7)
 *     sync_type?: 'orders' | 'products' | 'full'  — default: 'full'
 *   }
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const brandSlug = body.brand_slug;

    if (!brandSlug) {
      return new Response(
        JSON.stringify({ error: 'brand_slug is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get Shopify credentials from secure store
    const { data: secrets } = await supabase
      .from('integration_secrets')
      .select('key_name, encrypted_value')
      .eq('brand_slug', brandSlug)
      .eq('integration', 'shopify');

    const secretMap = new Map((secrets ?? []).map((s: { key_name: string; encrypted_value: string }) => [s.key_name, s.encrypted_value]));

    const { data: config } = await supabase
      .from('brand_configs')
      .select('shopify_store_url, shopify_api_version')
      .eq('brand_slug', brandSlug)
      .single();

    const storeUrl = body.store_url ?? secretMap.get('store_url') ?? config?.shopify_store_url;
    const accessToken = body.access_token ?? secretMap.get('access_token');
    const apiVersion = config?.shopify_api_version ?? '2024-10';

    if (!storeUrl || !accessToken) {
      return new Response(
        JSON.stringify({
          error: 'Missing Shopify credentials',
          hint: 'Go to Admin → Brand Config → store the Shopify access_token and store_url via the Integrations settings.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const daysBack = body.days_back ?? 7;
    const syncType = body.sync_type ?? 'full';
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();
    const baseUrl = `https://${storeUrl}/admin/api/${apiVersion}`;

    // Get all creator affiliate codes for matching
    const { data: creators } = await supabase
      .from('creators')
      .select('id, name, affiliate_code, brand_slug')
      .not('affiliate_code', 'is', null);

    const affiliateMap = new Map(
      (creators ?? []).map((c: { id: string; affiliate_code: string }) => [
        c.affiliate_code.toLowerCase(),
        c.id,
      ])
    );

    let totalOrders = 0;
    let matchedOrders = 0;
    let totalRevenue = 0;
    let creatorRevenue = 0;
    const creatorSales: Map<string, { sales: number; revenue: number }> = new Map();
    const productStats: Map<string, { title: string; variant: string; orders: number; revenue: number; units: number; creatorOrders: number; creatorRevenue: number }> = new Map();

    // ─── Sync Orders ──────────────────────────────────────────────
    if (syncType === 'orders' || syncType === 'full') {
      let nextPageUrl: string | null = `${baseUrl}/orders.json?status=any&created_at_min=${since}&limit=250&fields=id,total_price,discount_codes,line_items,created_at,financial_status`;

      while (nextPageUrl) {
        const res = await fetch(nextPageUrl, {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Shopify API ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const orders = data.orders ?? [];

        for (const order of orders) {
          if (order.financial_status === 'voided' || order.financial_status === 'refunded') continue;

          totalOrders++;
          const orderTotal = parseFloat(order.total_price ?? '0');
          totalRevenue += orderTotal;

          // Check discount codes for creator match
          const discountCodes: { code: string }[] = order.discount_codes ?? [];
          let creatorId: string | null = null;

          for (const dc of discountCodes) {
            const match = affiliateMap.get(dc.code.toLowerCase());
            if (match) {
              creatorId = match;
              break;
            }
          }

          if (creatorId) {
            matchedOrders++;
            creatorRevenue += orderTotal;
            const existing = creatorSales.get(creatorId) ?? { sales: 0, revenue: 0 };
            existing.sales++;
            existing.revenue += orderTotal;
            creatorSales.set(creatorId, existing);
          }

          // Product stats
          for (const item of (order.line_items ?? [])) {
            const prodKey = `${item.product_id}`;
            const existing = productStats.get(prodKey) ?? {
              title: item.title ?? 'Unknown',
              variant: item.variant_title ?? '',
              orders: 0,
              revenue: 0,
              units: 0,
              creatorOrders: 0,
              creatorRevenue: 0,
            };
            existing.orders++;
            existing.units += item.quantity ?? 1;
            existing.revenue += parseFloat(item.price ?? '0') * (item.quantity ?? 1);
            if (creatorId) {
              existing.creatorOrders++;
              existing.creatorRevenue += parseFloat(item.price ?? '0') * (item.quantity ?? 1);
            }
            productStats.set(prodKey, existing);
          }
        }

        // Pagination via Link header
        const linkHeader = res.headers.get('Link');
        nextPageUrl = null;
        if (linkHeader) {
          const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (nextMatch) nextPageUrl = nextMatch[1];
        }
      }

      // Update creator sales
      for (const [creatorId, stats] of creatorSales) {
        await supabase.rpc('', {}).catch(() => {}); // no-op
        // Direct update — add to existing totals
        const { data: current } = await supabase
          .from('creators')
          .select('total_sales, total_revenue')
          .eq('id', creatorId)
          .single();

        if (current) {
          await supabase
            .from('creators')
            .update({
              total_sales: (current.total_sales ?? 0) + stats.sales,
              total_revenue: (current.total_revenue ?? 0) + stats.revenue,
            })
            .eq('id', creatorId);
        }
      }

      // Upsert product performance
      for (const [productId, stats] of productStats) {
        await supabase
          .from('product_performance')
          .upsert({
            brand_slug: brandSlug,
            product_id: productId,
            product_title: stats.title,
            variant_title: stats.variant,
            total_orders: stats.orders,
            total_revenue: stats.revenue,
            total_units: stats.units,
            creator_attributed_orders: stats.creatorOrders,
            creator_attributed_revenue: stats.creatorRevenue,
            period: `last_${daysBack}d`,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'brand_slug,product_id,period' });
      }
    }

    // ─── Sync Products (catalog info) ─────────────────────────────
    let productsCount = 0;
    if (syncType === 'products' || syncType === 'full') {
      const prodRes = await fetch(`${baseUrl}/products/count.json`, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        productsCount = prodData.count ?? 0;
      }
    }

    // Update last sync timestamp
    await supabase
      .from('brand_configs')
      .update({
        shopify_sync_enabled: true,
        shopify_last_sync_at: new Date().toISOString(),
      })
      .eq('brand_slug', brandSlug);

    // Log sync
    await supabase.from('shopify_sync_log').insert({
      brand_slug: brandSlug,
      sync_type: syncType,
      orders_fetched: totalOrders,
      orders_matched: matchedOrders,
      revenue_total: totalRevenue,
      creator_revenue: creatorRevenue,
      status: 'success',
    });

    return new Response(
      JSON.stringify({
        message: `Shopify sync complete for ${brandSlug}`,
        period: `last ${daysBack} days`,
        orders: {
          total: totalOrders,
          creator_matched: matchedOrders,
          match_rate: totalOrders > 0 ? `${Math.round((matchedOrders / totalOrders) * 100)}%` : '0%',
        },
        revenue: {
          total: `€${totalRevenue.toFixed(2)}`,
          creator_attributed: `€${creatorRevenue.toFixed(2)}`,
        },
        creators_with_sales: creatorSales.size,
        products_tracked: productStats.size,
        products_in_catalog: productsCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // Log error
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const body = await req.clone().json().catch(() => ({}));
      await supabase.from('shopify_sync_log').insert({
        brand_slug: body.brand_slug ?? 'unknown',
        sync_type: body.sync_type ?? 'full',
        status: 'error',
        error_message: String(err),
      });
    } catch {}

    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

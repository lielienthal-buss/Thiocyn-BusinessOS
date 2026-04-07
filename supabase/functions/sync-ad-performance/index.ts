import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * sync-ad-performance
 *
 * Fetches ad-level performance data from Meta Ads API and maps it
 * to creative_assets via asset naming convention. Writes daily
 * snapshots to asset_performance.
 *
 * POST body:
 *   {
 *     brand_slug: string,          — required
 *     access_token?: string,       — Meta access token (or from env)
 *     ad_account_id?: string,      — Meta ad account ID (or from brand_configs)
 *     date_preset?: string         — 'today' | 'yesterday' | 'last_7d' (default: 'yesterday')
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

    // Get Meta credentials — from request body or brand_configs
    let accessToken = body.access_token ?? Deno.env.get('META_ACCESS_TOKEN');
    let adAccountId = body.ad_account_id;

    if (!adAccountId) {
      const { data: config } = await supabase
        .from('brand_configs')
        .select('meta_ad_account_id')
        .eq('brand_slug', brandSlug)
        .single();
      adAccountId = config?.meta_ad_account_id;
    }

    if (!accessToken || !adAccountId) {
      return new Response(
        JSON.stringify({
          error: 'Missing Meta credentials',
          hint: 'Provide access_token and ad_account_id in request body, or configure in brand_configs and environment',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const datePreset = body.date_preset ?? 'yesterday';

    // Map date_preset to Meta API format
    const datePresetMap: Record<string, string> = {
      today: 'today',
      yesterday: 'yesterday',
      last_7d: 'last_7_d',
      last_30d: 'last_30_d',
    };
    const metaPreset = datePresetMap[datePreset] ?? 'yesterday';

    // Fetch ad-level insights from Meta Marketing API
    const fields = [
      'ad_name', 'impressions', 'clicks', 'spend', 'actions',
      'action_values', 'ctr', 'cpm', 'cpc',
      'video_avg_time_watched_actions', 'video_p100_watched_actions',
    ].join(',');

    const metaUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
      `fields=${fields}&level=ad&date_preset=${metaPreset}&limit=500&access_token=${accessToken}`;

    const metaRes = await fetch(metaUrl);
    const metaData = await metaRes.json();

    if (metaData.error) {
      return new Response(
        JSON.stringify({ error: 'Meta API error', details: metaData.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const insights = metaData.data ?? [];

    // Get all creative assets for this brand to match by name
    const { data: assets } = await supabase
      .from('creative_assets')
      .select('id, asset_name')
      .eq('brand_slug', brandSlug);

    const assetMap = new Map((assets ?? []).map((a: { id: string; asset_name: string }) => [a.asset_name, a.id]));

    // Process each ad insight
    let matched = 0;
    let unmatched = 0;
    const today = new Date().toISOString().split('T')[0];

    for (const insight of insights) {
      const adName = insight.ad_name ?? '';

      // Try to match ad_name to an asset (exact match or contains)
      let assetId = assetMap.get(adName);
      if (!assetId) {
        // Try partial match — ad name might contain the asset name
        for (const [name, id] of assetMap) {
          if (adName.includes(name) || name.includes(adName)) {
            assetId = id;
            break;
          }
        }
      }

      if (!assetId) {
        unmatched++;
        continue;
      }

      // Extract purchase count and revenue from actions
      const actions = insight.actions ?? [];
      const actionValues = insight.action_values ?? [];
      const purchases = actions.find((a: { action_type: string }) => a.action_type === 'purchase')?.value ?? 0;
      const revenue = actionValues.find((a: { action_type: string }) => a.action_type === 'purchase')?.value ?? 0;

      // Extract video metrics
      const videoWatched = insight.video_p100_watched_actions?.[0]?.value ?? 0;
      const videoViews = insight.impressions ?? 0;
      const completionRate = videoViews > 0 ? (videoWatched / videoViews) * 100 : 0;

      const impressions = parseInt(insight.impressions ?? '0');
      const clicks = parseInt(insight.clicks ?? '0');
      const spend = parseFloat(insight.spend ?? '0');
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const roas = spend > 0 ? parseFloat(revenue) / spend : 0;

      // Upsert into asset_performance
      const { error } = await supabase
        .from('asset_performance')
        .upsert({
          asset_id: assetId,
          snapshot_date: today,
          impressions,
          clicks,
          ctr,
          spend,
          purchases: parseInt(purchases),
          revenue: parseFloat(revenue),
          roas,
          cpm: parseFloat(insight.cpm ?? '0'),
          cpc: parseFloat(insight.cpc ?? '0'),
          video_views: impressions,
          completion_rate: Math.round(completionRate * 100) / 100,
          source: 'meta_api',
        }, { onConflict: 'asset_id,snapshot_date' });

      if (!error) matched++;
    }

    return new Response(
      JSON.stringify({
        message: `Ad performance synced for ${brandSlug}`,
        date_preset: datePreset,
        total_ads: insights.length,
        matched_to_assets: matched,
        unmatched: unmatched,
        hint: unmatched > 0
          ? 'Unmatched ads have names that don\'t match any asset_name in creative_assets. Use the naming convention.'
          : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

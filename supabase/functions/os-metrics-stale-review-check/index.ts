import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * os-metrics-stale-review-check
 *
 * Daily cron — detects Welle items that were deployed but not reviewed within
 * the cadence window. Soft-warning per docs/foundation/07-feedback-loop.md §10.
 *
 * Convention (per Doc 07 §6):
 *   - Deploy event:   notes starts with 'deploy:' or contains 'auto'
 *   - Review event:   notes starts with 'review:'
 *   - Baseline:       notes starts with 'baseline:'         (skipped)
 *   - Wave-only item: notes starts with 'wave_review_only'  (skipped, reviewed in Wave)
 *
 * Stale = latest non-review entry > 72h ago AND no review row exists for item_ref.
 * Result → row in `notifications` (type='os_metrics_stale_review'),
 * recipient = Luis (default reviewer per Doc 02).
 *
 * Auth: verify_jwt: false (cron / service-role only).
 *
 * Cron schedule (apply manually via Supabase Dashboard or pg_cron):
 *   SELECT cron.schedule(
 *     'os-metrics-stale-review-check',
 *     '0 9 * * *',  -- 09:00 UTC daily
 *     $$ SELECT net.http_post(
 *          url := 'https://dfzrkzvsdiiihoejfozn.supabase.co/functions/v1/os-metrics-stale-review-check',
 *          headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
 *        ); $$
 *   );
 */

const STALE_HOURS = 72;
const DEDUP_HOURS = 72;

// Default reviewer auth.users.id — set via env var to avoid hardcoding identifiers
// Resolved at runtime; if unset, notifications are created with recipient_user_id=null
// (still visible in admin UI, just not user-targeted).
const REVIEWER_USER_ID = Deno.env.get('OS_METRICS_REVIEWER_USER_ID') ?? null;

interface MetricRow {
  item_ref: string;
  latest_at: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ─── 1. Find candidate item_refs (non-baseline, non-wave-only) ────────
    const { data: candidateRows, error: candidateErr } = await supabase
      .from('os_metrics')
      .select('item_ref, captured_at, notes')
      .not('item_ref', 'is', null)
      .not('notes', 'ilike', 'baseline:%')
      .not('notes', 'ilike', 'wave_review_only%');

    if (candidateErr) {
      console.error('[stale-review-check] candidate query failed:', candidateErr);
      return new Response(
        JSON.stringify({ error: candidateErr.message }),
        { headers, status: 500 }
      );
    }

    // ─── 2. Group by item_ref, find latest non-review captured_at ─────────
    const latestByItem = new Map<string, MetricRow>();
    const reviewedItems = new Set<string>();

    for (const row of candidateRows ?? []) {
      const itemRef = row.item_ref as string;
      const notes = (row.notes as string | null) ?? '';
      const capturedAt = row.captured_at as string;

      if (notes.startsWith('review:')) {
        reviewedItems.add(itemRef);
        continue;
      }

      const existing = latestByItem.get(itemRef);
      if (!existing || new Date(capturedAt) > new Date(existing.latest_at)) {
        latestByItem.set(itemRef, { item_ref: itemRef, latest_at: capturedAt });
      }
    }

    // ─── 3. Filter to stale items (latest > STALE_HOURS old, no review) ───
    const cutoffMs = Date.now() - STALE_HOURS * 60 * 60 * 1000;
    const staleItems: MetricRow[] = [];
    for (const [itemRef, row] of latestByItem) {
      if (reviewedItems.has(itemRef)) continue;
      if (new Date(row.latest_at).getTime() <= cutoffMs) {
        staleItems.push(row);
      }
    }

    if (staleItems.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, stale_count: 0, notifications_created: 0 }),
        { headers }
      );
    }

    // ─── 4. Dedup against existing notifications (last DEDUP_HOURS) ───────
    const dedupCutoff = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000).toISOString();
    const { data: existingNotifs, error: notifErr } = await supabase
      .from('notifications')
      .select('metadata')
      .eq('type', 'os_metrics_stale_review')
      .gte('created_at', dedupCutoff);

    if (notifErr) {
      console.error('[stale-review-check] notif lookup failed:', notifErr);
      return new Response(
        JSON.stringify({ error: notifErr.message }),
        { headers, status: 500 }
      );
    }

    const recentlyNotified = new Set<string>();
    for (const n of existingNotifs ?? []) {
      const meta = n.metadata as { item_ref?: string } | null;
      if (meta?.item_ref) recentlyNotified.add(meta.item_ref);
    }

    const toNotify = staleItems.filter((s) => !recentlyNotified.has(s.item_ref));

    if (toNotify.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          stale_count: staleItems.length,
          notifications_created: 0,
          reason: 'all_recently_notified',
        }),
        { headers }
      );
    }

    // ─── 5. Insert notifications ──────────────────────────────────────────
    const inserts = toNotify.map((s) => {
      const ageHours = Math.round(
        (Date.now() - new Date(s.latest_at).getTime()) / (60 * 60 * 1000)
      );
      return {
        type: 'os_metrics_stale_review',
        title: `Item Review overdue: ${s.item_ref}`,
        body: `Last activity ${ageHours}h ago, no review entry yet. Soft warning per Doc 07 §10.`,
        recipient_user_id: REVIEWER_USER_ID,
        metadata: {
          item_ref: s.item_ref,
          latest_at: s.latest_at,
          age_hours: ageHours,
          source: 'os-metrics-stale-review-check',
        },
      };
    });

    const { error: insertErr } = await supabase.from('notifications').insert(inserts);

    if (insertErr) {
      console.error('[stale-review-check] notif insert failed:', insertErr);
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { headers, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        stale_count: staleItems.length,
        notifications_created: toNotify.length,
        items: toNotify.map((s) => s.item_ref),
      }),
      { headers }
    );
  } catch (err) {
    console.error('[stale-review-check] threw:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers, status: 500 }
    );
  }
});

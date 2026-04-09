import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * snapshot-creator-performance
 *
 * Aggregates the current week's creator task data into a performance
 * snapshot per creator. Called Friday evening or manually.
 *
 * POST body (optional):
 *   { week_number?: number, year?: number }  — override week, defaults to current
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
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );

    const weekNumber = body.week_number ?? currentWeek;
    const year = body.year ?? now.getFullYear();

    // Get all tasks for this week grouped by creator
    const { data: tasks, error: taskError } = await supabase
      .from('creator_tasks')
      .select('creator_id, status, quality_rating, repost_worthy')
      .eq('week_number', weekNumber)
      .eq('year', year);

    if (taskError) throw taskError;
    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No tasks found for this week', snapshots_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate per creator
    const creatorMap = new Map<string, {
      tasks_sent: number;
      tasks_delivered: number;
      top_videos: number;
    }>();

    for (const task of tasks) {
      const id = task.creator_id;
      if (!creatorMap.has(id)) {
        creatorMap.set(id, { tasks_sent: 0, tasks_delivered: 0, top_videos: 0 });
      }
      const entry = creatorMap.get(id)!;
      entry.tasks_sent++;
      if (['submitted', 'feedback_given', 'approved'].includes(task.status)) {
        entry.tasks_delivered++;
      }
      if (task.repost_worthy) {
        entry.top_videos++;
      }
    }

    // Get creator tiers + sales data for snapshot
    const creatorIds = [...creatorMap.keys()];
    const { data: creators } = await supabase
      .from('creators')
      .select('id, tier, total_sales, total_revenue')
      .in('id', creatorIds);

    const creatorDataMap = new Map(
      (creators ?? []).map((c: { id: string; tier: string; total_sales: number; total_revenue: number }) => [
        c.id,
        { tier: c.tier, total_sales: c.total_sales ?? 0, total_revenue: c.total_revenue ?? 0 },
      ])
    );

    // Get previous week's snapshot to calculate sales delta
    const prevWeek = weekNumber > 1 ? weekNumber - 1 : 52;
    const prevYear = weekNumber > 1 ? year : year - 1;
    const { data: prevSnapshots } = await supabase
      .from('creator_performance')
      .select('creator_id, sales, revenue')
      .eq('week_number', prevWeek)
      .eq('year', prevYear)
      .in('creator_id', creatorIds);

    const prevMap = new Map(
      (prevSnapshots ?? []).map((p: { creator_id: string; sales: number; revenue: number }) => [
        p.creator_id,
        { sales: p.sales ?? 0, revenue: p.revenue ?? 0 },
      ])
    );

    // Build snapshots with actual sales data
    const snapshots = [...creatorMap.entries()].map(([creatorId, stats]) => {
      const cData = creatorDataMap.get(creatorId);
      const prev = prevMap.get(creatorId);
      const currentSales = cData?.total_sales ?? 0;
      const currentRevenue = cData?.total_revenue ?? 0;
      const salesDelta = Math.max(0, currentSales - (prev?.sales ?? 0));
      const revenueDelta = Math.max(0, currentRevenue - (prev?.revenue ?? 0));

      return {
        creator_id: creatorId,
        week_number: weekNumber,
        year,
        tasks_sent: stats.tasks_sent,
        tasks_delivered: stats.tasks_delivered,
        delivery_rate: stats.tasks_sent > 0
          ? Math.round((stats.tasks_delivered / stats.tasks_sent) * 10000) / 100
          : 0,
        top_videos: stats.top_videos,
        sales: salesDelta,
        revenue: revenueDelta,
        tier_at_snapshot: cData?.tier ?? 'gifting',
      };
    });

    // Upsert (unique on creator_id + year + week_number)
    let created = 0;
    for (const snap of snapshots) {
      const { error } = await supabase
        .from('creator_performance')
        .upsert(snap, { onConflict: 'creator_id,year,week_number' });
      if (!error) created++;
    }

    return new Response(
      JSON.stringify({
        message: `Performance snapshot for KW${weekNumber}/${year}`,
        snapshots_created: created,
        total_creators: creatorMap.size,
        avg_delivery_rate: snapshots.length > 0
          ? Math.round(snapshots.reduce((s, snap) => s + snap.delivery_rate, 0) / snapshots.length * 100) / 100
          : 0,
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

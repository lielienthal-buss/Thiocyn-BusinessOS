import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * distribute-creator-tasks
 *
 * Creates weekly tasks for all active creators based on the 4-week
 * content direction cycle. Called manually from CreatorView or via cron.
 *
 * POST body (optional):
 *   { brand_slug?: string }  — limit to one brand, or all if omitted
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
    const brandFilter = body.brand_slug ?? null;

    // Current week info
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(
      ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
    );
    const year = now.getFullYear();

    // Calculate week in 4-week cycle (1-4)
    const weekInCycle = ((weekNumber - 1) % 4) + 1;

    // Get content direction for this week
    let dirQuery = supabase
      .from('content_directions')
      .select('*')
      .eq('week_in_cycle', weekInCycle)
      .eq('active', true);
    if (brandFilter) dirQuery = dirQuery.eq('brand_slug', brandFilter);
    const { data: directions, error: dirError } = await dirQuery;

    if (dirError) throw dirError;
    if (!directions || directions.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No content directions found for this week cycle' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Build brand → direction map
    const dirMap = new Map(directions.map((d: Record<string, unknown>) => [d.brand_slug, d]));

    // Get all active creators
    let creatorQuery = supabase
      .from('creators')
      .select('id, name, brand, brand_slug')
      .eq('status', 'Active');
    if (brandFilter) creatorQuery = creatorQuery.eq('brand_slug', brandFilter);
    const { data: creators, error: crError } = await creatorQuery;

    if (crError) throw crError;
    if (!creators || creators.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active creators found', tasks_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate deadline (Friday of current week)
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(now);
    friday.setDate(friday.getDate() + daysUntilFriday);
    const deadline = friday.toISOString().split('T')[0];

    // Create tasks for each creator
    const tasks = [];
    const skipped = [];

    for (const creator of creators) {
      // Determine brand_slug (use brand_slug if set, otherwise map from brand name)
      const slug = creator.brand_slug ?? slugify(creator.brand);
      const direction = dirMap.get(slug);

      if (!direction) {
        skipped.push({ creator: creator.name, reason: `No direction for brand ${slug}` });
        continue;
      }

      tasks.push({
        creator_id: creator.id,
        brand_slug: slug,
        week_number: weekNumber,
        year,
        content_direction: (direction as Record<string, unknown>).direction_key,
        angle_code: null, // Creator picks from the angle category
        template_used: (direction as Record<string, unknown>).template_reference ?? null,
        deadline,
        status: 'sent',
      });
    }

    // Insert tasks (skip duplicates via unique check)
    let created = 0;
    if (tasks.length > 0) {
      // Check which creators already have a task this week
      const { data: existing } = await supabase
        .from('creator_tasks')
        .select('creator_id')
        .eq('year', year)
        .eq('week_number', weekNumber);

      const existingIds = new Set((existing ?? []).map((e: { creator_id: string }) => e.creator_id));
      const newTasks = tasks.filter(t => !existingIds.has(t.creator_id));

      if (newTasks.length > 0) {
        const { error: insertError } = await supabase.from('creator_tasks').insert(newTasks);
        if (insertError) throw insertError;
        created = newTasks.length;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Tasks distributed for KW${weekNumber}/${year}`,
        week_in_cycle: weekInCycle,
        direction: directions[0]?.direction_key,
        tasks_created: created,
        skipped: skipped.length,
        skipped_details: skipped,
        deadline,
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

function slugify(brand: string): string {
  const map: Record<string, string> = {
    'Thiocyn': 'thiocyn',
    'Take A Shot': 'take-a-shot',
    'Paigh': 'paigh',
    'Dr. Severin': 'dr-severin',
    'Wristr': 'wristr',
    'Timber & John': 'timber-john',
  };
  return map[brand] ?? brand.toLowerCase().replace(/\s+/g, '-');
}

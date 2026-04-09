import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * distribute-creator-tasks
 *
 * Creates weekly tasks for all active creators based on:
 * - 4-week content direction cycle
 * - Creator grade (A/B/C) → angle performance_tag matching
 * - Tier-based task count (Gifting: 1, Affiliate: 2, Influencer: 3, Ambassador: 3+1 freestyle)
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
      return jsonResponse({ error: 'No content directions found for this week cycle' }, 404);
    }

    const dirMap = new Map(directions.map((d: Record<string, unknown>) => [d.brand_slug, d]));

    // Get all active creators with scoreboard grades
    let creatorQuery = supabase
      .from('creator_scoreboard')
      .select('id, name, brand_slug, tier, creator_grade');
    if (brandFilter) creatorQuery = creatorQuery.eq('brand_slug', brandFilter);
    const { data: scoredCreators, error: scError } = await creatorQuery;

    // Fallback: if scoreboard is empty (no performance data yet), use creators table directly
    let creators: { id: string; name: string; brand_slug: string; tier: string; creator_grade: string }[];
    if (scError || !scoredCreators || scoredCreators.length === 0) {
      let fallbackQuery = supabase
        .from('creators')
        .select('id, name, brand, brand_slug, tier, onboarding_status')
        .eq('status', 'Active')
        .not('onboarding_status', 'in', '("paused","churned")');
      if (brandFilter) fallbackQuery = fallbackQuery.eq('brand_slug', brandFilter);
      const { data: fallbackCreators, error: fbError } = await fallbackQuery;
      if (fbError) throw fbError;
      creators = (fallbackCreators ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        name: c.name as string,
        brand_slug: (c.brand_slug ?? slugify(c.brand as string)) as string,
        tier: (c.tier ?? 'gifting') as string,
        creator_grade: 'C', // Default grade for creators without performance data
      }));
    } else {
      creators = scoredCreators;
    }

    if (creators.length === 0) {
      return jsonResponse({ message: 'No active creators found', tasks_created: 0 });
    }

    // Get angles per brand for grade-based matching
    const brandSlugs = [...new Set(creators.map(c => c.brand_slug))];
    const { data: angles } = await supabase
      .from('creative_angles')
      .select('code, brand_slug, performance_tag, category')
      .in('brand_slug', brandSlugs)
      .neq('performance_tag', 'retired');

    const anglesByBrand = new Map<string, Record<string, unknown>[]>();
    for (const angle of (angles ?? [])) {
      const list = anglesByBrand.get(angle.brand_slug as string) ?? [];
      list.push(angle);
      anglesByBrand.set(angle.brand_slug as string, list);
    }

    // Calculate deadline (Friday of current week)
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const friday = new Date(now);
    friday.setDate(friday.getDate() + daysUntilFriday);
    const deadline = friday.toISOString().split('T')[0];

    // Check existing tasks this week
    const { data: existing } = await supabase
      .from('creator_tasks')
      .select('creator_id')
      .eq('year', year)
      .eq('week_number', weekNumber);
    const existingIds = new Set((existing ?? []).map((e: { creator_id: string }) => e.creator_id));

    // Create tasks for each creator
    const tasks: Record<string, unknown>[] = [];
    const skipped: { creator: string; reason: string }[] = [];

    for (const creator of creators) {
      if (existingIds.has(creator.id)) {
        skipped.push({ creator: creator.name, reason: 'Already has task this week' });
        continue;
      }

      const direction = dirMap.get(creator.brand_slug);
      if (!direction) {
        skipped.push({ creator: creator.name, reason: `No direction for ${creator.brand_slug}` });
        continue;
      }

      // Determine task count based on tier
      const taskCount = getTaskCount(creator.tier);

      // Match angles based on creator grade
      const brandAngles = anglesByBrand.get(creator.brand_slug) ?? [];
      const matchedAngle = pickAngleForGrade(creator.creator_grade, brandAngles, direction as Record<string, unknown>);

      for (let i = 0; i < taskCount; i++) {
        const isFreestyle = i >= 3; // 4th task for ambassadors is freestyle
        tasks.push({
          creator_id: creator.id,
          brand_slug: creator.brand_slug,
          week_number: weekNumber,
          year,
          content_direction: isFreestyle ? 'storytelling' : (direction as Record<string, unknown>).direction_key,
          angle_code: isFreestyle ? null : (matchedAngle?.code ?? null),
          template_used: (direction as Record<string, unknown>).template_reference ?? null,
          deadline,
          status: 'sent',
        });
      }
    }

    // Insert tasks
    let created = 0;
    if (tasks.length > 0) {
      const { error: insertError } = await supabase.from('creator_tasks').insert(tasks);
      if (insertError) throw insertError;
      created = tasks.length;
    }

    return jsonResponse({
      message: `Tasks distributed for KW${weekNumber}/${year}`,
      week_in_cycle: weekInCycle,
      direction: directions[0]?.direction_key,
      tasks_created: created,
      creators_served: creators.length - skipped.length,
      skipped: skipped.length,
      skipped_details: skipped,
      grade_distribution: {
        A: creators.filter(c => c.creator_grade === 'A').length,
        B: creators.filter(c => c.creator_grade === 'B').length,
        C: creators.filter(c => c.creator_grade === 'C').length,
      },
      deadline,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function getTaskCount(tier: string): number {
  switch (tier) {
    case 'ambassador': return 4;  // 3 directed + 1 freestyle
    case 'influencer': return 3;
    case 'affiliate': return 2;
    default: return 1; // gifting
  }
}

function pickAngleForGrade(
  grade: string,
  brandAngles: Record<string, unknown>[],
  direction: Record<string, unknown>,
): Record<string, unknown> | null {
  if (brandAngles.length === 0) return null; // No angles → task gets angle_code=null (freestyle)

  const dirCategories = (direction.angle_categories as string[]) ?? [];

  // Filter angles matching this week's direction categories
  const relevant = brandAngles.filter(a =>
    dirCategories.includes(a.category as string)
  );
  const pool = relevant.length > 0 ? relevant : brandAngles;

  // Grade A → winner/performer angles (proven content)
  // Grade B → performer/testing angles (reliable but room to grow)
  // Grade C → untested/testing angles (they test new content)
  const tagPriority: Record<string, string[]> = {
    A: ['winner', 'performer', 'testing', 'untested'],
    B: ['performer', 'testing', 'winner', 'untested'],
    C: ['untested', 'testing', 'performer', 'winner'],
  };

  const priority = tagPriority[grade] ?? tagPriority.C;

  for (const tag of priority) {
    const matches = pool.filter(a => a.performance_tag === tag);
    if (matches.length > 0) {
      // Pick randomly from matches to avoid everyone getting the same angle
      return matches[Math.floor(Math.random() * matches.length)];
    }
  }

  // Fallback: random from pool
  return pool[Math.floor(Math.random() * pool.length)];
}

function slugify(brand: string): string {
  const map: Record<string, string> = {
    'Thiocyn': 'thiocyn', 'Take A Shot': 'take-a-shot', 'Paigh': 'paigh',
    'Dr. Severin': 'dr-severin', 'Wristr': 'wristr', 'Timber & John': 'timber-john',
  };
  return map[brand] ?? brand.toLowerCase().replace(/\s+/g, '-');
}

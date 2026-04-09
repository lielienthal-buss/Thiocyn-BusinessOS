import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * import-creators-csv
 *
 * Upserts creators from a Notion CSV export into the creators table.
 * Unique key: instagram_url (deduplicate by IG handle).
 *
 * POST body:
 *   { rows: Array<{ name, instagram_url, email?, brand?, status?, follower_range?, notes? }> }
 *
 * Usage: Export Notion Creator DB as CSV, parse client-side, send rows[] here.
 * Alternatively, paste CSV text in `csv` field and let the function parse it.
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

    const body = await req.json();
    let rows: Record<string, unknown>[] = body.rows ?? [];

    // If CSV text is provided, parse it
    if (!rows.length && body.csv) {
      rows = parseCsv(body.csv);
    }

    if (!rows.length) {
      return jsonResponse({ error: 'No rows provided. Send { rows: [...] } or { csv: "..." }' }, 400);
    }

    const brandSlugMap: Record<string, string> = {
      'Thiocyn': 'thiocyn', 'Take A Shot': 'take-a-shot', 'Paigh': 'paigh',
      'Dr. Severin': 'dr-severin', 'Wristr': 'wristr', 'Timber & John': 'timber-john',
      'thiocyn': 'thiocyn', 'take-a-shot': 'take-a-shot', 'paigh': 'paigh',
      'dr-severin': 'dr-severin', 'wristr': 'wristr', 'timber-john': 'timber-john',
    };

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = String(row.name ?? row.Name ?? '').trim();
      const igUrl = normalizeInstagramUrl(String(row.instagram_url ?? row.Instagram ?? row['Instagram URL'] ?? '').trim());

      if (!name) {
        skipped++;
        continue;
      }

      const brand = String(row.brand ?? row.Brand ?? 'Paigh').trim();
      const slug = brandSlugMap[brand] ?? brand.toLowerCase().replace(/\s+/g, '-');

      const record: Record<string, unknown> = {
        name,
        instagram_url: igUrl || null,
        email: String(row.email ?? row.Email ?? '').trim() || null,
        brand,
        brand_slug: slug,
        status: mapStatus(String(row.status ?? row.Status ?? 'Prospect').trim()),
        follower_range: String(row.follower_range ?? row.Followers ?? row['Follower Range'] ?? '').trim() || null,
        notes: String(row.notes ?? row.Notes ?? '').trim() || null,
      };

      if (igUrl) {
        // Upsert by instagram_url
        const { data: existing } = await supabase
          .from('creators')
          .select('id')
          .eq('instagram_url', igUrl)
          .maybeSingle();

        if (existing) {
          const { error: upErr } = await supabase
            .from('creators')
            .update(record)
            .eq('id', existing.id);
          if (upErr) errors.push(`Update ${name}: ${upErr.message}`);
          else updated++;
        } else {
          const { error: insErr } = await supabase
            .from('creators')
            .insert([record]);
          if (insErr) errors.push(`Insert ${name}: ${insErr.message}`);
          else imported++;
        }
      } else {
        // No IG URL — check by name
        const { data: existing } = await supabase
          .from('creators')
          .select('id')
          .eq('name', name)
          .maybeSingle();

        if (existing) {
          const { error: upErr } = await supabase
            .from('creators')
            .update(record)
            .eq('id', existing.id);
          if (upErr) errors.push(`Update ${name}: ${upErr.message}`);
          else updated++;
        } else {
          const { error: insErr } = await supabase
            .from('creators')
            .insert([record]);
          if (insErr) errors.push(`Insert ${name}: ${insErr.message}`);
          else imported++;
        }
      }
    }

    return jsonResponse({
      message: `Import complete: ${imported} new, ${updated} updated, ${skipped} skipped`,
      imported,
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total_processed: rows.length,
    });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function normalizeInstagramUrl(url: string): string {
  if (!url) return '';
  // Handle @username format
  if (url.startsWith('@')) {
    return `https://www.instagram.com/${url.slice(1)}/`;
  }
  // Ensure proper URL format
  if (!url.startsWith('http')) {
    return `https://www.instagram.com/${url.replace(/^\//, '')}/`;
  }
  return url.replace(/\/$/, '') + '/';
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    'Sourcing': 'Prospect',
    'Approved Lead': 'Contacted',
    'Influencer': 'Active',
    'Affiliate': 'Active',
    'Ambassador': 'Active',
    'Not Approved': 'Prospect',
  };
  return map[status] ?? status;
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

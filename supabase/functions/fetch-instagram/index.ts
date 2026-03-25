import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: 'url is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) throw new Error('RAPIDAPI_KEY not configured');

    const encoded = encodeURIComponent(url);
    const response = await fetch(
      `https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data.php?reel_post_code_or_url=${encoded}&type=post`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-host': 'instagram-scraper-stable-api.p.rapidapi.com',
          'x-rapidapi-key': rapidApiKey,
        },
      }
    );

    const data = await response.json();

    // Extract the most useful fields for content analysis
    const caption = data?.caption ?? data?.edge_media_to_caption?.edges?.[0]?.node?.text ?? data?.title ?? null;
    const videoUrl = data?.video_url ?? data?.download_url ?? null;
    const thumbnail = data?.thumbnail_url ?? data?.display_url ?? null;
    const likes = data?.like_count ?? data?.edge_liked_by?.count ?? null;
    const plays = data?.play_count ?? data?.video_view_count ?? null;
    const owner = data?.owner?.username ?? data?.username ?? null;
    const timestamp = data?.taken_at_timestamp ?? data?.taken_at ?? null;

    return new Response(
      JSON.stringify({ raw: data, parsed: { caption, videoUrl, thumbnail, likes, plays, owner, timestamp } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

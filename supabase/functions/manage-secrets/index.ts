import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * manage-secrets
 *
 * Secure gateway for integration secrets. Authenticated users can:
 * - GET: Check which integrations are configured (no values exposed)
 * - POST: Store/update a secret (value is stored, never returned)
 * - DELETE: Remove a secret
 *
 * Secrets are stored in integration_secrets table with RLS = no public access.
 * Only service_role (this Edge Function) can read/write.
 */
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with service_role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the user's JWT is valid and has admin role
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check user is admin/owner
    const { data: member } = await supabase
      .from('team_members')
      .select('role')
      .eq('email', user.email)
      .eq('status', 'active')
      .maybeSingle();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions. Admin or owner role required.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // ─── GET: List configured integrations (no values) ────────────
    if (body.action === 'list') {
      const query = supabase
        .from('integration_secrets')
        .select('brand_slug, integration, key_name, updated_at');

      if (body.brand_slug) {
        query.eq('brand_slug', body.brand_slug);
      }

      const { data, error } = await query.order('brand_slug').order('integration');
      if (error) throw error;

      return new Response(
        JSON.stringify({
          secrets: (data ?? []).map(s => ({
            brand_slug: s.brand_slug,
            integration: s.integration,
            key_name: s.key_name,
            configured: true,
            updated_at: s.updated_at,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── POST: Store/update a secret ──────────────────────────────
    if (body.action === 'set') {
      const { brand_slug, integration, key_name, value } = body;

      if (!brand_slug || !integration || !key_name || !value) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: brand_slug, integration, key_name, value' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error } = await supabase
        .from('integration_secrets')
        .upsert({
          brand_slug,
          integration,
          key_name,
          encrypted_value: value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'brand_slug,integration,key_name' });

      if (error) throw error;

      return new Response(
        JSON.stringify({
          message: `Secret stored: ${brand_slug}/${integration}/${key_name}`,
          configured: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── DELETE: Remove a secret ──────────────────────────────────
    if (body.action === 'delete') {
      const { brand_slug, integration, key_name } = body;

      if (!brand_slug || !integration || !key_name) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: brand_slug, integration, key_name' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const { error } = await supabase
        .from('integration_secrets')
        .delete()
        .eq('brand_slug', brand_slug)
        .eq('integration', integration)
        .eq('key_name', key_name);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: `Secret removed: ${brand_slug}/${integration}/${key_name}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: list, set, or delete' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      full_name,
      email,
      password,
      department,
      assigned_brand,
      budget_tokens_monthly = 500000,
      model = 'claude-haiku-4-5-20251001',
    } = await req.json()

    if (!full_name || !email || !password || !department) {
      return new Response(JSON.stringify({ error: 'full_name, email, password, department are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Create Supabase Auth user (requires service role key — safe here, server-side only)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: authErr?.message ?? 'Failed to create auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create intern_accounts row
    const { data: intern, error: internErr } = await supabase
      .from('intern_accounts')
      .insert({
        auth_user_id: authData.user.id,
        full_name,
        email,
        department,
        assigned_brand: assigned_brand || null,
        budget_tokens_monthly,
        model,
        is_active: true,
      })
      .select('id, email, full_name, department')
      .single()

    if (internErr) {
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: internErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ id: intern.id, email: intern.email, full_name: intern.full_name, department: intern.department }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

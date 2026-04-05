import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://thiocyn-businessos.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { application_id, department } = await req.json()

    if (!application_id || !department) {
      return new Response(JSON.stringify({ error: 'application_id and department are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Fetch application
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select('id, full_name, email, stage')
      .eq('id', application_id)
      .single()

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (app.stage === 'rejected') {
      return new Response(JSON.stringify({ error: 'Cannot hire a rejected applicant' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Create Supabase Auth user
    const randomPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}`
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: app.email,
      password: randomPassword,
      email_confirm: true,
    })

    if (authErr || !authData.user) {
      return new Response(JSON.stringify({ error: authErr?.message ?? 'Failed to create auth user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create intern_accounts row
    const { data: intern, error: internErr } = await supabase
      .from('intern_accounts')
      .insert({
        auth_user_id: authData.user.id,
        full_name: app.full_name,
        email: app.email,
        department,
        budget_tokens_monthly: 0,
        model: 'claude-haiku-4-5-20251001',
        is_active: true,
      })
      .select('id, email, full_name')
      .single()

    if (internErr) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: internErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Generate magic link
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: app.email,
      options: { redirectTo: `${APP_URL}/intern/${intern.id}` },
    })

    const magicLink = linkErr || !linkData?.properties?.action_link
      ? `${APP_URL}/intern/${intern.id}`
      : linkData.properties.action_link

    // 5. Update application stage → onboarding
    await supabase
      .from('applications')
      .update({ stage: 'onboarding', decided_at: new Date().toISOString() })
      .eq('id', application_id)

    // Email is NOT sent here — admin confirms separately via send-intern-invite function
    return new Response(JSON.stringify({
      intern_id: intern.id,
      email: intern.email,
      full_name: intern.full_name,
      department,
      email_sent: false,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

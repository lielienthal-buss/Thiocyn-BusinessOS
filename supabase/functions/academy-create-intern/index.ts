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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      full_name,
      email,
      department,
      assigned_brand,
      budget_tokens_monthly = 500000,
      model = 'claude-haiku-4-5-20251001',
    } = await req.json()

    if (!full_name || !email || !department) {
      return new Response(JSON.stringify({ error: 'full_name, email, department are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Generate a strong random password — never returned to client
    const randomPassword = `${crypto.randomUUID()}-${crypto.randomUUID()}`

    // Create Supabase Auth user with email already confirmed
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: randomPassword,
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

    // Generate magic link
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${APP_URL}/intern/${intern.id}`,
      },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      // Non-fatal: intern created but magic link failed — still return success
      console.error('Magic link generation failed:', linkErr?.message)
      return new Response(JSON.stringify({ id: intern.id, email: intern.email, full_name: intern.full_name, department: intern.department, magic_link_sent: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const magicLink = linkData.properties.action_link

    // Send branded invite email via Resend
    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Hartlimes GmbH</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Founders Associate Academy</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:16px;font-weight:600;">Hey ${full_name},</p>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Du wurdest zur <strong>Founders Associate Academy von Hartlimes GmbH</strong> eingeladen.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Department: <strong style="color:#1e293b;">${department.charAt(0).toUpperCase() + department.slice(1)}</strong>
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#2563eb;border-radius:8px;">
                    <a href="${magicLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Zugang aktivieren →
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Note -->
              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Dieser Link ist <strong>einmalig</strong> und <strong>24 Stunden gültig</strong>. Nach dem ersten Login kannst du dein Passwort selbst festlegen.
                </p>
              </div>
              <!-- Portal URL -->
              <p style="margin:0;color:#64748b;font-size:13px;">
                Dein Portal nach dem Login:<br>
                <a href="${APP_URL}/intern/${intern.id}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${APP_URL}/intern/${intern.id}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Hartlimes GmbH · Founders Associate Program</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Founders Associate Academy <noreply@hartlimesgmbh.de>',
        to: email,
        subject: 'Dein Zugang zur Founders Associate Academy 🎓',
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      const resendErr = await resendRes.text()
      console.error('Resend error:', resendErr)
    }

    return new Response(JSON.stringify({
      id: intern.id,
      email: intern.email,
      full_name: intern.full_name,
      department: intern.department,
      magic_link_sent: resendRes.ok,
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

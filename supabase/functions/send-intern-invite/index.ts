import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const APP_URL = Deno.env.get('APP_URL') || 'https://business-os.vercel.app'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { intern_id } = await req.json()

    if (!intern_id) {
      return new Response(JSON.stringify({ error: 'intern_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch intern
    const { data: intern, error: internErr } = await supabase
      .from('intern_accounts')
      .select('id, full_name, email, department')
      .eq('id', intern_id)
      .single()

    if (internErr || !intern) {
      return new Response(JSON.stringify({ error: 'Intern not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate fresh magic link
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: intern.email,
      options: { redirectTo: `${APP_URL}/intern/${intern.id}` },
    })

    if (linkErr || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: 'Failed to generate magic link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const magicLink = linkData.properties.action_link

    // Send email
    const emailHtml = `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;">Founders Associate Academy</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700;">Du wurdest aufgenommen.</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 16px;color:#1e293b;font-size:16px;font-weight:600;">Hey ${intern.full_name},</p>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                wir freuen uns, dich als <strong>${intern.department.charAt(0).toUpperCase() + intern.department.slice(1)}-Intern</strong> im Team begrüßen zu dürfen.
              </p>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
                Über den folgenden Link kannst du deinen Account aktivieren und direkt loslegen.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#2563eb;border-radius:8px;">
                    <a href="${magicLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Account aktivieren →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  Dieser Link ist <strong>einmalig</strong> und <strong>24 Stunden gültig</strong>. Nach dem ersten Login kannst du dein Passwort selbst festlegen.
                </p>
              </div>
              <p style="margin:0;color:#64748b;font-size:13px;">
                Dein Portal nach dem Login:<br>
                <a href="${APP_URL}/intern/${intern.id}" style="color:#2563eb;text-decoration:none;">${APP_URL}/intern/${intern.id}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">Founders Associate Program</p>
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
        from: 'Founders Associate Academy <hiring@takeashot.de>',
        to: intern.email,
        subject: 'Du bist dabei — Account aktivieren',
        html: emailHtml,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.text()
      return new Response(JSON.stringify({ error: `Resend error: ${err}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, email: intern.email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

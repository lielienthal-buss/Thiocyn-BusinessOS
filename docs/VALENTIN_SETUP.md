# Business OS — Valentin Setup Checklist

Alles was einmalig konfiguriert werden muss, damit das Tool produktionsbereit ist.
Reihenfolge einhalten.

---

## 1. Supabase — SQL Scripts ausführen

Supabase Dashboard → **SQL Editor** → jeweils als neues Query einfügen + ausführen.

### Reihenfolge:

| # | Datei | Inhalt |
|---|---|---|
| 1 | `supabase_v2_missing_pieces.sql` | Fehlende Spalten (`captcha_token`, etc.) + `submit_application` RPC-Funktion |
| 2 | `supabase_business_os.sql` | Neue Tabellen: disputes, invoices, team_tasks, ecom_metrics, ecom_orders, ad_campaigns, brand_metrics |
| 3 | `supabase_notifications.sql` | Notifications-Tabelle + Realtime aktivieren |
| 4 | `supabase_intern_accounts.sql` | intern_accounts + intern_token_usage Tabellen |
| 5 | `supabase_academy.sql` | Academy-Tabellen (weekly reviews, learning log) |

> **Alle Scripts sind idempotent** (`IF NOT EXISTS`, `OR REPLACE`) — sicher auf bestehenden Daten.

---

## 2. Supabase — Realtime aktivieren

Dashboard → **Database → Replication** → Sicherstellen dass `notifications` in der Publikation ist.

(Wird bereits durch `supabase_notifications.sql` erledigt, aber manuell verifizieren)

---

## 3. Supabase — Edge Functions deployen

```bash
supabase functions deploy academy-chat
supabase functions deploy academy-create-intern
```

Danach: **Dashboard → Edge Functions → Settings → Secrets** folgende hinzufügen:

| Secret | Wert |
|---|---|
| `ANTHROPIC_API_KEY` | sk-ant-... (Luis/Team Key) |
| `SUPABASE_URL` | https://dfzrkzvsdiiihoejfozn.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | aus Supabase Settings → API → service_role |

> ⚠️ `ANTHROPIC_API_KEY` hier = **Intern Academy AI**. Separat von Vercel.
> Wenn NICHT gesetzt → Academy Chat deaktiviert (safe default für Prod-Start).

---

## 4. Vercel — Environment Variables

Dashboard → Project → **Settings → Environment Variables** → folgende setzen (alle Environments: Production + Preview + Development):

| Variable | Wert | Wo |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://dfzrkzvsdiiihoejfozn.supabase.co` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon/public key) | Supabase → Settings → API |
| `VITE_TURNSTILE_SITE_KEY` | Site Key | Cloudflare Turnstile → Site |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic Console |

> `ANTHROPIC_API_KEY` auf Vercel = für `/api/jarvis` (Admin Chat + Public ChatBot).
> Kein `VITE_`-Prefix → bleibt server-side, nie im Browser.

---

## 5. Vercel — Redeploy

Nach Setzen der Env-Vars: **Deployments → Redeploy** (ohne Cache-Reset).

---

## 6. Supabase — Ersten Admin-User anlegen

Dashboard → **Authentication → Users → Invite User**

E-Mail: `luis@mail.hartlimesgmbh.de` (oder die gewünschte Admin-Mail)

Dann in **SQL Editor**:
```sql
-- Admin in team_members eintragen
INSERT INTO team_members (email, full_name, role, allowed_sections, status)
VALUES ('luis@mail.hartlimesgmbh.de', 'Luis Lielienthal', 'owner', ARRAY['home','hiring','marketing','support','ecommerce','finance','analytics','admin'], 'active')
ON CONFLICT (email) DO NOTHING;
```

---

## 7. Recruiter Settings — Company Name setzen

Im Tool: **Admin Dashboard → Admin → Settings** → Company Name: `Hart Limes GmbH`

Oder direkt in SQL:
```sql
UPDATE recruiter_settings SET company_name = 'Hart Limes GmbH' WHERE id = 1;
```

---

## 8. Optional: Turnstile — Secret Key (Server-Side Validation)

Aktuell wird der Turnstile-Token aus dem Frontend durchgereicht, aber nicht serverseitig verifiziert (die `submit_application` SQL-Funktion speichert ihn nur). Wenn serverseitige Verifizierung gewünscht:

Dashboard → Cloudflare Turnstile → Site → **Secret Key** → als `TURNSTILE_SECRET_KEY` in Vercel setzen → Edge Function `submit_application` oder neuen API-Endpoint erweitern.

> Für Launch nicht zwingend notwendig — Token-Logging ist bereits aktiv.

---

## Status

- [ ] SQL Scripts ausgeführt (Schritt 1–5)
- [ ] Realtime verifiziert (Schritt 2)
- [ ] Edge Functions deployed (Schritt 3)
- [ ] Supabase Edge Function Secrets gesetzt (Schritt 3)
- [ ] Vercel Env Vars gesetzt (Schritt 4)
- [ ] Vercel Redeploy (Schritt 5)
- [ ] Admin User angelegt (Schritt 6)
- [ ] Company Name in Settings (Schritt 7)

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

## 6. Supabase — Admin-User anlegen

Dashboard → **Authentication → Users → Invite User**

Einladungen schicken an:
- `luis@mail.hartlimesgmbh.de`
- `peter@mail.hartlimesgmbh.de`
- `valentin@mail.hartlimesgmbh.de`

Dann `supabase_team_members.sql` im SQL Editor ausführen — seeds Luis (owner), Peter Hart (admin), Valentin (admin) automatisch.

Oder manuell:
```sql
-- Bereits in supabase_team_members.sql enthalten — einfach die Datei ausführen
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

## 9. Supabase — Brand + Process Layer

Run these SQL scripts in Supabase SQL Editor (in order):

| # | File | Inhalt |
|---|---|---|
| 6 | `supabase_brand_layer.sql` | brands (6 Brands), brand_configs, agent_logs |
| 7 | `supabase_process_layer.sql` | processes (8 SOPs), process_steps, knowledge_entries (Brand Briefs + Guidelines) |
| 8 | `supabase_iso_layer.sql` | ISO 9001/27001/31000/14001/45001/50001 — 12 Compliance-Tabellen, Risk Register (10 Seeds) |
| 9 | `supabase_team_members.sql` | team_members seeds: Luis (owner), Peter Hart (admin), Valentin (admin) |

> After running: verify in Table Editor that all 6 brands appear in `brands` table.

---

## 10. n8n — Automation Setup

Full instructions in `docs/N8N_HANDOFF.md`. Quick summary:

1. Create n8n Cloud account (n8n.io/cloud)
2. Import all 8 workflows from `n8n/workflows/`
3. Set env vars:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://dfzrkzvsdiiihoejfozn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API → service_role |
| `RESEND_API_KEY` | Resend → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `META_ACCESS_TOKEN` | Meta Business → System User |

4. Configure credentials per N8N_HANDOFF.md Step 3
5. Register webhooks in Supabase, PayPal, Stripe, GetMyInvoices
6. Activate workflows in order (see N8N_HANDOFF.md Step 11)

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
- [ ] Brand Layer SQL ausgeführt (Schritt 9)
- [ ] Process Layer SQL ausgeführt (Schritt 9)
- [ ] n8n Account erstellt (Schritt 10)
- [ ] n8n Workflows importiert (Schritt 10)
- [ ] Webhooks konfiguriert (Schritt 10)

# Hiring Funnel — Setup Checklist

Alles was einmalig konfiguriert werden muss, damit der Hiring-Funnel produktionsbereit läuft.

## Mail-Philosophie

**Keine Auto-Replies an Bewerber.** Bewerbungen werden manuell im Dashboard bearbeitet. Mail-Kontakt mit Bewerber startet erst nach `Hire`-Klick (Magic-Link + Agreement). Damit:
- Kein Workspace-Admin-Setup für `hiring@`-Empfang nötig
- Kein Reply-To-Routing nötig
- `hiring@hartlimesgmbh.de` ist nur **Sender-Identity** (für Outbound aus Hire-Flow)

## Flow

```
1. Bewerber  → Funnel-Form  → INSERT in DB
2. DB-Webhook → process-new-application Edge Function → Slack #hiring "neue Bewerbung"
3. Admin/Danylo  → Dashboard → Recruiting → Bewerbung bearbeiten (review, manueller Kontakt out-of-band falls nötig)
4. Hire-Klick → hire-candidate Edge Function → intern_account + Magic-Link
5. Send-Invite-Bestätigung → send-intern-invite Edge Function → Magic-Link-Mail + Agreement-Link an Bewerber
6. Bewerber loggt sich ein → Onboarding-Flow im Academy-Tab
```

> **Code ist vollständig fertig.** Nur Infrastructure-Setup fehlt.

---

## Status

| Komponente | Status |
|---|---|
| Funnel-Pages (3 Funnels live) | ✅ |
| Forms schreiben in DB | ✅ |
| Admin-Views (Recruiting, Ambassador, M&A) | ✅ |
| AI-Scoring (`analyze-applicant`) | ✅ |
| Hire-Flow (`hire-candidate` Edge Function + UI) | ✅ |
| Magic-Link-Mail (`send-intern-invite` mit Agreement-Link) | ✅ |
| Slack-Notify (`process-new-application` v2 — keine Auto-Reply) | ✅ deployed |
| Fellowship-Agreement-Page (`/fellowship-agreement`) | ✅ |
| **DNS Setup für hartlimesgmbh.de** | ⏳ Valentin |
| **Resend Domain Verify** | ⏳ Valentin |
| **Supabase ENV-Vars** | ⏳ Valentin |
| **recruiter_settings Row aktualisieren** | ⏳ Luis (Table Editor) |
| **Database Webhooks (3 Tabellen)** | ⏳ Luis/Valentin |
| **Slack Webhook für #hiring** | ⏳ Luis (Slack-Workspace-Owner) |

---

## 1. DNS Setup (All-Inkl KAS, Domain `hartlimesgmbh.de`)

### A) E-Mail-Forward `hiring@hartlimesgmbh.de` → Googlemail

KAS → **Mail-Konten** → `hartlimesgmbh.de` → Adresse `hiring` als **Forward** auf Luis Googlemail-Adresse einrichten.

> Damit landen alle Antworten auf Bewerbungs-Mails bei Luis im Gmail.

### B) Resend SPF + DKIM (für Outgoing-Mails)

1. **Resend-Dashboard** → Domains → "Add Domain" → `hartlimesgmbh.de`
2. Resend zeigt 3 DNS-Records an (genaue Werte aus Resend kopieren!):

| Type | Host | Value |
|---|---|---|
| TXT | `@` (root) | `v=spf1 include:resend.com ~all` |
| TXT | `resend._domainkey` | DKIM-Key (langer String, aus Resend) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@hartlimesgmbh.de` (optional) |

3. KAS → **DNS-Verwaltung** → 3 Records eintragen
4. Nach Eintrag: in Resend "Verify Domain" klicken (kann ~24h dauern)

---

## 2. Supabase Setup

### A) Edge-Function-Environment-Variables

Dashboard → **Project Settings → Edge Functions → Manage Secrets**:

| Var | Wert | Wo herholen |
|---|---|---|
| `RESEND_API_KEY` | `re_xxxxx...` | Resend Dashboard → API Keys |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | Siehe Slack-Setup unten |

> Beide ENV-Vars sind **optional** — wenn nicht gesetzt, läuft die Edge Function trotzdem durch (skippt nur den jeweiligen Schritt). Damit kein Hard-Block beim Deployment.

### B) `recruiter_settings` Row aktualisieren

Dashboard → **Table Editor** → `recruiter_settings` → ID 1 bearbeiten:

| Column | Wert |
|---|---|
| `from_email` | `hiring@hartlimesgmbh.de` |
| `from_name` | `HSB Hiring Team` |
| `app_url` | `https://hsb-os.vercel.app` |
| `company_name` | `House of Sustainable Brands` |
| `program_name` | `HSB Founders University` |
| `calendly_url` | `https://calendly.com/...` (zentraler Fallback-Link, optional) |
| `funnel_owners` | `{}` (wird über UI gepflegt — siehe unten) |
| `feature_flags.intern_invite_send` | `true` (nach Resend-Verify) |

### B2) Calendly Per-User + Funnel-Owners (über UI, kein Table-Editing nötig)

**Per-User Calendly:** Jeder Admin/Staff trägt seinen eigenen Calendly-Link ein:
- App → **Account-Profil** → "Calendly Booking-Link" → URL eintragen → Save

**Funnel-Owner-Mapping:** Admin definiert pro Funnel-Type, wer den Intro-Call macht:
- App → **Settings** → Tab "🎯 Funnel Owners" → pro Funnel den Owner aus Dropdown wählen → Save
- 3 Funnels: `applications` (Founders University) · `ambassador_applications` · `ma_inquiries`
- Wenn Owner gesetzt: dessen Calendly-Link landet automatisch in der Auto-Reply-Mail
- Fallback: wenn kein Owner gesetzt ODER Owner hat keinen Link, wird `recruiter_settings.calendly_url` verwendet (zentraler Link)

### C) Database Webhooks (3 Tabellen)

Dashboard → **Database → Webhooks** → "Create a new hook" → 3× erstellen:

| Name | Table | Events | HTTP Method | URL |
|---|---|---|---|---|
| `notify-applications` | `applications` | INSERT | POST | `https://<project>.supabase.co/functions/v1/process-new-application` |
| `notify-ambassadors` | `ambassador_applications` | INSERT | POST | `https://<project>.supabase.co/functions/v1/process-new-application` |
| `notify-ma-inquiries` | `ma_inquiries` | INSERT | POST | `https://<project>.supabase.co/functions/v1/process-new-application` |

**HTTP Headers:** Supabase fügt `Authorization: Bearer <service-role>` automatisch hinzu — keine zusätzlichen Headers nötig.

### D) Edge Function Deploy

Aus dem Repo deployen (Luis macht das via Supabase CLI):

```bash
cd /Users/luislielienthal/Documents/Arbeit/Thiocyn-BusinessOS
supabase functions deploy process-new-application
supabase functions deploy send-intern-invite  # bereits deployed, aber refresh wegen Agreement-Link
```

---

## 3. Slack Setup

### A) Incoming Webhook für #hiring

1. **Slack-Workspace** → Apps → Incoming Webhooks installieren (falls noch nicht da)
2. "Add to Slack" → Channel: `#hiring` (anlegen falls nicht vorhanden)
3. Webhook-URL kopieren (`https://hooks.slack.com/services/...`)
4. In Supabase ENV als `SLACK_WEBHOOK_URL` eintragen (siehe 2A)

### B) (Später) Auto-Invite für neue Fellows zum Slack-Workspace

Out of scope für jetzt. TODO:
- Slack-Bot mit `users:write.invite` scope erstellen
- Token in Supabase ENV als `SLACK_BOT_TOKEN`
- Edge Function `auto-invite-fellow-to-slack` schreiben (called from `hire-candidate`)

---

## 4. Test-Plan nach Setup

1. **Bewerbungs-Test (Submit-Flow):**
   - Auf https://hsb-os.vercel.app/founders-university bewerben mit Test-E-Mail
   - **Erwartet:** Slack-Message in `#hiring` + Auto-Reply-Mail im Test-Postfach + Eintrag in Admin → Recruiting → Applications

2. **Hire-Test (End-to-End):**
   - Im Admin → Recruiting → Test-Bewerbung öffnen → "Hire" klicken → Department wählen
   - **Erwartet:** Auth-User erstellt, Confirm-Modal "Magic Link senden?" erscheint
   - "Bestätigen" klicken
   - **Erwartet:** Magic-Link-Mail im Test-Postfach mit Agreement-Link, Bewerbung-Stage = onboarding

3. **Agreement-Test:**
   - Magic-Link-Mail öffnen → Link `/fellowship-agreement` klicken
   - **Erwartet:** Template wird gerendert, "Drucken / PDF speichern" funktioniert

4. **Mass-Invite-Test (für existing Fellows):**
   - Admin → Academy → Cohort Management → "Pending Invites"-Banner
   - "Send all invites" klicken (Button ist disabled solange `feature_flags.intern_invite_send = false`)

---

## 5. Was Luis selbst kann (nichts Technisches)

- recruiter_settings Row aktualisieren (Table Editor)
- Database Webhooks erstellen (Dashboard, Klick-Konfig)
- Slack Webhook erstellen (Slack Admin)
- Calendly-Link aus seinem Calendly-Account holen + in `recruiter_settings.calendly_url` eintragen

## 6. Was Valentin braucht

- DNS-Records bei All-Inkl KAS eintragen
- Resend-Account zugänglich (oder Luis macht's)
- Supabase Edge-Function-CLI deployen
- ENV-Vars in Supabase setzen

---

## Reihenfolge (Critical Path)

1. Resend-Account anlegen + Domain hinzufügen → DNS-Records anzeigen lassen
2. DNS-Records bei KAS eintragen (parallel: hiring@-Forward einrichten)
3. ~24h Wartezeit für DNS-Propagation
4. Resend-Domain verifizieren
5. `RESEND_API_KEY` in Supabase ENV setzen
6. `recruiter_settings.from_email` auf `hiring@hartlimesgmbh.de` setzen
7. `recruiter_settings.feature_flags.intern_invite_send = true` flippen
8. Slack-Webhook erstellen, URL in ENV setzen
9. Database Webhooks erstellen (3×)
10. Edge Functions deployen (`process-new-application`, ggf. send-intern-invite refresh)
11. Test-Plan durchgehen (siehe oben)

**Geschätzte Gesamtzeit:** 2-3h aktive Arbeit + 24h Wartezeit für DNS.

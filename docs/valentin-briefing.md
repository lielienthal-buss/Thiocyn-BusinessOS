# Valentin — Tech Briefing
**Hartlimes Business OS · Stand: März 2026**
*Prepared by Jan-Luis Lielienthal*

---

## Was wir bauen

Das **Hartlimes Business OS** ist ein internes Betriebssystem für alle 6 Brands der Hartlimes GmbH (Thiocyn, Take A Shot, Paigh, Dr. Severin, Wristr, Timber & John).

Ziel: Ein einziges Tool für HR, Marketing, Finance, Customer Support, Analytics und Team-Management — statt 10+ verschiedene SaaS-Tools.

**Live unter:** [business-os.vercel.app] (intern)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel |
| Automation | n8n (self-hosted, 8 Workflows aktiv) |
| AI | OpenAI GPT (Briefings), Higgsfield (Video Generation) |

---

## Aktuelle Module

| Modul | Status |
|---|---|
| Hiring Pipeline (Kanban, AI-Score, Onboarding) | ✅ Produktiv |
| Customer Support Hub (Brand-Status, Team, Links) | ✅ Live |
| Finance (Disputes, Mahnungen, Invoices) | ✅ Live |
| Marketing (Brand Status, Content, Creator Pipeline) | ✅ Live |
| Intern Portal (/intern/:id) | ✅ Deployed |
| Rollen & Permissions (owner/admin/staff/intern_lead) | ✅ Live |
| Tool Stack Tracker | ✅ Neu |
| Ad Performance Dashboard | 🔧 In Arbeit (Ansh) |
| Booking / SetTime (Calendly-Äquivalent) | 📋 Geplant |

---

## Automation — Make vs. n8n

Ich habe bereits 8 n8n-Workflows gebaut (Meta Ads Snapshot, Shopify Sync, Dispute Triage, Invoice Intake, Weekly Standup, u.a.).

**Vorschlag:** Bestehende Make-Flows lassen wie sie sind. Neue Automationen auf n8n — stärker, kosteneffizienter bei Skalierung, self-hosted.

Ich würde das gerne **gemeinsam mit dir** durchgehen:
- Welche Make-Flows laufen aktuell?
- Was lässt sich sinnvoll migrieren?
- Wo bauen wir neue Automationen direkt in n8n?

---

## Was ich von dir brauche

Für die nächste Ausbaustufe (Ad Performance, Email-Triage, Kalender-Sync) brauche ich folgende Credentials / Zugänge:

### Google
- [ ] Google Ads: Developer Token, OAuth Client ID/Secret, Refresh Token
- [ ] Google Ads Customer IDs (Take A Shot, Thiocyn, Paigh)
- [ ] Google Calendar API OAuth (für Buchungs-App)
- [ ] Gmail API OAuth (für automatische Email-Triage)

### Meta
- [ ] Meta App ID + App Secret
- [ ] Long-lived User Access Token
- [ ] Ad Account IDs (Take A Shot, Thiocyn, Paigh)

### Shopify
- [ ] Admin API Access Token — Take A Shot
- [ ] Admin API Access Token — Thiocyn
- [ ] Admin API Access Token — Paigh

> Alle Tokens werden **ausschließlich server-side** verwendet (n8n / Supabase Edge Functions). Nie im Frontend.

---

## Was wir dir zeigen

1. **Das Dashboard live** — alle Module, Rollen, View-As-Switcher
2. **Die n8n Workflow-Übersicht** — was läuft, was ist geplant
3. **Die Datenbankstruktur** — Supabase Schema, RLS Policies
4. **Den Deployment-Flow** — Vercel + GitHub

---

## Nächste gemeinsame Schritte

1. Make-Review: welche Flows existieren, was bleibt/migriert
2. Credentials übergeben (nach eigenem Tempo — keine Eile)
3. Google Calendar OAuth gemeinsam aufsetzen (30 Min)
4. Optional: erster gemeinsamer n8n-Workflow live bauen

---

*Fragen vorab: jan-luis@hartlimesgmbh.de*

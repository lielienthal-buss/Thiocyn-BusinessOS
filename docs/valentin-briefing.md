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

Für die nächste Ausbaustufe brauche ich folgende Credentials. Dahinter steht jeweils, **wofür genau**:

### Google Ads
| Credential | Wozu |
|---|---|
| Developer Token | Ermöglicht API-Zugriff auf Google Ads überhaupt |
| OAuth Client ID + Secret | Authentifizierung für den n8n-Workflow |
| Refresh Token | Damit n8n sich dauerhaft selbst erneuert (kein manuelles Re-Login) |
| Customer IDs (TAS, Thiocyn, Paigh) | Welche Ad-Accounts wir pullen — ohne das fragen wir ins Leere |

→ **Ergebnis:** Täglicher Auto-Snapshot aller Kampagnen im Analytics-Dashboard

### Google Calendar
| Credential | Wozu |
|---|---|
| OAuth Client ID + Secret | Damit unser Buchungs-Tool (SetTime) Termine direkt in deinen/meinen Kalender einträgt |
| Refresh Token | Dauerhafter Zugriff ohne manuelle Bestätigung |

→ **Ergebnis:** Jemand bucht einen Slot → Termin landet automatisch im Google Calendar

### Gmail
| Credential | Wozu |
|---|---|
| OAuth Client ID + Secret | Damit n8n eingehende Mails lesen und automatisch vorsortieren kann |
| Refresh Token | Dauerhafter Zugriff |

→ **Ergebnis:** Automatische Inbox-Triage — Mails werden nach Dringlichkeit geclustert, bevor ich sie öffne

### Meta Ads
| Credential | Wozu |
|---|---|
| App ID + App Secret | Basis-Auth für die Meta Marketing API |
| Long-lived Access Token | Langfristiger Zugriff (60 Tage, danach einmal erneuern) |
| Ad Account IDs (TAS, Thiocyn, Paigh) | Welche Accounts wir abfragen |

→ **Ergebnis:** Täglicher ROAS/Spend/CPM-Snapshot im Analytics-Dashboard (Ansh baut den Ingest)

### Shopify
| Credential | Wozu |
|---|---|
| Admin API Token — Take A Shot | Revenue, Orders, Returns in Supabase syncen |
| Admin API Token — Thiocyn | Gleich |
| Admin API Token — Paigh | Gleich |

→ **Ergebnis:** Echte Revenue-Zahlen im Business OS — Basis für P&L pro Brand

> **Security:** Alle Tokens leben ausschließlich in n8n / Supabase Vault — nie im Frontend-Code, nie in Git.

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

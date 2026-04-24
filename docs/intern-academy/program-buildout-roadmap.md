# Founders Associate Program — Buildout Roadmap

> Ursprünglicher 4-Wochen-Bauplan aus Notion (Luis, Dezember 2025) zum Aufbau des Founders-Associate-Bewerber-Pools + Onboarding-Systems. Jetzt mit Delivery-Status (Stand 2026-04-24).

## Phase 0 · Vorbereitung & Setup

**Ziel:** Infrastruktur & Prozessbasis schaffen
**Original-Timeline:** Woche 1

| # | Task | Status | Where |
|---|---|---|---|
| 1 | Landingpage erstellen / LinkedIn Ad vorbereiten | ✅ Done | `hsb-os.vercel.app` Landing + funnel pages |
| 2 | Bewerbungsformular + Pflichtfelder definieren | ✅ Done | `/founders-university` (4-step ApplicationForm mit BFI + Turnstile) |
| 3 | KI-Scoring & automatisierte Alerts einrichten | ❌ Pending | Manuell via Recruiting Section + InsightsView |
| 4 | Hiring-Dashboard konfigurieren (Status, Aktionen, Reports) | ✅ Done | Recruiting Section: `RecruitingOverview`, `ApplicationListView`, `KanbanBoard`, `InsightsView` |
| 5 | Founders Associate Dashboard vorbereiten | ✅ Done | Academy Section: `FellowCourseView` (rolle-basiert in `AcademyView` Dispatcher) |
| 6 | Starter Tasks erstellen (Tech, Marketing etc.) | 🟡 Partial | `TaskManager` (HiringTask) Schema da, Templates noch nicht für alle Tracks befüllt |
| 7 | DSGVO-konforme Consent-Formulare + Datenschutzerklärung | ✅ Done | `consent_data_processing_at` auf allen 3 Funnel-Forms (applications, ambassador_applications, ma_inquiries) |

---

## Phase 1 · Testlauf Bewerber-Pool

**Ziel:** Funnel validieren, erste Bewerbungen testen
**Original-Timeline:** Woche 2

| # | Task | Status | Where |
|---|---|---|---|
| 1 | LinkedIn Ad live → erste Bewerbungen | ❌ Pending | Landing live, Ad-Spend ausstehend |
| 2 | Task-First-Prozess testen: Task zuweisen → Feedback sammeln | 🟡 Partial | Schema da, Live-Cycle mit Cohort 2026-04 läuft |
| 3 | KI-Scoring prüfen → Recruiter-Sichtung testen | ❌ Pending | Kein KI-Scoring eingebaut |
| 4 | Dashboard-Alerts & Reporting prüfen | 🟡 Partial | RecruitingOverview hat "Needs your attention" Callout, keine push-notifications |
| 5 | Starter Task + Info-Mail an Bewerber testen | ✅ Done | `EmailTemplateManager` + ApplicationForm Workflow |

---

## Phase 2 · Onboarding & Founders Associate Dashboard

**Ziel:** Bewerber nach Task in Dashboard integrieren, produktiv starten
**Original-Timeline:** Woche 3

| # | Task | Status | Where |
|---|---|---|---|
| 1 | Angenommene Bewerber → Onboarding-Mail + Zugang zum Founders Associate Dashboard | ✅ Done | Magic Link Flow (Supabase auth) + AddInternModal in AdminAcademyView |
| 2 | Ressourcen, Guidelines, Videokurse, Tasks zuweisen | 🟡 Partial | Tom's Docs in Program-Tab (text). Videokurse fehlen. Tasks via intern_assignments |
| 3 | Weekly-Rhythmus implementieren | ✅ Done | Monday Meeting Template + week-counter in FellowCourseView ("Woche X / 12") |
| 4 | Feedback-Mechanismen / Sparring-Kanäle testen | 🟡 Partial | Internal notes auf Application/MA/Ambassador, Buddy-Notes via intern_weekly_reviews; sparring-channel = noch ad-hoc Slack |
| 5 | Fortschritt & Task Completion tracken | ✅ Done | intern_assignments + intern_milestones + Onboarding-Checklist View |

---

## Phase 3 · Dynamische Projektzuweisung

**Ziel:** Projekte automatisch füllen + fehlende Persönlichkeiten berücksichtigen
**Original-Timeline:** Woche 4

| # | Task | Status | Where |
|---|---|---|---|
| 1 | Mini-Fragebogen für neue Projekte implementieren | ❌ Pending | Project-Definition lebt aktuell in `project_areas` + `intern_assignments`, kein Auto-Match-Trigger |
| 2 | Automatisches Matching mit Bewerber-Pool basierend auf Skills / Persönlichkeit | ❌ Pending | BFI-Daten werden bei Bewerbung erhoben, aber nicht für Auto-Match genutzt |
| 3 | Starter Tasks automatisch zuweisen | 🟡 Partial | TaskManager hat HiringTask Templates, Auto-Assign auf Status-Change fehlt |
| 4 | Feedback-Loop + Gespräch implementieren | 🟡 Partial | Eval Layer in FellowCourseView (Phase Promotion), Gesprächsplanung manuell |
| 5 | Status Updates + Projektberichte im Dashboard integrieren | ✅ Done | AdminAcademyView Cohort-Tabelle, Drill-Down Eval-Layer |

---

## Was als nächstes priorisieren

Nach diesem Buildout-Stand:

1. **🔴 Größter Gap: KI-Scoring + Auto-Matching** (Phase 1+3) — der „dynamische Pool"-Teil fehlt komplett. Ohne das wird Skalierung manuell teuer.
2. **🟡 Videokurse / Resources-Library** (Phase 2) — Markdown reicht, aber Video für komplexere Themen wäre Asset.
3. **🟡 Push-Notifications für Backlog-Items** (Phase 1) — RecruitingOverview zeigt "Needs your attention" passiv. Slack-Integration würde es proaktiv machen.
4. **🟡 LinkedIn Ad live** (Phase 1) — Funnel-Throughput-Frage, Marketing-Budget-Entscheidung.

## Quellen

- Notion: "🚀 Step-by-Step Strategie: Aufbau Bewerber-Pool + Onboarding-System" (Luis, Dezember 2025)
- Code: `components/admin/{AcademyView, FellowCourseView, AdminAcademyView, ApplicationListView, RecruitingOverview, OnboardingChecklistView, TaskManager}.tsx`
- Schema: Supabase tables `intern_*`, `applications`, `ambassador_applications`, `ma_inquiries`, `monday_meetings`, `assignment_templates`

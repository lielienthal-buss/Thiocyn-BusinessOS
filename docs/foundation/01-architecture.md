# 01 — Business OS Architecture (IST)

**Last updated:** 2026-04-10
**Stand:** Live verifiziert gegen Supabase `dfzrkzvsdiiihoejfozn` + Repo
**Verwendung:** Single-Reference für IST-Zustand. Vor jeder Code-Änderung lesen, nicht aus älteren Docs ableiten.

---

## Scope dieses Dokuments

Dieses Doc beschreibt **was heute existiert**, nicht was geplant ist. Es verwendet eine **Source-of-Truth-Taxonomie** statt einer reinen Tabellenliste — d. h. für jedes Datum ist klar wo es entsteht, wer es liest, wer es schreibt.

**Was hier NICHT drin ist:**
- Strategie / Roadmap (gehört in `03-charter.md`)
- Owner / Decision Authority (gehört in `02-ownership.md`)
- AI-Aktivierungs-Logik (gehört in `05-ai-strategy.md`)
- Code-Conventions (gehört in `04-dev-guidelines.md`)

---

## 1. Source-of-Truth Taxonomie

Jede Tabelle ist genau einer Kategorie zugeordnet. Doppel-Writes sind verboten.

| Kategorie | Definition | Beispiel |
|---|---|---|
| **SoT** (Source of Truth) | Original-Daten. Wird hier zuerst geschrieben. Alle anderen Tabellen leiten ab. | `applications` (Bewerber-Eingang) |
| **Derived** | Berechnet aus SoT. Niemand schreibt direkt rein außer der ableitenden Function. Read-only für UI. | `aggregated_brand_revenue` (würde aus `ecom_orders` berechnet) |
| **Cache** | Externe Daten gepullt + lokal gespeichert für Performance. Refresh via Sync-Function. | `ad_campaigns` (Meta/Google Ads Snapshot) |
| **Linking** | Pure Many-to-Many. Keine eigenen Daten. | `creator_brands` |
| **Empty** | Tabelle existiert, hat aber 0 Rows — Modul gebaut, nicht in Verwendung | `creators`, `intern_weekly_reviews` |
| **Config** | Statische / selten geänderte Konfiguration | `recruiter_settings`, `brand_configs` |

**Regel:** Wenn eine Tabelle Cache ist, darf das Frontend dort niemals direkt schreiben. Schreibe geht ausschließlich über die Sync-Function. Verstöße sind P0-Bugs.

---

## 2. Modul-Index (14 Module identifiziert)

| # | Modul | SoT-Tabellen | Edge Functions | Status |
|---|---|---|---|---|
| 1 | **Hiring (Recruiter Pipeline)** | applications, recruiter_settings, project_areas, application_notes, email_templates, form_events | analyze-applicant, hire-candidate, send-email | ✅ live, 47 Bewerber |
| 2 | **Intern Academy** (rebuilt 10.04.) | intern_accounts (erweitert), intern_goals, intern_milestones, assignment_templates, intern_assignments, monday_meetings, intern_meeting_attendance, intern_weekly_reviews, intern_learning_log, intern_final_review, intern_onboarding_checklist (legacy), intern_token_usage | academy-create-intern, academy-chat, send-intern-invite, admin-generate-magic-link, admin-set-intern-password | ✅ Phase 1-4 gebaut, 19 templates seeded, 60 assignments live, 10 milestones |
| 3 | **Finance** | finance_pipeline, finance_mails, disputes, monthly_reports, monthly_inventory, monthly_b2b_invoices | sync-paypal-reports, sync-paypal-disputes, fetch-finance-mails, analyze-finance-mail, finance-pipeline-webhook | 🟡 partial, 3 von 6 Tabellen befüllt, AI inactive |
| 4 | **Customer Support** | support_tickets | (keine — Chatarmin-Webhook geplant) | 🟡 Mock-Daten, Pre-Req Chatarmin nicht erfüllt |
| 5 | **Tasks + Daily Briefing** | team_tasks, hiring_tasks, daily_briefings, notifications | daily-briefing, generate-briefing, emma-work-plan | 🟡 Tasks aktiv, Briefing-Bug (siehe §6) |
| 6 | **Marketing / Content** | content_posts, content_directions, hashtag_strategies, creative_angles, content_queue, content_outputs, creative_assets, asset_performance, angle_insights | fetch-instagram, sync-ad-performance | 🟡 4/9 Tabellen befüllt, AI-Analysen leer |
| 7 | **Creator Program** | creators, creator_brands, creator_tasks, creator_performance, creator_commissions, creator_payouts, creator_prospects, creator_gifts, usage_rights_consent | distribute-creator-tasks, snapshot-creator-performance, import-creators-csv | 🔴 ALLE 9 Tabellen leer (Modul gebaut, nicht befüllt) |
| 8 | **eCommerce** | ecom_orders, ad_campaigns, ads_metrics, product_performance, shopify_sync_log | sync-shopify-sales, sync-ad-performance | 🟡 partial, Shopify-Sync nie gelaufen, 2/5 Tabellen befüllt |
| 9 | **Brand Management** | brands, brand_configs, brand_metrics | (indirect via sync) | ✅ live, 7 Brands (1 mehr als Memory sagt) |
| 10 | **ISO Compliance** | risk_register, security_incidents, business_risks, non_conformances | (keine) | ✅ live, 4/4 Tabellen befüllt |
| 11 | **System / Meta** | team_members, profiles, integration_secrets, sync_log, access_requests, user_workspace_config, user_mails, user_mail_accounts | jarvis-chat, manage-secrets, fetch-user-mails | 🟡 team_members nahezu leer (Luis + deactivated Sameer) |
| 12 | **Lead Capture** | roi_leads, thiocyn_quiz_leads, form_events | (keine — externe Landing Pages schreiben rein) | 🟡 partial |
| 13 | **Video Generation** | video_jobs | (keine — Higgsfield via MCP außerhalb) | 🔴 leer |
| 14 | **Knowledge Base** | knowledge_entries (existiert nicht in DB!) | (keine) | 🔴 BROKEN VIEW — UI referenziert nicht-existente Tabelle |

---

## 3. Modul-Detail

### Modul 1 — Hiring (Recruiter Pipeline)

**Status:** ✅ live, Tabellen befüllt, Funnel funktioniert

**Tabellen:**
| Tabelle | Kategorie | Rows | Zweck |
|---|---|---|---|
| `applications` | SoT | 47 | Bewerber-Eingang. Alle Bewerber-Daten + AI-Scores |
| `recruiter_settings` | Config | 1 | calendly_url, program_name, from_email, ai_instruction, landing_config, feature_flags |
| `project_areas` | Config | 6 | Konfigurierbare Projekt-Bereiche für Bewerber-Präferenz |
| `application_notes` | SoT | 10 | Interne Notizen pro Bewerber |
| `email_templates` | Config | 7 | application_received, task_invite (DE/EN), interview_invite (DE/EN), rejection (DE/EN) |
| `form_events` | SoT | 18 | Tracking von Form-Interaktionen (vermutlich Public Landing) |

**Edge Functions:**
| Function | Reads | Writes | External | Status |
|---|---|---|---|---|
| `analyze-applicant` | applications, recruiter_settings (via _shared/config) | applications.aiScore, applications.ai_analysis | Anthropic (claude-haiku-4-5) | deployed, ANTHROPIC_API_KEY pflicht |
| `hire-candidate` | applications | intern_accounts (CREATE), Supabase Auth (CREATE user) | Resend API für Invite-Mail | deployed, RESEND_API_KEY pflicht |
| `send-email` | email_templates | (kein DB-Write) | Resend API | deployed |

**Views:**
| View | Liest aus | Schreibt in |
|---|---|---|
| `ApplicationListView.tsx` | applications, recruiter_settings (via getApplications) | applications (delete) |
| `ApplicantDetailView.tsx` | applications, application_notes | applications, application_notes |
| `EmailTemplateManager.tsx` | email_templates | email_templates |

**Externe Dependencies:**
- Anthropic API (für analyze-applicant)
- Resend API (für send-email + Invites)
- Public Landing Page (Bewerbungsformular schreibt direkt in `applications`)

**Stage-Workflow (DB-Realität vs Code-Definition):**

| Stage | In Code definiert | In Live-DB verwendet |
|---|---|---|
| `applied` | ✅ STAGE_LABELS | ❌ keine Rows |
| `task_requested` | ✅ | ✅ aktiv |
| `task_submitted` | ✅ | ✅ aktiv |
| `interview` | ✅ STAGE_LABELS | ❌ keine Rows |
| `hired` | ✅ | ✅ aktiv |
| `onboarding` | ✅ STAGE_LABELS | ❌ keine Rows |
| `rejected` | ✅ | ✅ aktiv |

→ **Diskrepanz:** Frontend kennt 7 Stages, DB nutzt nur 4. Stages `applied`, `interview`, `onboarding` sind im Code definiert aber nirgends im echten Daten-Lifecycle.

**Phase-1-Lücken:**
- Stage-Erweiterung um `screening`, `interview_scheduled`, `interview_done`, `offer_sent`, `signed`, `ghost` (siehe Hiring SOP Drive Doc)
- 72h Auto-Reject (`supabase_72h_auto_reject.sql`) — deployed-Status ungeprüft
- LinkedIn 404 Bug bei null URL
- CV Upload + Storage fehlt

---

### Modul 2 — Intern Academy (rebuilt 2026-04-10)

**Status:** ✅ Phase 1-4 gebaut. Programm steht.

**Konzept-Quelle:** Tom Roelants hat die initiale Framework-Vision erstellt (3-Monats-Arc, 4 Phasen, 5 Levels, Buddy Programm, Monday Meetings). Luis hat eine Evaluation gegeben, operative Schicht (Rubrics, Tracks, Eskalation) wurde von Luis/Claude ergänzt.

**Tabellen (Live verifiziert 10.04.):**
| Tabelle | Kategorie | Rows | Status |
|---|---|---|---|
| `intern_accounts` (erweitert: phase, level, track, start_date, buddy_user_id, admin_notes) | SoT | 10 | ✅ Alle in Phase 1, Level 1 (Rookie), start_date 2026-04-10 |
| `intern_goals` | SoT | **0** | ⏳ Goals Wizard im Frontend, Interns füllen via Portal |
| `intern_milestones` | SoT | 10 | ✅ 1 pro Intern (Rookie-Milestone unlocked) |
| `assignment_templates` | Config | 19 | ✅ 6 Onboarding + 5 Foundation + 5 Specialisation + 3 Ownership |
| `intern_assignments` | SoT | 60 | ✅ 6 ausstehende Onboarding-Assignments × 10 Interns |
| `monday_meetings` | SoT | **0** | ⏳ erstes Meeting noch nicht angesetzt |
| `intern_meeting_attendance` | SoT | **0** | ⏳ wird befüllt nach erstem Meeting |
| `intern_weekly_reviews` | SoT | **0** | ⏳ legacy aus erster Iteration, evtl. ersetzt durch monday_meetings |
| `intern_learning_log` | SoT | **0** | ⏳ legacy aus erster Iteration |
| `intern_final_review` | SoT | **0** | ⏳ legacy aus erster Iteration |
| `intern_onboarding_checklist` | SoT | **0** | 🔴 LEGACY — durch intern_assignments ersetzt |
| `intern_token_usage` | Cache | **0** | 🔴 academy-chat noch nicht aktiv |

**Edge Functions:**
| Function | Reads | Writes | External |
|---|---|---|---|
| `academy-create-intern` | applications | intern_accounts | (kein) |
| `academy-chat` | intern_accounts, intern_token_usage | intern_token_usage | Anthropic (Phase 2) |
| `send-intern-invite` | intern_accounts | (kein DB-Write) | Resend (Domain unverified) |
| `admin-generate-magic-link` | (Admin API) | (kein) | Supabase Auth Admin |
| `admin-set-intern-password` | (Admin API) | (kein) | Supabase Auth Admin |

**Views:**
| View | Liest aus | Schreibt in |
|---|---|---|
| `components/admin/AcademyView.tsx` (rewritten) | intern_accounts, intern_goals, intern_milestones, intern_assignments | intern_accounts (advance phase), intern_assignments (review/score) |
| `components/public/InternPortalPage.tsx` (rewritten) | intern_accounts, intern_goals, intern_milestones, intern_assignments | intern_goals (wizard), intern_assignments (submit) |
| `components/admin/AddInternModal.tsx` | (kein) | intern_accounts (via academy-create-intern Edge Function) |
| ~~`components/admin/OnboardingView.tsx`~~ | n/a | n/a — **GELÖSCHT 10.04.** (war broken, durch Academy konsolidiert) |
| ~~`components/academy/InternChat.tsx`~~ | intern_accounts | intern_token_usage | bleibt — academy-chat Frontend, Phase 2 |

**Markdown Assets in `docs/intern-academy/`:**
- `README.md` — Index + Cohort-Flow
- `monday-meeting-template.md` — 3-Part Struktur, 12-Wochen Cadence
- `assessment-rubrics.md` — Month 1, Month 2, Graduation
- `specialisation-tracks.md` — 5 Tracks
- `buddy-program.md` — Cadence + Pairing-Regeln

**Branding:** „Hartlimes Intern Academy · House of Sustainable Brands"

**Phase-1-Lücken:**
- Resend Domain unverified → 9 Mass-Invites blockiert (nur Tom hat manuellen Login)
- Buddy Pairings für 9 Interns noch nicht gesetzt
- Erstes Monday Meeting noch nicht angesetzt
- Legacy-Tabellen (intern_onboarding_checklist, intern_weekly_reviews etc.) — entscheiden ob droppen oder lassen

**Tom = Programme Lead** (admin_notes: "Onboarding Lead — runs Intern Academy program. 4-weekly rotation owner. Co-creator of program framework.")

---

### Modul 3 — Finance

**Status:** 🟡 partial. Daten teilweise stale, AI inactive (Phase-1-konform).

**Tabellen:**
| Tabelle | Kategorie | Rows | Status |
|---|---|---|---|
| `finance_pipeline` | SoT | 14 | 🟡 alle 14 ueberfaellig, älteste 23.02., keine in DATEV exportiert |
| `finance_mails` | SoT | 30 | 🟡 alle category=null + ai_priority=null + status=new, neueste 26.03. (15 Tage stale) |
| `disputes` | SoT | 5 | ✅ aktiv. 1 Klarna `action_required`, Deadline 12.04. |
| `monthly_reports` | SoT | **0** | 🔴 März-Reporting nur in Excel/Drive, nicht im OS |
| `monthly_inventory` | SoT | **0** | 🔴 leer |
| `monthly_b2b_invoices` | SoT | **0** | 🔴 leer |

**Edge Functions:**
| Function | Reads | Writes | External |
|---|---|---|---|
| `sync-paypal-reports` | integration_secrets (PayPal creds) | (Response only — keine DB-Writes) | PayPal API |
| `sync-paypal-disputes` | integration_secrets, disputes | disputes (upsert via paypal_dispute_id) | PayPal API |
| `fetch-finance-mails` | (IMAP) | finance_mails (insert) | IMAP (finance@thiocyn.de) — **STILL seit 26.03.** |
| `analyze-finance-mail` | finance_mails (vermutlich) | finance_mails.category, ai_priority, ai_analysis | Anthropic | **INACTIVE** — alle 30 Mails ohne Kategorie |
| `finance-pipeline-webhook` | (External webhook) | finance_pipeline | (Webhook receiver) |

**Views:**
`FinanceView.tsx` mit **8 Tabs** (nicht 7 wie Memory sagt):
1. ActionCenterTab — Action Center (Standard-Tab)
2. FinancePipelineTab — Rechnungen pflegen
3. DisputesTab — PayPal/Klarna Disputes
4. InvoicesTab — Invoices & Mahnungen
5. OverviewTab — Overview
6. MonthlyReportingTab — Monats-Reporting
7. FinanceMailsTab — Finance Mails
8. EmmaPlannerTab — Emma Plan (vermutlich Calendar/Planning)

**Externe Dependencies:**
- PayPal API (Live, finance@thiocyn.de)
- IMAP zu `finance@thiocyn.de` (für fetch-finance-mails) — **broken seit 26.03.**
- Anthropic (für analyze-finance-mail) — **Phase 2, inactive**
- DATEV (Outbound, manuell — keine API)

**Phase-1-Lücken:**
- fetch-finance-mails funktioniert nicht mehr (IMAP-Cred? Cron?)
- daily-briefing lädt finance_pipeline nicht (siehe Modul 5)
- Banking-/Auszahlungs-Integration fehlt (per Memory `feedback_intern_no_money_access.md` ist das Absicht)
- März-Reporting ist nicht im OS migriert (lebt in Excel/Drive)
- DATEV-Integration ist Outbound-only (manueller Upload via Mail)

**Tom-Scope:** Read-only auf Finance-Tabellen. NIE Banking, Zahlungen, Mahnungs-Ausführung (per `feedback_intern_no_money_access.md`).

---

### Modul 4 — Customer Support

**Status:** 🟡 Tabellen + View existieren, aber Pre-Req nicht erfüllt.

**Tabellen:**
| Tabelle | Kategorie | Rows | Status |
|---|---|---|---|
| `support_tickets` | SoT | 7 | 🟡 Mock-Daten? 1 Prio-5 (allergische Reaktion → Luis) |

**Edge Functions:** keine deployed. Geplant: Chatarmin-Webhook → support_tickets insert.

**Views:**
- `CustomerSupportView.tsx` — Asana-style Tickets, Inline Edit, Bulk Actions

**Pre-Req für produktive Nutzung (per `feedback_cs_module_chatarmin_prereq.md`):**
1. Sameer automatisiert ChatarminCX
2. ChatarminCX wird ans Business OS angebunden
3. Erst dann ist CS-Modul produktiv

**Phase-1-Lücken:**
- Chatarmin-Webhook existiert nicht
- Tickets werden manuell oder gar nicht erfasst
- Modul ist in dieser Welle (Hiring & Onboarding) NICHT zu fixen — wartet auf Sameer

---

### Modul 5 — Tasks + Daily Briefing

**Status:** ✅ Tasks aktiv, 🟡 Briefing-Bug

**Tabellen:**
| Tabelle | Kategorie | Rows | Status |
|---|---|---|---|
| `team_tasks` | SoT | 10 | ✅ aktiv, gut verteilt (Tom 4, Luis 4, Matic 2) |
| `hiring_tasks` | SoT | 1 | minimal |
| `daily_briefings` | Cache | 5 | 🟡 alle 5 sagen „0 dringende Items" trotz 14 überfälliger Rechnungen + Klarna-Dispute |
| `notifications` | SoT | 8 | aktiv |

**Edge Functions:**
| Function | Reads | Writes | External |
|---|---|---|---|
| `daily-briefing` | finance_mails, user_mails, disputes, team_tasks | daily_briefings (upsert per user_id+date) | Anthropic (optional, fallback ohne) |
| `generate-briefing` | (vermutlich gleich) | daily_briefings | Anthropic |
| `emma-work-plan` | team_tasks, calendar | (Plan-Output) | Anthropic |

**Bug in daily-briefing (verifiziert, aber re-severity P3):**
- Function lädt **NICHT** `finance_pipeline` → 14 überfällige Rechnungen unsichtbar
- Cache greift bei `user_id+date` → kein Refresh-Mechanismus
- Summary-Logik zählt nur AI-priority='high', aber finance_mails sind alle null → Summary immer „0 high"
- Klarna Dispute mit 2-Tage-Deadline sollte via Fallback-Logik als high erscheinen → tut es nicht

**Re-Severity (Luis 10.04.):** P3 statt P0. Tool wird aktuell nicht aktiv genutzt (System läuft noch nicht produktiv). Bug ist real, aber irrelevant bis Aktivierung. Wird gefixt wenn das Briefing produktiv ausgerollt wird.

**Phase-1-Lücken (deferred to Activation Wave):**
- finance_pipeline in daily-briefing einbinden (regelbasiert, kein AI nötig)
- Cache-Bypass via Query-Param oder Refresh-Button
- Summary-Logik repariert für Phase-1-Mode (ohne AI)

---

### Modul 6 — Marketing / Content

**Status:** 🟡 partial, Foundation-Tabellen befüllt, Asset-Tracking leer

**Tabellen:**
| Tabelle | Kategorie | Rows |
|---|---|---|
| `creative_angles` | SoT | 69 ✅ |
| `content_directions` | SoT | 28 ✅ |
| `hashtag_strategies` | SoT | 5 ✅ |
| `content_posts` | SoT | 5 ✅ |
| `creative_assets` | SoT | **0** 🔴 |
| `asset_performance` | Derived | **0** 🔴 |
| `angle_insights` | Derived | **0** 🔴 |
| `content_queue` | SoT | **0** 🔴 |
| `content_outputs` | SoT | **0** 🔴 |

**Edge Functions:**
- `fetch-instagram` → schreibt vermutlich in content_posts oder brand_metrics
- `sync-ad-performance` → schreibt ad_campaigns / ads_metrics

**Views:**
- MarketingView, ContentMachineView, CreativeFactoryView, BriefingGeneratorView, PostsTrackerView

**Phase-1-Lücken:**
- Creative Asset Pipeline nicht in Verwendung
- Performance-Tracking-Tabellen leer
- (Out-of-Scope für Hiring & Onboarding Welle 1)

---

### Modul 7 — Creator Program

**Status:** 🔴 ALLE 9 Tabellen LEER. Modul gebaut, nie befüllt.

**Tabellen:** alle 9 mit 0 Rows: creators, creator_brands, creator_tasks, creator_performance, creator_commissions, creator_payouts, creator_prospects, creator_gifts, usage_rights_consent

**Edge Functions:**
- `distribute-creator-tasks`
- `snapshot-creator-performance`
- `import-creators-csv` (im Repo, nicht in Live-Functions-Liste — vermutlich nie deployed)

**Views:** CreatorView mit 8 Tabs (Prospects, Pipeline, Commissions, Tasks, Gifting, Performance, Operators, Pulse)

**Phase-1-Lücken:**
- Komplettes Modul ist Schein-Architektur — UI + DB + Functions, aber Daten-Eingang fehlt
- Mainak hat „Creator Program" als Brief-Aufgabe (per `intern-brief-mainak.md`), aber tut es in Asana, nicht im OS
- Paigh Sample-Versand (per Luis-Hinweis 10.04.) wäre logischer Daten-Eingang → siehe Charter Doc

---

### Modul 8 — eCommerce

**Status:** 🟡 partial

**Tabellen:**
| Tabelle | Kategorie | Rows |
|---|---|---|
| `ecom_orders` | Cache | 10 |
| `ad_campaigns` | Cache | 9 |
| `ads_metrics` | Cache | **0** |
| `product_performance` | Derived | **0** |
| `shopify_sync_log` | Cache | **0** 🔴 (nie gelaufen) |

**Edge Functions:**
- `sync-shopify-sales` → ecom_orders, shopify_sync_log
- `sync-ad-performance` → ad_campaigns, ads_metrics

**Externe Dependencies:**
- Shopify API (alle 6 Brands — nur TAS verbunden per Memory)
- Meta Ads API (OAuth fehlt — Valentin)
- Google Ads API (geplant)

**Phase-1-Lücken (für Hiring-Welle out-of-scope):**
- Shopify-Sync für 5 weitere Brands
- Meta Ads OAuth (Valentin)
- ads_metrics + product_performance werden nicht populated

---

### Modul 9 — Brand Management

**Status:** ✅ live mit kleiner Diskrepanz

**Tabellen:**
| Tabelle | Kategorie | Rows |
|---|---|---|
| `brands` | Config | **7** (1 mehr als die 6 Brands aus Memory) |
| `brand_configs` | Config | 6 |
| `brand_metrics` | Cache/Derived | 6 |

**Diskrepanz:** Memory listet 6 Brands (Thiocyn, Dr. Severin, TAS, Paigh, Wristr, T&J). DB hat 7. Vermutlich „cross-brand" oder „hart-limes" als 7. Eintrag — nicht verifiziert.

**Phase-1-Lücken:**
- `brand_metrics` ist Cache aber Refresh-Trigger unklar
- Diskrepanz brands (7) vs brand_configs/brand_metrics (6) — eine Brand hat keine Config + keine Metrics

---

### Modul 10 — ISO Compliance

**Status:** ✅ live, alle Tabellen befüllt

**Tabellen:**
| Tabelle | Rows |
|---|---|
| `risk_register` | 7 |
| `security_incidents` | 5 |
| `business_risks` | 6 |
| `non_conformances` | 5 |

**Edge Functions:** keine
**Views:** ISOComplianceView mit 4 Tabs

**Phase-1-Lücken:** keine bekannt für Hiring-Welle (out-of-scope)

---

### Modul 11 — System / Meta

**Status:** 🟡 team_members nahezu leer, Auth-Risiko siehe Audit

**Tabellen:**
| Tabelle | Kategorie | Rows | Status |
|---|---|---|---|
| `team_members` | SoT | **2** | 🔴 Luis (`luis@mail.hartlimesgmbh.de` — falsche Email) + Sameer (`deactivated`). Tom NICHT drin trotz Login |
| `profiles` | SoT | 2 | minimal |
| `integration_secrets` | SoT (encrypted) | 2 | ✅ PayPal credentials, service_role-only |
| `sync_log` | Cache | 5 | aktiv |
| `access_requests` | SoT | 3 | aktiv |
| `user_workspace_config` | Config | 1 | minimal |
| `user_mails` | Cache | 0 | 🔴 leer |
| `user_mail_accounts` | Config | 1 | minimal |

**Edge Functions:**
| Function | Reads | Writes | External |
|---|---|---|---|
| `jarvis-chat` | brand_metrics, finance_pipeline, etc. (Live-DB-Kontext) | (Response only) | Anthropic |
| `manage-secrets` | integration_secrets | integration_secrets | (kein) |
| `fetch-user-mails` | user_mail_accounts | user_mails | IMAP |

**Auth-Diskrepanz:**
- Owner-Email in team_members: `luis@mail.hartlimesgmbh.de`
- Luis' echte Login-Email: `jll@hartlimesgmbh.de`
- → Owner-Status hängt aktuell am Hardcoded-Admin-Check in `Dashboard.tsx:261`, nicht an team_members
- → Wenn RLS später anhand team_members enforced wird, fliegt Luis raus

---

### Modul 12 — Lead Capture

**Status:** 🟡 partial

**Tabellen:**
- `roi_leads` (0) — leer
- `thiocyn_quiz_leads` (1) — minimal aktiv
- `form_events` (18) — Tracking aktiv

**Edge Functions:** keine direkt — externe Landing Pages schreiben rein

**Phase-1-Lücken:** out-of-scope für Hiring-Welle

---

### Modul 13 — Video Generation

**Status:** 🔴 leer

**Tabellen:** `video_jobs` (0)
**Views:** VideoGenerationView
**External:** Higgsfield (via MCP, außerhalb des OS-Repos)

**Phase-1-Lücken:** out-of-scope

---

### Modul 14 — Knowledge Base

**Status:** 🔴 **BROKEN VIEW**

**Verifikation:**
- `KnowledgeBaseView.tsx` liest aus `knowledge_entries` (Code Z. 56-62)
- `knowledge_entries` Tabelle existiert NICHT in der DB (Live-Check)
- Tabelle `dashboard_resources` existiert auch nicht
- → View ist tot, lädt nichts

**Decision (per Luis 10.04.):** Out-of-scope für Welle 1. Bei nächster Welle: entweder Tabelle anlegen + befüllen, oder View löschen. Aktuell unschädlich (kein Daten-Schaden, nur ein leeres UI).

---

## 4. Cross-Cutting Concerns

### 4.1 Auth & RLS

- **Auth Provider:** Supabase Auth (Email + Password). `AdminLogin.tsx` ist single entry point
- **RLS auf allen Tabellen:** ✅ aktiviert (per `list_tables` verifiziert)
- **RLS Policy-Pattern (Stichprobe `disputes`):** `auth.role() = 'authenticated'` für SELECT + INSERT/UPDATE/DELETE → JEDER eingeloggte User darf alles. **Kein Section/Module-Gating auf DB-Ebene.**
- **UI-Gating:** existiert in `Dashboard.tsx` via `userRole` State + Section-Mapping. Pure Frontend-Check, bypassbar via direktem Supabase-Client.
- **team_members allowed_sections:** Schema existiert mit Spalten `role`, `allowed_sections[]`, aber wird aktuell von keinem RLS-Policy verwendet
- **Risiko-Bewertung:** P2 (Backlog) — solange Tom der einzige Nicht-Owner ist, ist das theoretisch. Wird P0 sobald 2. Nicht-Owner-User dazukommt. Per `feedback_severity_must_match_threat_model.md`.

### 4.2 Edge Function Patterns

| Pattern | Verwendet in | Beobachtung |
|---|---|---|
| `verify_jwt: true` (User-Auth required) | analyze-applicant, hire-candidate, send-intern-invite, academy-create-intern, academy-chat, jarvis-chat, sync-ad-performance, sync-shopify-sales, manage-secrets, distribute-creator-tasks, snapshot-creator-performance, fetch-instagram, generate-briefing | Standard für UI-getriggerte Functions |
| `verify_jwt: false` (Service/Webhook) | sync-paypal-reports, sync-paypal-disputes, finance-pipeline-webhook, daily-briefing, fetch-finance-mails, fetch-user-mails, emma-work-plan, analyze-finance-mail, send-email | Für Cron/Webhook/Public Endpoints |
| `_shared/config.ts` als Konfig-Layer | analyze-applicant, vermutlich weitere | Liest aus `recruiter_settings` |
| ANTHROPIC_API_KEY als Pflicht-Env | analyze-applicant, jarvis-chat, generate-briefing, daily-briefing (optional), academy-chat, analyze-finance-mail, emma-work-plan | **Zentrale Phase-1/2-Bruchlinie** |

### 4.3 Externe Service Inventory

| Service | Verwendet von | Status | Memory-Ref |
|---|---|---|---|
| **Anthropic API** | analyze-applicant, jarvis-chat, generate-briefing, daily-briefing, academy-chat, analyze-finance-mail, emma-work-plan, hire-candidate-mail (vermutlich) | **Personal Tokens (Luis)** — Phase 1 inactive | `feedback_business_os_phasing.md` |
| **Resend API** | send-email, send-intern-invite, hire-candidate (Invite-Mail) | Domain unverified → manueller Workaround | non-blocking per Luis |
| **PayPal API** | sync-paypal-reports, sync-paypal-disputes | ✅ Live (finance@thiocyn.de) | März-Reporting verifiziert |
| **Shopify API** | sync-shopify-sales | nur TAS verbunden, 5 weitere offen | Open Task |
| **Instagram Graph** | fetch-instagram | ✅ alle 6 Brands live | Memory |
| **Meta Ads API** | sync-ad-performance | OAuth fehlt (Valentin) | Open Task |
| **IMAP (`finance@thiocyn.de`)** | fetch-finance-mails | 🔴 still seit 26.03. | Audit-Befund |
| **IMAP (`jll@hartlimesgmbh.de`)** | fetch-user-mails | App-Passwort steht seit 25.03., Status laufend? | unklar |
| **Higgsfield** | (außerhalb Business OS Repo, via MCP) | Team Plan 7.500 cr | Memory |
| **Notion** | (außerhalb Business OS — manuelle Doku) | Mainak Hiring-Board | Drive |
| **Calendly** | (recruiter_settings.calendly_url) | aktiv | Hiring SOP |
| **DATEV** | (Outbound, manueller Upload via Mail) | aktiv | Buchhaltung Anleitung |
| **GMI (GetMyInvoices)** | (extern, GMI ↔ DATEV-Bridge) | aktiv | Vanessa-Prozess |

### 4.4 Frontend-Architektur

- **Framework:** Vite + React + TypeScript (siehe `vite.config.ts`, `tsconfig.json`)
- **Routing:** React Router (`useNavigate` in AdminLogin)
- **State:** Lokal in Components + Supabase Realtime (vermutlich) + `lib/useSupabaseQuery.ts` als generischer Fetch-Hook
- **UI-Framework:** Tailwind CSS
- **Pattern:** `components/admin/` enthält 60+ Views als Top-Level Files + `finance/`, `analytics/`, `creator/` als Sub-Ordner für tab-spezifische Komponenten
- **Foundation Layer (per `project_business_os_state.md`):** `lib/useSupabaseQuery.ts`, `lib/usePagination.ts`, `components/ui/DataStates.tsx`, `components/ui/ErrorBoundary.tsx`

---

## 5. Daten-Flow Beispiele

### 5.1 Hiring-Flow (Bewerber → Hire)

```
Public Landing Page (extern)
  ↓ POST applications
applications (SoT, stage='applied' geplant — derzeit task_requested)
  ↓ Trigger: analyze-applicant Edge Function (manuell/UI?)
applications.aiScore + ai_analysis (UPDATE)
  ↓ Recruiter UI (ApplicationListView → ApplicantDetailView)
applications.stage = task_requested → task_submitted
  ↓ Recruiter Decision (UI Click)
applications.stage = hired
  ↓ hire-candidate Edge Function
Supabase Auth User (CREATE) + intern_accounts (CREATE)
  ↓ Resend API
Invite-Mail an Bewerber-Email
```

**Bruchstellen:**
- Stage `applied` und `interview` nicht in Live-Daten
- analyze-applicant Trigger unklar — automatisch on insert oder manuell?
- Resend Domain unverified → Invite-Mail manuell

### 5.2 Finance-Mail Triage (theoretisch)

```
finance@thiocyn.de Inbox
  ↓ fetch-finance-mails Edge Function (Cron, vermutlich täglich)
finance_mails (SoT, status='new')
  ↓ analyze-finance-mail Edge Function (Trigger ???)
finance_mails.category, ai_priority, ai_action (UPDATE)
  ↓ daily-briefing Edge Function (täglich)
daily_briefings (Cache, mit AI-Summary)
  ↓ User UI (FinanceView → FinanceMailsTab)
Triage-Entscheidung
```

**Realität:**
- fetch-finance-mails: still seit 26.03. (15 Tage)
- analyze-finance-mail: alle 30 Mails category=null → Function läuft nicht / nicht getriggert
- daily-briefing: lädt finance_pipeline gar nicht → 14 überfällige Rechnungen unsichtbar
- → Pipeline ist effektiv tot

### 5.3 PayPal Dispute Sync (funktioniert ✅)

```
PayPal Dispute API
  ↓ sync-paypal-disputes Edge Function (manuell oder Cron)
disputes (SoT, upsert via paypal_dispute_id)
  ↓ User UI (FinanceView → DisputesTab)
Status: open / under_review / action_required / resolved
```

**Status:** Funktioniert. 5 Disputes live, davon 1 Klarna mit 2-Tage-Deadline.

---

## 6. Q3-Entscheidung — `os_metrics` vs Dashboard-KPIs

**Frage von Luis:** „os_metrics muss sich auf Dashboard KPIs beziehen, dann kombinieren. Ansonsten eigenständig. Hängt vom Inhalt."

**Verifikation:**

Existierende Dashboard-KPIs (Modul 9 + Modul 8):
- `brand_metrics` (6 rows) — vermutlich Revenue/Conversions pro Brand
- `ad_campaigns` (9 rows) — Meta/Google Ads Performance
- `ads_metrics` (0 rows) — geplant: pro-Tag Metriken
- `product_performance` (0 rows) — geplant: pro-Produkt
- `BrandKPIsTab.tsx` View — visualisiert brand_metrics
- `HomeView.tsx` (Command Center) — KPI-Boxen für Brand-Performance

**Inhalt:** Diese KPIs sind **Business-Performance** (Brand-Revenue, ROAS, Ad-Spend, Conversions).

**Was `os_metrics` enthalten würde** (per `feedback_two_level_metrics.md`):
- Operational pro Feature: Klicks, Aufrufe, Durchlaufzeit
- Outcome pro Rolle: Luis-Stunden gespart/Woche, Tom-Bewerber-Throughput, Vanessa-Mahnungs-Closure-Rate, Time-to-Hire

**Inhalt:** **OS-Health / Operator-Outcomes** — fundamental anders als Business-Performance.

**Entscheidung:** **Separate Tabelle** `os_metrics`. Inhalt überlappt nicht mit Dashboard-KPIs.

**ABER:** Dashboard sollte beide Layer surfaceen:
- `BrandKPIsTab.tsx` zeigt weiterhin Business-KPIs aus brand_metrics
- Neue View `OSHealthTab.tsx` (oder eingebettet in HomeView) zeigt OS-Health aus os_metrics
- Beide nebeneinander im Command Center

**Detail-Schema-Vorschlag** (für Doc D — Measurement):
```sql
CREATE TABLE os_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_layer TEXT NOT NULL CHECK (metric_layer IN ('operational', 'outcome')),
  metric_name TEXT NOT NULL,
  module TEXT NOT NULL,
  role TEXT,                    -- nullable für Operational, required für Outcome
  value NUMERIC NOT NULL,
  unit TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  item_ref TEXT,                -- referenziert Welle/Item das gemessen wird
  notes TEXT
);
```

→ Kommt in Doc D, hier nur als Vorab-Entscheidung dokumentiert.

---

## 7. Phase-1-Lücken Übersicht (für Hiring-Feinschleifen-Welle)

| # | Lücke | Modul | Schweregrad |
|---|---|---|---|
| 1 | Stage-Cleanup (applied/interview/onboarding nicht gesetzt) | Hiring | 🟡 P1 |
| 2 | 72h Auto-Reject Verifikation | Hiring | 🟡 P1 |
| 3 | LinkedIn 404 Bug | Hiring | 🟢 P3 (Quick Fix) |
| 4 | Logo Display Bug (TAS) | Hiring (Public Landing) | 🟢 P3 (Quick Fix) |
| 5 | Send-Button + Email-Template Wiring | Hiring | 🟡 P1 |
| 6 | Insights View (Funnel + Conversion) | Hiring | 🟡 P1 |
| 7 | CV Upload + Storage | Hiring | 🟡 P2 |
| 8 | Eval Dashboard | Hiring | 🟡 P2 |
| 9 | Academy Aktivierung (Tom-Walkthrough + Default-Checklist seed) | Academy | 🟡 P1 |
| 10 | Public Landing Audit | Hiring | 🟢 P3 |
| 11 | Notion → Business OS Migration Plan | Hiring (Strategie) | 🟡 P2 |
| 12 | analyze-applicant Activation Trigger | Hiring (AI Phase 2) | ⚪ deferred |
| 13 | Paigh Sample-Tracking Konzept | Creator (NEU) | 🟡 P2 |
| 14 | ~~daily-briefing finance_pipeline laden~~ | Tasks | ⚪ deferred (Tool noch nicht aktiv) |
| 15 | fetch-finance-mails Diagnose | Finance | ⚪ deferred (Tool noch nicht aktiv) |
| 16 | Tom + Team in team_members anlegen | System | 🟡 P1 |
| 17 | Notion-Check für existierende Onboarding-Strukturen | Academy (vor Welle 1) | 🟡 P1 |

→ Wird in Doc A (Charter) finalisiert. Hier nur sichtbar gemacht.

---

## 8. Offene Fragen für Luis — RESOLVED 2026-04-10

Alle 7 ursprünglichen Fragen sind durch Luis beantwortet + verifiziert. Antworten als Reference.

### Q1: Brand-Diskrepanz — RESOLVED ✅

**Verifikation:** Live `SELECT slug, name FROM brands ORDER BY created_at`:
1. thiocyn (Thiocyn)
2. take-a-shot (Take A Shot)
3. dr-severin (Dr. Severin)
4. paigh (Paigh)
5. wristr (Wristr)
6. timber-john (Timber & John)
7. **cross-brand (Cross-Brand)** ← der 7. Eintrag

**Luis-Antwort:** Offen/modular lassen, als Aggregator kaufen wir auch weitere Brands in Zukunft dazu.

**Decision:** `brands` Tabelle bleibt **modular und erweiterbar**. `cross-brand` ist gewollt als Pseudo-Brand für brand-übergreifende Daten (Ads, Tasks, Posts ohne single-brand-Zuordnung). Future-Brands werden einfach via INSERT hinzugefügt — keine Schema-Änderung nötig. **brand_configs (6 rows) muss NICHT auf 7 erweitert werden** — `cross-brand` braucht keine Config.

### Q2: Knowledge Base — RESOLVED ✅

**Verifikation:** Live SQL:
- `dashboard_resources` existiert NICHT
- Aber: `KnowledgeBaseView.tsx` liest aus `knowledge_entries` (Code Z. 56-62), nicht aus `dashboard_resources`
- `knowledge_entries` existiert NICHT in der DB (Live-Check)
- → **`KnowledgeBaseView.tsx` ist eine tote View** — sie referenziert eine Tabelle, die nie erstellt wurde

**Luis-Antwort:** „Find's raus, oder mach neu wenn weg."

**Decision:** `knowledge_entries` Tabelle wird in Welle 1 NICHT erstellt (out-of-scope, kein Hiring-Item). Aber: Modul 14 ist **als „🔴 broken view"** markiert, nicht als „⚪ unklar". Bei nächstem Welle-Block (nach Hiring) entscheiden: neu bauen oder View löschen. Bis dahin keine Aktion, View bleibt tot.

### Q3: Stage-Workflow — RESOLVED ✅

**Verifikation:** Code-Trace + DB:
- `V2_MIGRATION.sql` Z. 15: COMMENT sagt expected values = `applied`, `task_requested`, `task_submitted`, `rejected` (4 Stages — V2 minimal)
- `ApplicationListView.tsx` Z. 16-24: STAGE_LABELS für 7 (applied, task_requested, task_submitted, interview, hired, onboarding, rejected)
- `send-email/index.ts` Z. 68-71: setzt Stages bei Email-Versand: `task_invite → task_requested`, `interview_invite → interview`, `rejection → rejected`, `hire-candidate` setzt `hired`
- Live DB: nur 4 Stages in Verwendung (`task_requested`, `task_submitted`, `hired`, `rejected`)

**Luis-Antwort:** „Prüfen."

**Decision:** **Es ist Drift, kein lean by design.** Stages sind im Code teilweise definiert, im Email-Flow teilweise gesetzt, aber `applied`, `interview`, `onboarding` werden nirgends als End-Status erreicht weil:
- `applied` ist Default beim Insert (V2_MIGRATION Z. 10), aber Bewerber landen sofort in `task_requested` wenn Recruiter Task verschickt → keine bleibenden `applied` Rows
- `interview` wird vom send-email Flow gesetzt, aber kein Bewerber ist gerade in dem State (alle entweder weiter oder rejected)
- `onboarding` wird in OnboardingView referenziert (`stage in 'hired'/'onboarding'`) aber nirgends gesetzt → toter Filter

**→ Welle 1 Item:** Stage-Cleanup. Entweder die fehlenden Stages aktiv nutzen (mehr Workflow-Stufen) ODER aus Code entfernen. Hängt mit Hiring-SOP-Items #9 (Stage-Erweiterung) zusammen.

### Q4: Academy Tracking-Tabellen — RESOLVED ✅

**Verifikation:** `supabase_academy_v2.sql` gelesen. Die 4 Tabellen sind:
- **`intern_weekly_reviews`** — Pro Intern + Woche: highlight, challenge, learning, next_goal, mood_score (1-5), admin_feedback. Entspricht dem Weekly-Review-Template aus `data/docs/interns-management/monthly-review-template.md`.
- **`intern_learning_log`** — Pro Intern: type ('task'|'learning'|'resource'|'achievement'), title, body, completed boolean. Tracking von Lern-/Task-Aktivitäten.
- **`intern_final_review`** — End-of-Internship: overall_rating, key_contributions, growth_areas, recommend_for_hire, admin_notes, ai_summary, certificate_issued_at.
- **`intern_onboarding_checklist`** — Pro Intern: items JSONB (key/value Checkboxen). Wird im UI von `OnboardingView.tsx` als Checkliste mit DEFAULT_CHECKLIST (contract, email, tools, intro, first_task, day1, week1) gerendert.

**Luis-Antwort:** „Was ist denn das konkret? Ich denke es ist einfach noch nicht ausgereift, aber du kannst auch Notion prüfen, obs da schon was gibt."

**Status Notion-Check:** Notion MCP ist verfügbar, aber Luis hat noch nicht gesagt welche Pages konkret zu prüfen sind. **Action für Doc A (Charter):** Ich kann via `mcp__notion-personal__API-post-search` nach „Onboarding", „Intern", „Mainak", „Tom" suchen — wird unten als kleine Sub-Task vermerkt.

**Decision:** **Die Tabellen sind nicht ausgereift, aber strukturell richtig gebaut**. Sie matchen 1:1 die Memory-Konzepte (Weekly Reviews, Learning Log, Onboarding Checklist). Lücke ist nicht Architektur, sondern **fehlende Aktivierung**: Niemand benutzt sie, weil:
1. Tom (Onboarding Lead) hat das System wahrscheinlich noch nicht gezeigt bekommen
2. Real-Prozess läuft mündlich/Slack/Notion (zu verifizieren)
3. Phase-1-Default war „Tabelle vorbauen, später aktivieren"

**Welle 1 Item:** Academy-Aktivierung — Tom 30-min-Walkthrough, Default-Checkliste seeden, ersten Eintrag mit Mainak machen. **NICHT** Code ändern, **NICHT** Schema migrieren. Pure Aktivierung.

**Sub-Action vor Doc A:** Ich prüfe Notion via MCP nach existierenden Onboarding-/Intern-Pages, dann weiß ich ob es Konkurrenz-Strukturen gibt die migriert werden müssten.

### Q5: daily-briefing aktiv genutzt? — RESOLVED ✅

**Luis-Antwort:** „Aktuell nicht, da das Tool ja noch nicht aktiv läuft."

**Decision:** **daily-briefing ist nicht zu fixen in Welle 1.** Der Bug (`finance_pipeline` nicht geladen) ist **kein P0 mehr** — er war nur P0, weil ich angenommen hatte das Briefing wird gelesen. Da niemand es liest, ist der Bug irrelevant bis Aktivierung. **Re-Severity: P3 (Backlog).** Wird gefixt wenn das Tool aktiv ausgerollt wird.

**Konsequenz:** Die 14 überfälligen Rechnungen + Klarna-Dispute sind weiterhin echt — aber sie sind auch **außerhalb des OS** sichtbar (Caya, GMI, PayPal direkt). Du arbeitest Finance noch außerhalb. **Klarna Dispute KL-2026-04-001 mit Deadline 12.04. bleibt P0** — aber als Action-Item für DICH (außerhalb des OS), nicht als Bug-Fix für daily-briefing.

### Q6: eCommerce-Sync Prio — RESOLVED ✅

**Luis-Antwort:** „Nach Finance → ist entweder Teil von eCom Daten (wie Shopify etc.) oder Marketing."

**Decision:** **Modul 8 (eCommerce) bleibt out-of-scope für Welle 1.** Wird in einer **späteren Welle** behandelt, NACH Finance-Modul-Integration. Bei der Verarbeitung wird entschieden, ob es:
- als eigenständiges eCom-Modul bleibt (Shopify-Sync, Order-Tracking)
- ODER unter Marketing zusammengeführt wird (weil Ad-Performance + Order-Daten = Performance-Marketing)

Diese Entscheidung wird in Doc A (Charter) als Layer-2-Leitlinie für Module-Konsolidierung dokumentiert.

### Q7: Owner-Email Mismatch — RESOLVED ✅

**Luis-Antwort:** „Beide Mails gehören mir."

**Decision:** **Kein Bug.** Sowohl `luis@mail.hartlimesgmbh.de` als auch `jll@hartlimesgmbh.de` sind aktive Luis-Adressen.

**Welle 1 Item (Modul 11):** team_members Tabelle braucht trotzdem Cleanup:
- Beide Emails als Owner-Einträge anlegen, ODER
- Die primäre (`jll@`) als Owner anlegen, `luis@mail.` als Alias deklarieren
- → Wird in Doc E (Ownership) festgelegt
- Tom + andere Team-Mitglieder werden in derselben Migration eingetragen

---

## 9. Entscheidung (per Luis-Regel: Doc endet in Entscheidung)

**Was dieser Doc festlegt:**

1. **Modul-Taxonomie:** 14 Module (1-14 oben). Ab jetzt sind das die Bezugs-Einheiten für Ownership, Charter, AI Strategy, Measurement.

2. **Source-of-Truth Taxonomie:** Jede Tabelle ist in genau einer Kategorie (SoT / Derived / Cache / Linking / Empty / Config). Doppel-Writes verboten. Verstöße = P0.

3. **`os_metrics` ist eigenständige Tabelle**, NICHT mit `brand_metrics` o. ä. kombiniert. Inhalt überlappt nicht. Dashboard surfaceed beide Layer separat.

4. **Phase-1-Bruchlinie:** Alle Edge Functions die `ANTHROPIC_API_KEY` benötigen sind **deployment-ready, aktivierungs-pausiert**. Kein Live-Aufruf bis Firmen-API.

5. **Welche Module sind in Welle 1 (Hiring & Onboarding):**
   - **In-Scope:** Modul 1 (Hiring), Modul 2 (Academy), partial Modul 11 (System für team_members-Aufbau)
   - **Out-of-Scope für Welle 1:** Module 3 (Finance), 4 (CS), 5 (Tasks/Briefing), 6 (Marketing), 7 (Creator), 8 (eCom), 10 (ISO), 12 (Lead), 13 (Video), 14 (KB)
   - **Korrektur 10.04.:** Modul 3 (Finance) und Modul 5 (Tasks/Briefing) sind nicht mehr „adjacent" — beide werden NICHT in Welle 1 angefasst, da Tool noch nicht produktiv läuft (Luis-Antwort Q5)

6. **Q1-Q7 sind RESOLVED** (siehe §8 für Details + Verifikationen). Doc B kann jetzt von Doc E + Doc A als verlässliche Reference verwendet werden.

---

**Nächster Schritt:** Doc E (Ownership) — basiert auf der Modul-Taxonomie aus diesem Doc.

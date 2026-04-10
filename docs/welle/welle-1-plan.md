# Welle 1 Plan — Hiring & Onboarding Feinschleifen

**Erstellt:** 2026-04-10
**Status:** Bereit für Start
**Owner:** Luis (alle Items)
**Geschätzte Dauer:** 2-3 Wochen (NICHT 1 Woche, per Reviewer-Audit)

---

## 0. Welle-1-Frame

**Ziel:** Hiring + Intern Academy Module von „funktional aber rough" zu „solide für Mainak/Tom-Tagesnutzung" bringen. Foundation für Tracking + Reviews etablieren.

**Gesplittet in 2 Sub-Wellen** (per Reviewer-Audit):
- **Welle 1a — Foundation + Bug-Fixes** (5-7 Tage): non-user-facing, Luis testet selbst, schnelle Reviews
- **Welle 1b — User-Features** (1-2 Wochen Build + 1 Woche Real-Usage-Wartezeit): Mainak + Tom als echte User, Wave Review am Ende

**Cost-Constraint:** AI in Welle 1 erlaubt für `analyze-applicant` + `jarvis-chat` manuell. Worst-Case Cost ~$0.30 (Noise).

**Out-of-Scope:** alles was in Doc A §2.2 + 2.3 als out-of-scope deklariert ist.

---

## Welle 1a — Foundation + Bug-Fixes

**Item-Class:** Foundation/Bug → 48-72h Review pro Item

| # | Item | Owner | Effort | Done-Criteria | Item-Class |
|---|---|---|---|---|---|
| **0** | git init Repo + .gitignore | Luis | 15 min | Git-versioniert, .env in gitignore, Initial Commit | Foundation |
| **D1** | os_metrics Tabelle anlegen (Schema aus Doc D §2) | Luis | 30 min | Migration apply, Tabelle existiert, RLS Pol Test | Foundation |
| **D2** | `lib/track-event.ts` Helper bauen | Luis | 30 min | trackOperationalMetric() funktioniert, 1 Test-Insert | Foundation |
| **D3** | Outcome-Baselines manuell setzen für Luis/Tom/Mainak | Luis | 15 min | 6 Baseline-Rows in os_metrics (siehe §1) | Foundation |
| **D4** | Cron Edge Function `os-metrics-stale-review-check` | Luis | 60 min | Cron läuft täglich, schreibt Notifications bei stale items, optional Telegram-Push | Foundation |
| **14** | team_members Cleanup SQL (8 Einträge) | Luis | 30 min | 8 Rows, Tom + alle Stakeholder drin, keine Duplikate | Foundation |
| **1** | Stage-Cleanup (applied/interview/onboarding nicht gesetzt) | Luis | 2-3h | Funnel-Stages konsistent, alle 47 Bewerber sinnvoll zugeordnet | Foundation |
| **2** | 72h Auto-Reject Verifikation | Luis | 30 min | pg_cron status verifiziert, 1 Test-Run dokumentiert | Foundation |
| **3** | LinkedIn 404 Bug fix | Luis | 30 min | Null-Check für linkedin_url, Smoke-Test | Foundation |
| **4** | TAS Logo Display Bug fix | Luis | 30 min | Logo rendert auf weißem BG | Foundation |
| **15** | Notion-Check für Onboarding-Strukturen (Read-only) | Luis | 30 min | Doku in `data/docs/notion-onboarding-findings.md`, Entscheidung „migrieren oder nicht" | Foundation |

**Welle 1a Total:** ~6.5 Stunden Build + ~3 Stunden Reviews = 1 Tag intensiv oder 2-3 Halb-Tage

**Welle 1a Reviews:** Pro Item 48-72h nach Deploy, 15-30 min. Kann am Folgetag im Block gemacht werden.

---

## Welle 1b — User-Features

**Item-Class:** Weekly-Use → KEIN Item Review, Wave Review am Welle-Ende

| # | Item | Owner | Effort | Done-Criteria | Item-Class |
|---|---|---|---|---|---|
| **5** | Send-Button + Email-Template Wiring (`send-email` refactor) | Luis Code, Mainak Test | 4h | One-Click Email-Versand für 3 Templates, Stage-Update auto, Mainak hat es 5x benutzt | Weekly |
| **6** | Hiring Insights View (Funnel + Conversion regelbasiert) | Luis | 4h | Neue View `HiringInsightsView.tsx`, zeigt Stage-Funnel, Conversion-Rates, Median-Times | Weekly |
| **7** | CV Upload + Storage (Bucket + RLS + Frontend) | Luis Code, Mainak Test | 6h | Storage Bucket existiert, Upload aus ApplicationForm, Anzeige in ApplicantDetailView, RLS für sicheren Access | Weekly |
| **8** | Eval Dashboard (alle Submissions in 1 View für Interview-Prep) | Luis Code, Mainak Test | 4h | Neue View, listet aiScore, work_sample, Notes, Calendly-Status | Weekly |
| **9** | Intern Academy Welle-1-Aktivierung — Resend Domain Fix + Buddy Pairings + erstes Monday Meeting | Luis + Tom | 3h | 9 Mass-Invites versandt, Buddy Pairings gesetzt in `intern_accounts.buddy_user_id`, erstes Monday Meeting in `monday_meetings` | Weekly |
| **10** | Public Landing Audit (Form-Conversion-Baseline) | Luis | 1h | Doc mit Conversion-Rate-Baseline, Issues-Liste | Weekly |
| **12** | analyze-applicant Phase-2-Vorbereitung — `analyze_applicant_verdict_match` Tabelle anlegen + Frontend-Hook für Verdict-Tracking | Luis | 2h | Tabelle existiert, Tracking läuft (Mainak markiert AI vs eigene Decision) | Weekly |

**Welle 1b Total:** ~24 Stunden Build = 3-4 Tage intensiv

**Welle 1b Wave Review:** Nach Build-Ende + 7 Tage Real-Usage durch Mainak/Tom = ~2 Wochen Total bis zum Review.

---

## Welle 1c — Strategie / Doku (kann parallel zu 1b)

**Item-Class:** Foundation (Doc-Items)

| # | Item | Owner | Effort | Done-Criteria |
|---|---|---|---|---|
| **11** | Notion → Business OS Migration Plan (Doc) | Luis | 1h | Doc in `docs/welle/welle-1-notion-migration-plan.md` |
| **13** | Paigh Sample-Tracking Konzept (Doc + Schema-Vorschlag) | Luis | 1h | Doc in `docs/welle/welle-1-paigh-sample-tracking.md` |

**Welle 1c Total:** ~2 Stunden, kann parallel passieren.

---

## Welle 1 Total

| Sub-Welle | Build-Effort | Real-Usage-Wartezeit | Review |
|---|---|---|---|
| 1a Foundation + Bugs | ~6.5h | sofort | ~3h pro Item nach 48-72h |
| 1b User-Features | ~24h | 1 Woche | 60 min Wave Review |
| 1c Strategie / Doku | ~2h | n/a | im Wave Review mit |

**Realistische Welle-1-Dauer:** 2-3 Wochen kalendarisch, ~5-7 Tage effektive Arbeit.

---

## 1. KPIs für Welle 1

### Outcome-KPIs (manuell, in os_metrics als Baseline)

**Diese werden in Item D3 als initial Rows eingefügt:**

| Rolle | Metric | Baseline (vor Welle 1) | Target (nach Welle 1) | Source |
|---|---|---|---|---|
| Luis | `luis_hours_per_week_on_hiring_admin` | ~3 (Schätzung) | <1 | manual |
| Luis | `luis_hours_per_week_on_intern_onboarding` | ~2 (Schätzung) | <1 | manual |
| Tom | `tom_onboarding_actions_per_week` | 0 (Tabellen leer) | ≥5 | auto via intern_assignments |
| Tom | `tom_login_frequency_per_week` | 1 (Login seit 09.04.) | ≥5 | auto via auth.users |
| Mainak | `mainak_hiring_screenings_per_week` | unbekannt | ≥5 | auto via team_tasks oder application_notes |
| OS | `applications_processed_per_week_total` | ~10 (Schätzung) | Trend tracken | auto via applications |

### Operational-KPIs (auto via track-event Helper)

**Diese werden ab Item D2 automatisch erfasst:**

- `application_list_view_opened` (count, hiring module)
- `applicant_detail_view_opened` (count, hiring)
- `send_email_button_clicked` (count, hiring) — pro Template-Slug
- `hiring_insights_view_opened` (count, hiring)
- `cv_upload_attempted` / `cv_upload_succeeded` (count, hiring)
- `eval_dashboard_opened` (count, hiring)
- `academy_view_opened` (count, academy)
- `intern_assignment_reviewed` (count, academy) — wenn Tom Approve/Reject klickt
- `monday_meeting_created` (count, academy)

---

## 2. Dependencies

```
Item 0 (git init)
  ↓
Item D1 (os_metrics) ─┐
Item D2 (track-event) ─┤
Item D3 (baselines) ───┤
Item D4 (cron reminder)┘
  ↓
Item 14 (team_members cleanup)
  ↓
┌─────────────────────────┬─────────────────────────┐
↓                         ↓                         ↓
Items 1-4 (bugs)         Items 11-13 (docs)       Item 15 (notion check)
↓                                                   ↓
                                                  Item 9 (Academy aktivierung)
↓
Items 5-8, 10 (User-Features Welle 1b)
↓
Item 12 (analyze-applicant Phase-2-Prep)
↓
Wave Review
```

---

## 3. Welle 1 Open Questions (vor Start)

**Blocking — müssen vor Item 14 SQL-Apply geklärt sein:**

1. **Valentin's Email** korrekt? (Vermutung: `valentin@hartlimesgmbh.de`)
2. **Vanessa's `team_members` Rolle:** `viewer` oder `admin`?
3. **`team_members.role` CHECK constraint** Werte verifizieren
4. **Sameer Status-Konflikt** auflösen (intern_accounts.is_active=true vs team_members.status=deactivated)

**Non-blocking — können während Welle 1 nachgereicht werden:**

5. Erste Monday-Meeting-Datum für Item 9
6. Welche Buddy-Pairings für 9 Interns
7. Resend Domain Verification Status — wann fixt das jemand?

---

## 4. Cadence für Welle 1

Per Doc 7 §9 (NEU 10.04.):
- **Welle 1a Items (Foundation/Bug):** 48-72h Item Review pro Item
- **Welle 1b Items (User-Features):** Kein Item Review, Wave Review am Ende
- **Sonntag wöchentlich:** Sunday Snapshot (15 min, manuelle Outcome-KPI-Updates)
- **Welle-Ende:** Wave Review (60 min, alle Items + Lessons + nächste Welle)

**Cadence-Reminder:** Item D4 (Cron Edge Function) erinnert via Notification wenn Review >72h overdue. Soft Warning, kein Hard Block.

---

## 5. Was passiert NACH Welle 1

**Wave Review entscheidet:**
- Welche Items waren Scale / Iterate / Kill
- Lessons → Memory
- **Welle 2 Scope:** Optionen sind:
  - **A) Finance-Modul** (Vanessa-Sparring + Mahnungen ins OS)
  - **B) eCommerce-Sync** (Shopify-Keys für 5 weitere Brands)
  - **C) Marketing/Creator-Modul** (Asana → OS Migration für Mainak)
  - **D) AI-Phase-2-Vorbereitung** (Cost-Tracking + analyze-applicant Auto-Trigger)

Decision wird im Wave Review getroffen, basierend auf welche Outcome-KPIs in Welle 1 am stärksten gewachsen sind.

---

## 6. Decision (per Foundation-Doc-Regel)

**Was dieser Plan festlegt:**

1. **Welle 1 ist 2-3 Wochen, nicht 1 Woche.** Realismus per Reviewer-Audit.
2. **18 Items total** (0, D1-D4, 14, 1-15 — minus 16 das nicht existiert), gesplittet in 1a (10 Foundation/Bug-Items), 1b (7 User-Feature-Items), 1c (2 Doku-Items).
3. **Item 0 = git init** ist absolut erstes Item, ohne Versioning ist alles fragil.
4. **Item D4 (Cron Reminder)** ist Pflicht — sonst kollabiert die Loop-Disziplin.
5. **AI-Posture:** analyze-applicant + jarvis-chat manuell ERLAUBT, alles andere bleibt aus.
6. **Welle 1a hat schnelle Reviews**, Welle 1b hat einen großen Wave Review nach Real-Usage.
7. **Open Questions §3 müssen geklärt werden** vor Item 14, sonst Block.

---

**Bereit für Start. Erstes Item: 0 (git init).**

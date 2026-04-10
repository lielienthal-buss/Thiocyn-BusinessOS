# Notion Onboarding Findings — Welle 1 Item 15

**Datum:** 2026-04-10
**Owner:** Luis (Read-only Audit via Notion MCP)
**Welle-Item:** Welle 1 Item 15
**Done-Criteria:** Doku + Entscheidung „migrieren oder nicht" pro Page

---

## 0. TL;DR Decision

**❌ Keine Migration** der Notion-Onboarding-Pages in das Business OS / Intern Academy.

**Begründung:** Die existierenden Notion-Pages dokumentieren ein **anderes Onboarding** (legacy TAS in-office employees), nicht das aktuelle Hart Limes Intern Academy Programm.

**Was stattdessen:** Die Intern Academy wie sie heute in `intern-academy/` gebaut ist (per `project_intern_program.md` Memory) ist die canonical source. Alte Notion-Pages bleiben als Read-Only Archiv stehen.

---

## 1. Notion Search Results

Search query: `onboarding` (page_size 20)
Top relevante Pages (sortiert nach Aktualität):

| # | Title | Last Edited | Page ID | Notion URL |
|---|---|---|---|---|
| 1 | Onboarding Prozess | 2026-03-18 | `64781aec-debc-83ec-9a29-8163c8770f70` | [Link](https://www.notion.so/Onboarding-Prozess-64781aecdebc83ec9a298163c8770f70) |
| 2 | Hiring/Onboarding Take A Shot Notes | 2026-02-13 | `2ad81aec-debc-80d0-a302-d18ac5a55c16` | [Link](https://www.notion.so/Hiring-Onboarding-Take-A-Shot-Notes-2ad81aecdebc80d0a302d18ac5a55c16) |
| 3 | 🚀 Step-by-Step Strategie: Aufbau Bewerber-Pool + Onboarding-System | 2025-12-16 | `2cb81aec-debc-8039-aa37-c7e570afe584` | [Link](https://www.notion.so/Step-by-Step-Strategie-Aufbau-Bewerber-Pool-Onboarding-System-2cb81aecdebc8039aa37c7e570afe584) |
| 4 | Onboarding (parent of #3) | 2025-12-16 | `2cb81aec-debc-801c-8aaf-df2675b63fa3` | [Link](https://www.notion.so/Onboarding-2cb81aecdebc801c8aafdf2675b63fa3) |

---

## 2. Page-by-Page Analysis

### 2.1 „Onboarding Prozess" (#1, neueste, voll gelesen)

**Inhalt:** Detaillierter 4-Tage Onboarding-Plan + Woche 2 Rotationsplan für **physisches In-Office Onboarding bei Take A Shot Standalone**.

**Tag 1:** Konten anlegen, Büro-Führung, Vorstellungsrunde, Vertrag, Personalfragebogen, Wocheneinteilung, Produkt-/Marken-Einführung, Clockodo Mitarbeiterkonto.
**Tag 2:** Kundensupport (1) — Bestellungen, Reklamationen, Retouren, Impericon, Versand & Ersatzteile.
**Tag 3:** Kundensupport (2) — Lagerverwaltung, Tidio, Kundenbewertungen, Amazon Retouren, ChannelReply.
**Tag 4:** Erstattungen & Buchhaltung, Büromaterial, Schlüsselübergabe, Fahrt zu Impericon.
**Woche 2:** Rotationen mit Matthias (Onlineshop, Google), Matze (B2B/Amazon), Hannes (Kollektionen, Marketing), Steph (Newsletter, Social), Eliane (Graphikdesign).

**Verwendungs-Befund:**
- Domain-Mismatch: Take A Shot Single-Brand Office vs Hart Limes Holding mit 7 Brands + Remote Interns
- People-Mismatch: Matthias, Matze, Hannes, Steph, Eliane existieren als TAS-Mitarbeiter — nicht im aktuellen Hart Limes Team. Tom Roelants als Programme Lead, Mainak/Sameer/Aditya/Ansh/Dhaval/Vivian/Ekaterina/Viktoriya/Rukesh als Interns.
- Format-Mismatch: 4-Tage in-office Setup vs 3-Monats-Arc Academy mit 4 Phasen + 5 Levels (intern_milestones, intern_assignments)
- Tool-Mismatch: Clockodo, Impericon, ChannelReply, Tidio sind TAS-Stack. Hart Limes Stack ist Business OS + Supabase + Make.

**Migration-Verdict:** ❌ **Nicht migrieren.** Dokument ist ein TAS-Legacy-Snapshot. Keine 1-zu-1-Mappings ins aktuelle Modell.

**Was übernommen werden KÖNNTE (als Inspiration, nicht Migration):**
- Idee „Tag 1 = Accounts + Büro/Tooling-Tour" → existiert bereits implizit via `assignment_templates` Phase 1
- Idee „Woche 2 = Rotationen durch Departments" → könnte als optionales Academy-Element ergänzt werden, aber **nicht jetzt** (Welle 1 Out-of-Scope)
- Idee „letzte Absprachen + Schlüsselübergabe" → Off-boarding-Pendant, separates `intern-offboarding-checklist.md` existiert bereits

### 2.2 „Hiring/Onboarding Take A Shot Notes" (#2)

**Last edited:** Feb 2026
**Title impliziert:** TAS-spezifische Hiring + Onboarding Notes
**Read-Status:** Title-Heuristic (nicht voll gelesen, da Title schon klare Domain-Trennung signalisiert)
**Migration-Verdict:** ❌ **Nicht migrieren.** Per Title TAS-Standalone, vorhersehbar ähnliche Domain-Mismatch wie #1.

### 2.3 „🚀 Step-by-Step Strategie: Aufbau Bewerber-Pool + Onboarding-System" (#3)

**Last edited:** 2025-12-16 (vor 4+ Monaten, pre-dates Tom als Programme Lead und pre-dates Academy Build)
**Inhalt-Format:** Notion column_list (Page-Layout, mehrere Spalten — wäre teure Multi-Call-Drilldown)
**Read-Status:** Page-Top inspected, Inhalt nicht voll abgegraben
**Migration-Verdict:** ❌ **Nicht migrieren als Inhalt.** Strategisches Doc, vorgängig zur Academy-Build-Welle. Konzeptionell vermutlich überholt durch das real gebaute Academy-System (intern_milestones + assignment_templates + Phase 1-4).

**Was wertvoll sein könnte:** Lessons aus dem ursprünglichen Strategie-Denken — falls Luis künftig die Academy weiterentwickelt, könnte er die Page als „Was haben wir 2025-12 vorgehabt vs was haben wir 2026-04 wirklich gebaut" Vergleichsdokument heranziehen. Nicht jetzt nötig.

### 2.4 „Onboarding" (#4)

**Last edited:** 2025-12-16
**Inhalt:** Parent-Page von #3 (Container)
**Migration-Verdict:** ❌ **Nicht migrieren.** Container ohne eigenständigen Inhalt.

---

## 3. Was ist der canonical Stand für Hart Limes Intern Onboarding?

Per `project_intern_program.md` Memory + Foundation Doc 01 §Modul 2 Academy:

**Quelle der Wahrheit:**
- DB: `intern_accounts` (10 Interns) + `intern_milestones` (10 rows) + `assignment_templates` (19 templates seeded) + `intern_assignments` (60 active) + `monday_meetings` + `intern_meeting_attendance`
- Code: `components/admin/AcademyView.tsx`
- Doc-Assets: `docs/intern-academy/` (Markdown — Monday Meeting Template, Rubrics, Tracks, Buddy Program, README)
- Owner: Tom Roelants als Programme Lead, Co-creator des Framework
- Branding: "Hartlimes Intern Academy · House of Sustainable Brands"

**Was die Notion-Pages NICHT abdecken** (was die Academy aber hat):
- Per-Phase Assignments mit Submission Workflow
- Monday Meeting Tracking + Attendance
- Buddy Pairing System
- Intern Milestone Levels (Rookie → Experienced → Lead)
- Token-Budget pro Intern (`intern_token_usage`)

---

## 4. Final Decision

**Migration:** ❌ Keine.

**Action:**
1. Notion-Pages bleiben als Read-Only Archiv (TAS-Legacy)
2. Keine Inhalte werden in `docs/intern-academy/` oder DB-Tabellen übertragen
3. **KEIN Cleanup nötig** — die Notion-Pages werden weder migriert noch archiviert noch gelöscht. Sie sind harmlos im Notion-Workspace.
4. Item 15 ist done — Findings dokumentiert, Decision getroffen.

**Künftige Re-Evaluation:** Falls Luis die Academy in einer späteren Welle erweitert (z.B. „Department Rotations Phase 5") könnte Page #1 als Inspiration noch einmal angeschaut werden. Aktuell aber Out-of-Scope.

---

**Welle-1-Item 15 ✅ done.**

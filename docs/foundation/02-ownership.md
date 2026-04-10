# 02 — Ownership & Decision Authority

**Last updated:** 2026-04-10
**Stand:** Welle 0 (Foundation Setup), vor Hiring-Welle 1
**Verwendung:** Single-Reference für „wer entscheidet was, wer wird gerufen". Bei jedem neuen Item: ZUERST hier nachsehen wer Owner ist, DANN agieren.

---

## 0. Grund-Modell (per Luis 10.04.)

**Luis = Single Owner für alle Module.** Delegation erfolgt von Luis an Interns / Team-Mitglieder pro Task, nicht pro Modul. Das ist KEIN Bug, KEIN Übergangs-Modus — es ist die bewusste Entscheidung für die aktuelle Phase.

**Konsequenz:**
- Es gibt aktuell keine „Modul-Owner" außer Luis.
- Tasks werden via `team_tasks` Tabelle delegiert (mit `assigned_to_email`).
- Decision Authority ist immer Luis, außer er delegiert sie ausdrücklich.
- Tom, Mainak, Sameer etc. sind **Executors**, nicht **Owners**.

**Wann sich das ändert:**
- Wenn ein Bereich operativ stabil läuft + ein Team-Mitglied bewiesen hat, dass er ihn ohne tägliche Luis-Eingaben führen kann
- Dann wird **diese Doc neu geschrieben** mit dezentralen Owner-Einträgen
- Trigger sind in Doc A (Charter) als Layer-2-Leitlinien

---

## 1. Modul-Ownership (alle 14)

| # | Modul | Owner | Delegation an | Decision Authority | Modul-KPI |
|---|---|---|---|---|---|
| 1 | Hiring | **Luis** | Hiring-Tasks delegierbar (Bewerber screenen, Interview vorbereiten) — bisher Mainak | Luis | Time-to-Hire (Tage zwischen `applications.created_at` und `stage='hired'`) |
| 2 | Intern Academy | **Luis** | **Tom = Programme Lead** (Co-creator des Framework, runs program), Sameer (Senior Peer-to-Peer) | Luis (mit Tom als Co-Designer) | Anzahl Interns mit completed Phase-1-Assignments (60 active) |
| 3 | Finance | **Luis** | NICHT delegierbar (Money-Boundary, siehe `feedback_intern_no_money_access.md`) | Luis | Anzahl `finance_pipeline.status='ueberfaellig'` Rows |
| 4 | Customer Support | **Luis** | Sameer (für Chatarmin-Setup), Tom + Aditya für Triage NACH Chatarmin-Anbindung | Luis | Open Tickets in `support_tickets` |
| 5 | Tasks + Daily Briefing | **Luis** | NICHT delegierbar (System-Modul) | Luis | Anzahl `team_tasks.status NOT IN ('done','cancelled')` |
| 6 | Marketing / Content | **Luis** | Matic (CMO) für Strategie, Mainak für Creator/Content-Ops, Praktis für Asset-Erstellung | Luis (mit Matic als Sparring) | Anzahl `content_posts` pro Woche |
| 7 | Creator Program | **Luis** | Mainak (per `intern-brief-mainak.md`) | Luis | Anzahl `creators.status='active'` (aktuell 0, wird nach Aktivierung relevant) |
| 8 | eCommerce | **Luis** | NICHT delegierbar in Welle 1 (out-of-scope) | Luis | Anzahl synced Brands in `shopify_sync_log` |
| 9 | Brand Management | **Luis** | NICHT delegierbar (strategisch) | Luis | Anzahl Brands in `brands` (aktuell 7) |
| 10 | ISO Compliance | **Luis** | NICHT delegierbar (Compliance) | Luis | Open `non_conformances` (aktuell 5) |
| 11 | System / Meta | **Luis** | Valentin (für Tech-Setup-Tasks: IMAP, Drive, Shopify-Keys, OAuth) | Luis | Open `access_requests` |
| 12 | Lead Capture | **Luis** | NICHT delegierbar (out-of-scope Welle 1) | Luis | `form_events` Anzahl pro Woche |
| 13 | Video Generation | **Luis** | NICHT delegierbar (Higgsfield via MCP, läuft außerhalb des OS) | Luis | Anzahl `video_jobs.status='completed'` |
| 14 | Knowledge Base | **Luis** | NICHT delegierbar (Modul broken — Tabelle existiert nicht) | Luis | n/a (broken view) |

---

## 2. Decision Authority Matrix

Welche Entscheidungen Luis NICHT delegiert:

| Entscheidungs-Typ | Bleibt bei | Begründung |
|---|---|---|
| Geld-Bewegungen (Zahlungen, Refunds, Mahnungen-Ausführung) | **Luis** | Per `feedback_intern_no_money_access.md` — Remote-Intern-Risiko |
| Banking-/Payment-Credentials | **Luis** | gleicher Grund |
| Externe Kommunikation an Steuerberater (Amanda) | **Luis** | Per `tom-finance-onboarding.md` — Tom darf nicht direkt mit Amanda |
| Hire/Fire Entscheidungen | **Luis** | strategisch |
| Vertragsänderungen / Vendor-Kündigungen | **Luis** | strategisch |
| Schema-Migrations + Code-Architektur | **Luis** | sole maintainer |
| Tool-Subscriptions / neue Integrationen | **Luis** | Cost-Authorization |
| Interne Eskalation bei Mahnungen Stufe ≥3 / legal | **Luis** | per Eskalations-Matrix in `tom-finance-onboarding.md` |
| AI-Function Aktivierung (Phase 1 → Phase 2 Switch) | **Luis** | per `feedback_business_os_phasing.md` — wartet auf Firmen-API |
| Two-Phase-Commit für destruktive Aktionen | **Luis** | per `system/policies/approval-matrix.md` |

Welche Entscheidungen delegiert werden können (mit Luis als Reviewer):

| Entscheidungs-Typ | Default-Delegate | Mit Review von Luis |
|---|---|---|
| Bewerber screening (Pass/Fail vor Interview) | Mainak | Ja, vor Interview-Einladung |
| Bewerber Reject (kein Effort, keine Antwort >7 Tage) | Mainak / Tom | Ja, vor Email-Versand |
| Intern Onboarding-Schritte abhaken | Tom | Wöchentlich Review |
| Customer Support 1st-Response (NACH Chatarmin) | Tom / Aditya / Sameer | Bei Eskalation |
| Content / Social Media Scheduling | Praktis | Wöchentlich |
| Creator Outreach | Mainak | Wöchentlich Pipeline-Update |

---

## 3. Per-Person Mapping

### Luis Lielienthal
**Rolle:** Founders Associate, Owner aller Module, einziger Decision-Maker
**OS-Zugriff:** Owner (alle Sections via `team_members.role='owner'` + Hardcoded-Admin-Check in `Dashboard.tsx`)
**Verantwortlich für:** Strategie, Code, Architektur, Finance, Externe Kommunikation, Hiring-Entscheidungen
**NICHT verantwortlich für:** Tagesgeschäft Operations (das wird delegiert, sobald operative Last fällt)
**Kontakt:** `jll@hartlimesgmbh.de` (primär) + `luis@mail.hartlimesgmbh.de` (zweit)

### Tom Roelants
**Rolle:** **Programme Lead** (Intern Academy) + Co-creator des Program Framework + Data Collection Layer
**Aktuell:** Tom runs den Intern Academy Program (3-Monats-Arc, 4 Phasen, 5 Levels). Initialer Framework-Vision von Tom, operative Schicht von Luis/Claude ergänzt. Tom = einziger Intern mit manuellem OS-Login (Resend Domain blockt die anderen 9).
**OS-Zugriff:** Login seit 09.04. via manuelles Passwort. NOCH NICHT in `team_members` Tabelle (Welle 1 Item 14).
**Verantwortlich für (delegiert von Luis):** Intern Academy Program (Monday Meetings, Buddy Pairings, Assignment Reviews), Onboarding neuer Interns, Daten-Eintrag/Triage, CS-Tickets (4 aktuell zugewiesen)
**NICHT verantwortlich für:** Geld-Bewegungen, Externe Eskalation, Strategische Entscheidungen, Code im OS
**Kontakt:** `tom@hartlimesgmbh.de` + `tlroelants@gmail.com` (intern_accounts)

### Mainak Patra
**Rolle:** Marketing / Creator Program Operator (per `intern-brief-mainak.md` 2026-03-23)
**Aktuell:** Creator Pipeline cleanup (Asana), Dr. Severin Amazon Relaunch Support, US-Creator Outreach Thiocyn
**OS-Zugriff:** ungeprüft (vermutlich kein Login)
**Verantwortlich für (delegiert von Luis):** Creator Tracking, Hiring-Screening (vermutlich), Asset-Coordination
**NICHT verantwortlich für:** Geld, Strategie, Hire/Fire
**Kontakt:** `mainak4869@gmail.com`

### Sameer Paul
**Rolle:** Customer Support + (perspektivisch) Chatarmin Automation Lead
**Aktuell:** CS-Tickets (per `team_members.status='deactivated'` — vermutlich Doppel-Eintrag-Bug, in `intern_accounts.is_active=true`)
**OS-Zugriff:** Login per `intern_accounts`, aber Status in `team_members` ist `deactivated`
**Verantwortlich für (delegiert von Luis):** ChatarminCX Automation (Pre-Req für Modul 4)
**NICHT verantwortlich für:** Money, Eskalation an Luis-Niveau

### Vanessa Petrova
**Rolle:** Former Finance Owner (handoff 2026-03-27 an Luis), aktuell Tool Strategy Sparring
**Aktuell:** Komplexe Decisions in Finance, Tool-Strategy-Meetings
**OS-Zugriff:** kein Eintrag in `team_members`, kein Login
**Verantwortlich für (delegiert von Luis):** Tool-Strategy Meetings, Komplexe Finance-Decisions, GMI/Billbee/B2B-Setup
**NICHT verantwortlich für:** Day-to-Day Finance (das ist Luis)
**Kontakt:** `vp@hartlimesgmbh.de`

### Peter Hart
**Rolle:** Managing Director (MD) Hart Limes GmbH
**Aktuell:** Strategischer Überblick, finale Approval bei großen Entscheidungen
**OS-Zugriff:** kein Eintrag in `team_members`, kein Login (per Memory hat Peter Admin-Rolle geplant)
**Verantwortlich für:** Letztinstanzliche Entscheidungen über Hart Limes Holding-Strategie
**Bevorzugte Kommunikation:** Telefon/WhatsApp (per `user_peter_contact.md`)
**Kontakt:** `ph@hartlimesgmbh.de`

### Valentin Bohnhardt
**Rolle:** Dev / Tech-Setup
**Aktuell:** Tracking, TikTok Shop Setup, IMAP/Drive/Shopify-Keys (warten seit Open Task #11)
**OS-Zugriff:** kein Eintrag in `team_members`, kein Login (Admin-Rolle geplant)
**Verantwortlich für (delegiert von Luis):** Tech-Setup Tasks (IMAP App-Pw, OAuth, API-Keys, Drive MCP)
**NICHT verantwortlich für:** Code im Business OS (Luis ist sole maintainer)

### Matic (CMO)
**Rolle:** CMO Hart Limes
**Aktuell:** Marketing-Strategie, Ad-Account-Ownership, unklassifizierte Marketing-Expenses
**OS-Zugriff:** vermutlich kein Login
**Verantwortlich für (delegiert von Luis):** Marketing-Strategie (Modul 6 Sparring)
**Kontakt:** `matic@hartlimesgmbh.de` (per team_tasks)

### Andere Interns (Aditya, Ansh, Dhaval, Vivian, Ekaterina, Viktoriya, Rukesh)
**Rolle:** Various — Marketing, eCommerce, Analytics, Support
**Aktuell:** in `intern_accounts` mit Departments. Spezifische Rollen siehe `intern-roster.md` und `intern-management-system.md`
**OS-Zugriff:** über `intern_accounts.auth_user_id` (vermutlich pending Auth-Invites, da Resend Domain unverified)
**Verantwortlich für (delegiert von Luis):** Per Department + Wochen-Tasks im Standup

---

## 4. Welle 1 — Konkrete Delegations-Pläne (Hiring & Onboarding)

Pro Welle-1-Item: Wer macht was, wer reviewt.

| Item (aus Phase-1-Lücken Doc B) | Build/Code | Operative Aktivierung | Review |
|---|---|---|---|
| Stage-Cleanup | Luis (Code) | n/a | Luis |
| 72h Auto-Reject Verifikation | Luis (Read-only Check) | n/a | Luis |
| LinkedIn 404 Bug | Luis (Code) | n/a | Luis |
| Logo Display Bug | Luis (Code) | n/a | Luis |
| Send-Button + Email-Template Wiring | Luis (Code) | Mainak (testet via echtem Bewerber) | Luis |
| Insights View | Luis (Code) | Luis (nutzt selbst) | Luis |
| CV Upload + Storage | Luis (Code + Migration) | Mainak (testet) | Luis |
| Eval Dashboard | Luis (Code) | Mainak (nutzt für Interview-Prep) | Luis |
| Academy Aktivierung | n/a | Tom (30-min Walkthrough mit Luis, dann Tom füllt für Mainak ein) | Luis (wöchentlich) |
| Public Landing Audit | Luis (Read + ggf. Fix) | n/a | Luis |
| Notion → Business OS Migration Plan | Luis (Doc) | Mainak (Notion-Export) | Luis |
| Paigh Sample-Tracking Konzept | Luis (Doc + Schema-Vorschlag) | n/a | Luis |
| Tom + Team in team_members anlegen | Luis (SQL) | n/a | Luis |
| Notion-Check für Onboarding-Strukturen | Luis (Read via MCP) | n/a | Luis |

**Beobachtung:** Aktuell ist Luis bei JEDEM Item entweder Builder oder Reviewer. Das ist ok für Welle 1, aber Doc A muss thematisieren wann sich das ändert (Layer-2-Leitlinie: Trigger für „Tom kann eigenständig Welle ausführen").

---

## 5. team_members Tabelle — APPLIED 2026-04-10 (Welle 1 Item 14)

**Status:** ✅ Applied. 8 rows live (7 active, 1 deactivated).

### 5.1 Live-Stand nach Apply

| email | full_name | role | status | has_auth | Notiz |
|---|---|---|---|---|---|
| jll@hartlimesgmbh.de | Jan-Luis Lielienthal | owner | active | ❌ | Alias, dormant bis Login mit jll@ |
| luis@mail.hartlimesgmbh.de | Luis Lielienthal | owner | active | ✅ | Existing, Luis' aktueller Login |
| tlroelants@gmail.com | Tom Roelants | intern_lead | active | ✅ | Tom's Gmail Login (per auth.users) |
| mainak4869@gmail.com | Mainak Patra | staff | active | ❌ | Dormant bis Resend Domain works |
| vp@hartlimesgmbh.de | Vanessa Petrova | admin | active | ❌ | Dormant |
| ph@hartlimesgmbh.de | Peter Hart | admin | active | ❌ | Dormant |
| vb@hartlimesgmbh.de | Valentin Bohnhardt | admin | active | ❌ | Dormant |
| sameerpaulsam@gmail.com | (null) | support | deactivated | ❌ | Per Luis 10.04.: nie eingeloggt |

### 5.2 Korrekturen am Ursprungs-Plan (Doc 02 v1, gelernt während Apply)

| Korrektur | Was es war | Was es ist | Begründung |
|---|---|---|---|
| Tom-Email | `tom@hartlimesgmbh.de` | `tlroelants@gmail.com` | Dashboard.tsx matched `team_members.email = session.user.email`. Tom's Login-Email per `auth.users` ist Gmail. |
| Tom-Rolle | `'hiring'` | `'intern_lead'` | UserRole enum in Dashboard.tsx kennt nur `owner\|admin\|staff\|intern_lead\|viewer`. `'hiring'` würde auf ROLE_LEVEL=0 fallen (= viewer). |
| Mainak-Rolle | `'creative'` | `'staff'` | Gleiche Begründung. `'staff'` gibt ihm Hiring + Creative + Revenue Access, aber NICHT Finance/Admin (Money-Boundary erhalten). |
| Sameer | reaktivieren | unverändert lassen | Per Luis 10.04.: Sameer ist nicht aktiv (nie eingeloggt, Resend blockt). team_members.status='deactivated' bleibt. |

### 5.3 Wichtige Architektur-Erkenntnis

**`team_members.allowed_sections` ist heute NICHT load-bearing.** Dashboard.tsx prüft section-Sichtbarkeit via `minRole` (`SECTIONS[].minRole`), nicht via `allowed_sections`. Die Spalte wird nur in `AccountView.tsx` zur Anzeige genutzt.

**Tom-Permission-Check Live:**
- Tom = `intern_lead` → ROLE_LEVEL=1
- Sichtbar: command (no minRole), creative (no minRole), hiring (no minRole), support (no minRole)
- NICHT sichtbar: revenue (minRole=staff), finance (minRole=admin), admin (minRole=admin)
- ✅ Money-Boundary: erhalten

**Mainak-Permission-Check Live:**
- Mainak = `staff` → ROLE_LEVEL=2
- Sichtbar: command, creative, hiring, support, **revenue** (für Ad Performance)
- NICHT sichtbar: finance, admin
- ✅ Money-Boundary: erhalten

### 5.4 Tom hat heute schon Access via Fallback

Dashboard.tsx fällt auf `intern_accounts WHERE department='lead'` zurück, wenn `team_members` keinen Eintrag hat. Tom ist mit `department='lead'` in intern_accounts → bekommt automatisch `intern_lead` Rolle. Der team_members-Eintrag von heute ist also **redundant für aktuellen Zugriff**, aber wichtig für:
- Source-of-Truth-Klarheit (single lookup statt fallback chain)
- Spätere Removal des intern_accounts Fallback
- Audit-Trail (`invited_by`, `created_at`)

### 5.5 Open Discoveries für Folge-Wellen

1. **Sameer-role 'support'** ist nicht in UserRole-Enum. Wenn er je reaktiviert wird → Cast `'support' as UserRole` → ROLE_LEVEL=0 = viewer. Funktioniert technisch, sollte aber gefixt werden.
2. **`team_members.role` hat KEINEN CHECK constraint** trotz `-- role: 'owner' | 'admin' | ...` Comment in `supabase_team_members.sql`. Free-text. Sollte in Layer-2-Hardening enforced werden.
3. **`allowed_sections` Section-Vokabular ist veraltet** in `supabase_team_members.sql` Seed (`'marketing','ecommerce','analytics'`) vs Live-Code (`'command','creative','revenue'`). SQL-Seed-File ist drift, sollte gepatched werden wenn jemand davon Migrationen ableitet.

---

## 6. Eskalations-Matrix (per `tom-finance-onboarding.md` adaptiert)

| Trigger | Action | Owner |
|---|---|---|
| Deadline <48h | Sofort eskalieren, nicht warten | Executor → Luis |
| Amount >€500 | Vor jeder Aktion Luis informieren | Executor → Luis |
| Unbekannte Rechnung / Vorgang | Nicht selbst entscheiden | Executor → Luis |
| Authority-Mail (Finanzamt, Steuerberater, Behörden) | Immer sofort eskalieren | Executor → Luis |
| Mahnung Stufe 3 / Legal-Drohung | Sofort an Luis | Executor → Luis |
| PayPal Dispute Deadline <48h | SOFORT-Eskalation | Executor → Luis |
| Bewerber-Frage außerhalb Standard | Mainak/Tom → Luis | Mainak/Tom |
| Architektur-/Code-Frage zum Business OS | n/a | Nur Luis (sole maintainer) |
| Tech-Setup-Issue (IMAP, OAuth, API) | Luis → Valentin (manuell) | Luis koordiniert |

---

## 7. Trigger für Re-Distribution (Layer-2-Leitlinien)

Diese Doc beschreibt den IST-Zustand (Luis-Single-Owner). Die folgenden Bedingungen würden eine Neu-Verteilung der Ownership rechtfertigen:

| Trigger | Konsequenz |
|---|---|
| Tom hat 4 Wochen lang Onboarding-Lead-Rolle ohne Luis-Eingriff erfolgreich gefüllt | Tom wird Owner Modul 2 (Academy/Onboarding) |
| Mainak hat Creator-Pipeline 4 Wochen lang autonom geführt + KPIs erreicht | Mainak wird Owner Modul 7 (Creator Program) |
| Sameer hat ChatarminCX live deployed + 2 Wochen Tickets ohne Eskalation getriaged | Sameer wird Owner Modul 4 (CS) |
| Vanessa kommt zurück in Vollzeit-Rolle | Vanessa wird Owner Modul 3 (Finance) — Luis bleibt Decision-Authority bei Money |
| Externe Hire (Senior Dev) | Tech-Owner-Rolle möglich, aber Luis bleibt Architecture-Owner |
| Layer 2 / Externe Kunden | Per-Customer Ownership statt internal Single-Owner |

**Re-Distribution-Mechanik:**
1. Luis identifiziert Trigger erfüllt
2. Update dieser Doc (`02-ownership.md`)
3. Migration `team_members.role` aktualisieren
4. Doc A (Charter) Update: neuer Owner bekommt eigene Rolle-Sektion
5. 2-Wochen-Probelauf: Luis bleibt Reviewer
6. Nach 2 Wochen: Volle Übergabe oder Rollback

---

## 8. Decision (per Luis-Regel: Doc endet in Entscheidung)

**Was diese Doc festlegt:**

1. **Single-Owner-Modell ist aktuell richtig** für Phase 1. Keine artificial Distribution.
2. **Luis ist Owner aller 14 Module.** Delegation läuft pro Task, nicht pro Modul.
3. **`team_members` Tabelle wird in Welle 1 (Item 16) sauber befüllt** mit 7 Einträgen: Luis (jll@), Luis (luis@mail., Alias), Tom (hiring), Sameer (support, reaktiviert), Mainak (creative), Vanessa (viewer), Peter (admin), Valentin (admin).
4. **Money-Boundary ist hart:** Tom + alle Interns = NULL Zugriff auf Banking, Zahlungen, Mahnungen-Ausführung. Per `feedback_intern_no_money_access.md`.
5. **Re-Distribution-Trigger** sind dokumentiert (§7) — falls Tom oder Mainak ihre Rollen erfolgreich fülle, gibt es einen klaren Pfad zur Owner-Übernahme einzelner Module.
6. **Welle 1 Hiring-Items:** Luis ist Builder bei jedem Item, Mainak/Tom sind nur an spezifischen Aktivierungs-Schritten beteiligt (Send-Button-Test, CV-Upload-Test, Academy-Walkthrough).

**Nächster Schritt:** Doc A (Charter) — Per-Rolle Pain + Workflow + Don't-Build pro Rolle. Basiert auf §3 (Per-Person Mapping) dieser Doc.

---

## 9. Offene Fragen — RESOLVED 2026-04-10

1. ✅ **Valentin's Email:** `vb@hartlimesgmbh.de` (Luis 10.04.)
2. ✅ **Vanessa's Rolle:** `admin` (Luis 10.04.)
3. ✅ **`team_members.role` CHECK constraint:** Existiert NICHT (Live-DB-Check). Free-text. Convention bleibt aber `owner | admin | staff | intern_lead | viewer` (per Dashboard.tsx UserRole enum).
4. ✅ **Sameer-Konflikt:** Per Luis: nicht aktiv, nie eingeloggt. team_members.status='deactivated' bleibt. intern_accounts.is_active=true ist Legacy/unused.

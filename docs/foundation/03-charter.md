# 03 — Business OS Charter

**Last updated:** 2026-04-10
**Stand:** Welle 0 (Foundation Setup)
**Verwendung:** Antwort auf „Wer hat welchen Pain, was bauen wir bewusst NICHT, wann wird daraus extern verkaufbar". Pre-Read vor jedem Welle-Start.

---

## 0. Mission Statement

**Business OS löst die operative Überlast eines Single-Operators (Luis), der eine Multi-Brand-Holding (Hart Limes, 7 Brands) ohne strategische Entscheidungs-Bremse betreibt.**

Das System ist:
- **Internal-first** für Hart Limes
- **Single-Owner** (Luis) mit delegierter Execution durch Interns
- **Iterativ optimiert** über Closed Feedback Loop (Build → KPI → Track → Decision → Memory)
- **Phase-getrennt:** Phase 1 = Deployment + AI-ready, Phase 2 = AI-aktiviert (nach Firmen-API)
- **Long-term white-label** für Layer 2 (externe Kunden) und Layer 3 (Enterprise)

**Mission ist NICHT:**
- Ein generisches SaaS-Tool zu bauen
- Features um ihrer selbst willen zu bauen
- AI-Features ohne Mehrwert zu produzieren
- Ein internes Spielzeug zu sein

---

## 1. Per-Rolle: Pain + Haupt-Workflow + Don't-Build-List

### 1.1 Luis (Founders Associate, Owner)

**Pain (warum das System überhaupt existiert):**
- Tagesgeschäft frisst Zeit für strategische Arbeit
- 7 Brands × ~10 Tools = 70 Touch-Points pro Woche, viele davon manuell
- Finance-Verbindlichkeiten + Mahnungen + Reporting kosten ~5h/Woche
- Mail-Triage über 4 Postfächer kostet ~3h/Woche
- Bewerber-Pipeline (47 aktive) erfordert Tracking + Email-Versand + Stage-Updates
- Onboarding neuer Interns (~1/Monat) ist Hand-Arbeit
- Mental Load: nichts darf verloren gehen, alles in Luis' Kopf

**Haupt-Workflow (Tag im Leben mit OS):**
1. Morgens: Dashboard öffnen → 1 Blick Action Center (Heute zu erledigen, regelbasiert)
2. Akute Items abarbeiten (Disputes, kritische Mails, Eskalationen)
3. Delegationen: neue Tasks an Interns via `team_tasks` (mit klarer Acceptance-Criteria)
4. Strategisches Arbeit (Marketing-Review, Brand-KPIs)
5. Abends: Kurz-Review der Delegationen — was kam zurück, was steckt fest

**Don't-Build für Luis:**
- ❌ KEIN Vollumfassendes „all-in-one" Mega-Dashboard mit 100 Widgets — Action Center + 1-2 Detail-Views ist genug
- ❌ KEIN Mobile App — Luis arbeitet 9-18 am Mac, mobile ist Notfall (max. Telegram-Push)
- ❌ KEINE komplexe Berechtigungs-Matrix in Phase 1 — Luis ist Owner, simple Hardcode-Check ist ok bis 2. Nicht-Owner-User
- ❌ KEINE Multi-Tenancy / Workspace-Switching für Phase 1 — kommt erst Layer 2
- ❌ KEINE granularen Notifications — Telegram-Push für SOFORT-Items, Rest pulled

---

### 1.2 Tom Roelants (Onboarding Lead, Data Collection Layer)

**Pain (was Tom heute manuell macht, das ihn nervt):**
- Mehrere Tools für verschiedene Tasks (Caya, GMI, Notion, Sheets, ggf. Slack-Threads)
- Doppel-Eingaben (Daten in Notion + Sheet + Mail-Forward)
- Keine Single Source für „was ist heute mein Job"
- Onboarding neuer Interns ohne strukturierten Track (mündlich, ad-hoc)

**Haupt-Workflow (Tag im Leben mit OS):**
1. Morgens: OS Login → Tasks-View (`team_tasks WHERE assigned_to_email='tom@...'`)
2. Tasks abarbeiten in Reihenfolge (CS-Tickets, Onboarding-Schritte, UGC-Reviews)
3. Bei neuem Intern: AcademyView → Onboarding Checklist abhaken
4. Bei CS-Ticket: SupportView → triage, eskalieren wenn nötig
5. Abends: Tasks Status updaten, Friday-Update kurz an Luis

**Don't-Build für Tom:**
- ❌ KEIN tägliches Auswerten von Dashboards mit Charts — Tom liest Tasks + Tickets, keine Analyse
- ❌ KEINE AI-gestützte Anweisung „was sollst du als Nächstes tun" — Tom braucht klare Tasks, keine AI-Empfehlung
- ❌ KEIN Finance-Schreibzugriff (Money-Boundary, hart)
- ❌ KEIN PayPal-Dispute-Klick (eskalation an Luis only)
- ❌ KEIN Mahnungs-Versand (Luis only)
- ❌ KEINE komplexe Filter-Matrix in Tasks — er soll nur seine eigenen sehen + status togglen
- ✅ JA: einfache Status-Buttons (todo → in_progress → done)
- ✅ JA: Onboarding-Checkliste mit Checkboxen
- ✅ JA: Daten-Eingabe-Formulare (Bewerber-Notes, Ticket-Notes)

---

### 1.3 Mainak Patra (Marketing / Creator Program Operator)

**Pain:**
- Asana ist parallel zum OS — Doppel-Pflege
- Creator-Pipeline-Status verteilt über mehrere Tools
- Hiring-Screening ohne klare Stage-Übersicht (Notion-Board separat)

**Haupt-Workflow (mit OS, sobald aktiviert):**
1. CreatorView → Pipeline-Tab → wer ist wo im Funnel
2. Bei Bewerber-Screening: ApplicationListView → Stage filtern, AI-Score ansehen, Pass/Fail markieren
3. Brief-Erstellung (Marketing/Content) im OS oder extern, dann Output-Tracking
4. Friday-Update an Luis

**Don't-Build für Mainak:**
- ❌ KEINE komplexe Marketing-Analytics in Welle 1 — Mainak nutzt Asana noch parallel
- ❌ KEIN Direct-Send von Marketing-Mails (Resend Domain ja unverified)
- ❌ KEINE Creator-Payout-Berechtigung (Money-Boundary)
- ✅ JA: Creator-Pipeline Read + Update (creator_prospects, creator_tasks)
- ✅ JA: Hiring-Screening (applications.aiScore lesen, Notes hinzufügen)
- ✅ JA: Asset-Tracking (creative_assets, content_posts)

---

### 1.4 Sameer Paul (Customer Support, Future Chatarmin Lead)

**Pain:**
- Tickets aus mehreren Quellen (Email, Chatarmin, Shopify, Instagram DMs)
- Keine zentrale Triage
- Keine SLA-Übersicht

**Haupt-Workflow (NACH Chatarmin-Anbindung):**
1. CustomerSupportView → Ticket-Liste sortiert nach Priorität + Deadline
2. Ticket öffnen → triage, Antwort schreiben (oder eskalieren)
3. Status: open → in_progress → resolved
4. Eskalation an Luis bei Money-Themen / Refunds

**Don't-Build für Sameer (Phase 1, vor Chatarmin):**
- ❌ KEIN aktives CS-Modul-Onboarding bevor Chatarmin live ist
- ❌ KEIN Refund-Knopf
- ❌ KEINE Inventory-Updates (das ist Shopify-Domain)

**Don't-Build für Sameer (NACH Chatarmin):**
- ❌ KEINE komplexe Eskalations-Engine — simple „assign to Luis" Button reicht
- ✅ JA: Ticket-Liste mit Filter (open / resolved / mine)
- ✅ JA: Inline-Edit von Status + Notes
- ✅ JA: Bulk-Actions (mehrere Tickets gleichzeitig)

---

### 1.5 Vanessa Petrova (Former Finance Owner, Sparring)

**Pain:**
- Zwischen Tools wechseln (DATEV, GMI, Billbee, Excel) für komplexe Decisions
- Keine zentrale Übersicht über offene Themen die Luis-Decision brauchen

**Haupt-Workflow (sobald Tool aktiv):**
1. FinanceView → Action Center → was braucht Luis-Entscheidung
2. Read-only auf Pipeline + Disputes + Reports
3. Sparring-Notes oder Empfehlungen an Luis

**Don't-Build für Vanessa:**
- ❌ KEIN Schreibzugriff auf Money-Tabellen
- ❌ KEIN Direkt-Versand an Amanda (Steuerberater)
- ❌ KEINE komplexe Reporting-Generierung (das ist Luis' Job, Vanessa berät)
- ✅ JA: Read-only auf alle Finance-Tabellen
- ✅ JA: Notes / Sparring-Kommentare zu Items

---

### 1.6 Peter Hart (MD)

**Pain:**
- Wenig Zeit, will nur strategischen Überblick
- Bevorzugt Telefon/WhatsApp, nicht Tool-Logins

**Haupt-Workflow (sobald produktiv):**
1. Wöchentliches Briefing (manuell von Luis erstellt oder OS-generiert)
2. Bei Bedarf: HomeView (Command Center) für Brand-Performance Snapshot
3. Strategische Entscheidungen via Telefon/WhatsApp mit Luis

**Don't-Build für Peter:**
- ❌ KEIN täglicher Login-Workflow — Peter ist Pull, nicht Push
- ❌ KEINE komplexe Permission-Hierarchie — Peter ist Admin (alle Sections)
- ❌ KEINE Mobile-App-Anforderung
- ✅ JA: Sonntag-Briefing als generierter Doc (manuell oder via OS)
- ✅ JA: Read-only Admin auf alle Sections wenn er sich einloggt

---

### 1.7 Valentin Bohnhardt (Dev / Tech-Setup)

**Pain:**
- Bekommt Tech-Tasks via Slack ad-hoc, ohne strukturierten Backlog
- Wartet auf Specs, Luis wartet auf Setup → Dead-Lock

**Haupt-Workflow:**
1. Tech-Tasks vom Luis als `team_tasks` (zugewiesen an `valentin@hartlimesgmbh.de`)
2. Setup ausführen (IMAP-Pw, OAuth, API-Keys)
3. Status auf done, Credentials sicher übergeben

**Don't-Build für Valentin:**
- ❌ KEIN aktiver Code-Push ins Business OS Repo — Luis ist sole maintainer
- ❌ KEINE Code-Reviews durch Valentin
- ❌ KEINE Architektur-Entscheidungen
- ✅ JA: Tech-Setup-Tasks (extern: IMAP, OAuth, API)
- ✅ JA: Read-Admin auf das OS für Diagnose-Zwecke

---

### 1.8 Andere Interns (Aditya, Ansh, Dhaval, Vivian, Ekaterina, Viktoriya, Rukesh)

**Pain:**
- Wechselnde Tasks ohne klare Owner-Struktur
- Standup ist mündlich, Tracking inkonsistent

**Haupt-Workflow:**
- Pro Department: Eigenes Slice in `team_tasks` (filter by department oder assigned_to_email)
- Weekly Standup: Tasks reviewen, neue setzen
- AcademyView: Weekly Reviews, Learning Log

**Don't-Build für andere Interns:**
- ❌ KEIN Money-Zugriff
- ❌ KEINE strategische Entscheidungs-Authority
- ❌ KEINE komplexen Workflows pro Person — Standard-Templates pro Department
- ✅ JA: AcademyView (Weekly Reviews + Learning Log)
- ✅ JA: Tasks-View (gefiltert auf eigene Tasks)
- ✅ JA: Department-spezifische Sub-Views (Marketing, Support, Analytics)

---

## 2. Globaler Out-of-Scope für Welle 1 (Hiring & Onboarding)

**Was wir bewusst NICHT in Welle 1 anfassen:**

### 2.1 Module out-of-scope
- Modul 3 (Finance) — Luis macht Finance außerhalb des OS, bis es scharf gestellt wird
- Modul 4 (CS) — wartet auf Chatarmin via Sameer
- Modul 5 (Tasks/Briefing) — Bug in daily-briefing ist deferred (Tool nicht aktiv)
- Modul 6 (Marketing) — separater Schwerpunkt nach Finance
- Modul 7 (Creator Program) — separater Schwerpunkt
- Modul 8 (eCommerce) — wartet auf Finance
- Modul 10 (ISO Compliance) — ✅ läuft, kein Build nötig
- Modul 12 (Lead Capture) — minimal aktiv, keine Build-Notwendigkeit
- Modul 13 (Video Generation) — Higgsfield-Domain, außerhalb OS
- Modul 14 (Knowledge Base) — broken view, später entscheiden

### 2.2 Feature-Klassen out-of-scope
- ✅ AI in Welle 1 ERLAUBT für 2 Functions: `analyze-applicant` (manuell on-demand für Mainak/Luis) + `jarvis-chat` (Drawer manuell). Cost ist Noise (~$0.30 worst case). Per Luis-Decision 10.04.
- ❌ KEIN AI-Auto-Trigger / Cron für irgendeine Function
- ❌ KEINE Aktivierung anderer AI-Functions (daily-briefing, analyze-finance-mail, academy-chat, emma-work-plan, generate-briefing) bis Phase 2
- ❌ KEINE n8n-Workflows neu bauen — die 8 existierenden bleiben wie sie sind
- ❌ KEINE neue Edge Functions in Welle 1 (außer regelbasierte für Hiring-Items)
- ❌ KEINE Migration zu Multi-Tenancy
- ❌ KEINE Realtime-Features (WebSockets, Presence, etc.)
- ❌ KEINE neuen externen Integrationen (außer was in 13 Items definiert ist)
- ❌ KEINE Mobile-App
- ❌ KEINE komplexe Berechtigungen-Engine
- ❌ KEIN Public Marketing-Site / Landing-Page Refactor (außer Logo-Bug + LinkedIn-404)

### 2.3 Strategische Entscheidungen out-of-scope
- ❌ KEIN Pricing-Modell festlegen (kommt erst Layer 2)
- ❌ KEIN ICP-Brainstorming (kommt erst Layer 2)
- ❌ KEINE Marketing-Strategie für externe Kunden
- ❌ KEINE Demo-Calls / Sales-Pitches

---

## 3. Welle-1-Scope (was wir DOCH bauen)

**14 Items aus den Hiring SOP Pain Points + 3 Bug-Fixes + Foundation-Cleanup:**

| # | Item | Modul | Owner-Action |
|---|---|---|---|
| 1 | Stage-Cleanup (Code + DB) | Hiring | Luis Code |
| 2 | 72h Auto-Reject Verifikation | Hiring | Luis Read |
| 3 | LinkedIn 404 Bug | Hiring | Luis Code |
| 4 | Logo Display Bug | Hiring | Luis Code |
| 5 | Send-Button + Email-Template Wiring | Hiring | Luis Code, Mainak Test |
| 6 | Insights View (Funnel + Conversion) | Hiring | Luis Code |
| 7 | CV Upload + Storage | Hiring | Luis Code + Migration, Mainak Test |
| 8 | Eval Dashboard | Hiring | Luis Code |
| 9 | Academy Aktivierung (Tom-Walkthrough) | Academy | Luis + Tom |
| 10 | Public Landing Audit | Hiring | Luis Read |
| 11 | Notion → Business OS Migration Plan | Hiring | Luis Doc |
| 12 | analyze-applicant Phase-2-Vorbereitung (KEIN Activate) | Hiring | Luis Doc |
| 13 | Paigh Sample-Tracking Konzept | Creator | Luis Doc + Schema-Vorschlag |
| 14 | Tom + Team in team_members anlegen | System | Luis SQL |
| 15 | Notion-Check für Onboarding-Strukturen | Academy | Luis Read via MCP |

---

## 4. Layer-2-Leitlinien (für externe Kunden, später)

**Diese Leitlinien sind constraints für heutige Architektur-Entscheidungen, nicht Marktanalyse.**

### 4.1 White-Label-Constraint
**Regel:** Kein Code-Pfad darf Hart Limes / Brand-Namen / Personen-Namen / Email-Adressen hardcoden. Alles via DB (`brands`, `team_members`, `recruiter_settings`).
**Status:** ✅ teilweise eingehalten. `recruiter_settings` ist parameterisiert, `brands` modular. `BrandContext` (Frontend) ist parameterisiert.
**Welle-1-Test:** Bei jedem Code-Edit fragen: „Funktioniert das auch wenn jemand anders das deployed?"

### 4.2 Multi-Tenancy-Vorbereitung (NICHT Multi-Tenancy bauen)
**Regel:** Schema sollte tenant-isolierbar sein. Konkret: jede Tabelle könnte bei Bedarf eine `tenant_id` Spalte bekommen ohne Refactoring.
**Status:** Aktuell single-tenant (alle Tabellen ohne tenant_id). Future-proof: keine cross-tabel JOINs auf assumptions die nur für 1 Tenant gelten.
**Welle-1-Constraint:** Neue Tabellen werden so designed, dass sie später eine `tenant_id` UNIQUE constraint ergänzen können, ohne Daten zu zerstören.

### 4.3 Pricing-Constraint (vorausschauend)
**Layer 2 Tier-Range (per `system/products/architecture.md`):**
- Tier 1 Modul: €800-1500 Setup + €300-400/mo
- Tier 2 Full Stack: €4500 Setup + €900/mo
- Tier 3 Managed: €2500-5000/mo

**Konsequenz für heutige Architektur:**
- AI-Cost pro Kunde muss messbar sein → Edge Functions sollten Cost-Tracking einbauen können (Outcome für Doc D Measurement)
- Onboarding muss im 4-Wochen-Frame passen → kein hochkomplexes Setup pro Kunde, sondern Self-Service-konfigurable Defaults
- Modul-Auswahl muss möglich sein → Tier 1 = einzelne Module aktiviertbar, nicht alles oder nichts → Architektur muss Modul-Toggling unterstützen (zukünftiger Schritt, nicht jetzt)

### 4.4 Unit Economics-Constraint
**Wenn Layer 2 startet:** Ein Kunde darf nicht mehr Anthropic-Tokens kosten als sein Tier-Preis trägt. Konkret:
- Tier 1 €350/mo → max €100/mo Anthropic
- Tier 2 €900/mo → max €250/mo
- Tier 3 €3500/mo → max €1000/mo

**Konsequenz für heutige AI-Architektur:**
- Edge Functions die Anthropic aufrufen müssen Cost pro Aufruf tracken können → siehe Doc C (AI Strategy)
- Default-Modell für Phase 2 = `claude-haiku-4-5` (Cost-Faktor ~10 vs Sonnet, ~100 vs Opus)
- Premium-AI-Calls (Sonnet/Opus) nur on-demand mit Approval

### 4.5 ICP-Constraint (vorausschauend)
**Zielkunden Layer 2 (per `system/products/architecture.md`):**
- DTC Single-Brand €500K-€3M
- Multi-Shop-Owner 2-4 Stores
- Brand Aggregator 5+ Brands

**Konsequenz für heutige Architektur:**
- Hart Limes (7 Brands) ist der „Brand Aggregator"-Use-Case → unser eigenes Setup ist die Referenz
- Single-Brand-Kunden müssen mit dem System klarkommen → keine Hard-Coded „Multi-Brand-Pflicht"-Logiken
- Welle-1-Test: Bei jedem View-Edit fragen: „Funktioniert das auch wenn jemand nur 1 Brand hat?"

---

## 5. Activation Triggers für Layer 2

Diese Doc beschreibt internal-first. Layer 2 (extern) startet NICHT bevor die folgenden Conditions gleichzeitig erfüllt sind:

| Trigger | Aktueller Status | Ziel |
|---|---|---|
| Hart Limes nutzt OS produktiv ohne Drift | 🔴 noch nicht | Tool aktiv im Daily-Loop von Luis + Tom + Mainak |
| Mindestens 1 Modul ohne Luis-Eingreifen 4 Wochen autonom | 🔴 noch nicht | z. B. Tom managed Onboarding ohne Luis |
| Quality-Standard Code (TS strict, zod, error handling) | 🟡 partial | Doc F definiert, dann durchgesetzt |
| Measurement Layer mit Outcome-KPIs | 🔴 noch nicht | Doc D + Item-Build |
| Closed Feedback Loop läuft 4 Wochen ohne Skipping | 🔴 noch nicht | Doc 7 + Wave-Reviews |
| Peter-Gespräch über Ownership / Ownership-Klarheit Code vs Daten vs Produkt | 🔴 noch nicht | per `project_business_os_vision.md` |
| Firmen-API für Anthropic statt Luis-Personal-Tokens | 🔴 noch nicht | per `feedback_business_os_phasing.md` |
| 1 Pilot-Kunde-Anfrage (inbound oder outbound geprüft) | 🔴 noch nicht | Layer-1 Personal Brand muss erst laufen |

**Mind. 6 von 8 grün → Layer 2 Sales-Phase. Aktuell: 0 von 8.**

---

## 6. Decision (per Luis-Regel: Doc endet in Entscheidung)

**Was diese Doc festlegt:**

1. **Mission:** Internal-first, Single-Owner, iterativ, Phase-getrennt, Layer-2-prepared aber nicht Layer-2-driven.

2. **Per-Rolle Don't-Build:** 7 Personen-Rollen mit klaren No-Gos. Tom darf KEIN tägliches Dashboard. Mainak darf KEIN Marketing-Direkt-Send. Vanessa darf KEIN Schreib-Zugriff auf Money. Peter darf KEIN täglicher Login. Etc.

3. **Out-of-Scope für Welle 1:** 10 von 14 Modulen sind out-of-scope. Nur Hiring + Academy + System + minimaler Fokus auf andere.

4. **Layer-2-Constraints:** White-Label, Multi-Tenancy-vorbereitet, Cost-trackable, ICP-flexibel. Diese constraints gelten ab heute für jede Architektur-Entscheidung — auch wenn Layer 2 noch nicht gestartet ist.

5. **Activation Triggers für Layer 2:** 8 Conditions, aktuell 0 von 8. Solange das so ist: kein Sales, kein Pitch, kein externes Pricing-Doc.

6. **Welle-1-Items final festgelegt:** 15 Items (siehe §3). Jedes Item hat einen Owner-Action-Eintrag. Reihenfolge wird in Doc D (Measurement) und Doc 7 (Loop) konkretisiert.

---

## 7. Offene Fragen (NICHT blocking, für spätere Verfeinerung)

1. **Tom's tatsächliche Daily-Routine:** Was macht er heute KONKRET täglich? Ich habe nur Memory-basiertes Bild. Ein 30-min-Walkthrough mit Tom (in Welle 1, Item 9) wird das klären.

2. **Mainak's Asana vs OS:** Wie viel von seiner Arbeit ist heute in Asana vs OS? Welche Migrations-Schritte sind realistisch? → Item 11 (Notion → OS Migration Plan) deckt teilweise.

3. **Peter's tatsächlicher Bedarf:** Will Peter wirklich Briefings? Oder reicht WhatsApp-Updates mit Luis? Klären beim nächsten Peter-Gespräch.

4. **Was passiert bei Tom-Krankheit / Urlaub:** Single-Person-Failure-Mode für Tom = jemand muss Onboarding/CS-Triage übernehmen. Aktuell: Sameer als Backup? Oder Luis steigt direkt ein? → Trigger für Layer 2 §5 ist „4 Wochen ohne Luis-Eingreifen" — Krankheit zählt da rein.

5. **Welche Hiring-Items werden GEBUNDLED:** 15 Items in einer Welle ist viel. Sollen wir Sub-Wellen machen? z. B. Welle 1a = Foundation + Quick-Wins (4 Items), Welle 1b = Workflow-Items (7 Items), Welle 1c = Strategie/Doku (4 Items). Wird in Doc D + Doc 7 finalisiert.

---

**Nächster Schritt:** Doc F (Dev Guidelines) — Code-Constraints die für alle Welle-1-Items gelten. Standalone, braucht keine weitere Klärung.

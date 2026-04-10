# 07 — Closed Feedback Loop & Cadence

**Last updated:** 2026-04-10
**Stand:** Welle 0 (Foundation Setup) — finale Doc
**Verwendung:** Wie wir bauen, messen, entscheiden, lernen. Pflicht-Pre-Read vor jedem Build-Item.

---

## 0. Grund-Prinzip

**Der Loop ist Pflicht, nicht Empfehlung.** Per `feedback_closed_feedback_loop.md`.

Ohne festen Cadence-Punkt entsteht kein Learning-System — nur Doku. Diese Doc bindet Doc B (Architecture), Doc E (Ownership), Doc A (Charter), Doc F (Dev Guidelines), Doc C (AI Strategy), Doc D (Measurement) zusammen in einen lauffähigen Prozess.

**Failure-Mode den wir verhindern:** „Wir bauen, deployen, vergessen zu reviewen, bauen das nächste Ding — und haben keine Idee was funktioniert hat."

---

## 1. Der Loop in 7 Schritten

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  1. BUILD ITEM definieren                                   │
│     ↓                                                       │
│  2. KPI VORHER festlegen (Outcome + Operational)           │
│     ↓                                                       │
│  3. DEPLOY (Code + Migration + Doc-Update)                  │
│     ↓                                                       │
│  4. TRACK in os_metrics                                     │
│     ↓                                                       │
│  5. ITEM REVIEW nach 48-72h                                 │
│     ↓                                                       │
│  6. DECISION: Scale | Iterate | Kill                        │
│     ↓                                                       │
│  7. WRITE TO MEMORY (feedback_*.md oder project_*.md)       │
│     ↓                                                       │
│  └──→ nächstes Item ←─────────────────────────────────────  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Keine Schritte überspringen.** „Ich vergesse Schritt 5 mal" = Item zählt als „suspended", nicht als „erfolgreich".

---

## 2. Schritt 1 — Build Item definieren

**Format pro Item:**

```markdown
## Welle X.Y — Item Z: <kurze Beschreibung>

**Modul:** <Modul-Name aus Doc B>
**Owner-Action (Build):** <Wer baut — Luis / Mainak / Tom / extern>
**Owner-Action (Test):** <Wer testet>
**Owner-Action (Review):** Luis (default per Doc E)
**Files:**
  - <konkrete Dateien die geändert werden>
**Migration:** <Migration-Datei-Name oder "keine">
**Effort:** <30 min / 2h / 1d>
**Welle-Scope:** <was IST drin / was IST NICHT drin>
**Dependencies:** <welche anderen Items müssen erst fertig sein>
```

**Wo lebt das:** Pro Welle gibt es eine `welle-X-plan.md` Datei in `docs/welle/welle-X/` (NICHT in foundation/, das hier ist nur die Vorlage).

**Pflicht-Check vor Schritt 2:**
- ✅ Item ist max 1 Tag Build-Effort
- ✅ Owner ist namentlich genannt (kein „TBD")
- ✅ Welle-Scope ist explizit (auch das NICHT-Drin)
- ✅ Dependencies sind aufgelöst (oder als Blocker markiert)

---

## 3. Schritt 2 — KPI VORHER festlegen

**Pflicht:** Jedes Item bekommt **mindestens 1 Outcome-KPI** und **mindestens 1 Operational-KPI** vor Build.

**Format:**

```markdown
### KPIs für Item Z

**Outcome (per Rolle, manuell erfasst):**
- Metric: `<metric_name>`
- Rolle: `<luis | tom | mainak | etc>`
- Baseline: `<aktueller Wert vor Build>`
- Target: `<Ziel-Wert nach Build>`
- Decision-Schwelle:
  - ≥80% Target erreicht → Scale
  - 50-79% → Iterate
  - <50% → Kill

**Operational (auto via track-event Helper):**
- Metric: `<metric_name>`
- Erwartung: `<Mindestnutzung pro Woche>`
- Decision-Schwelle:
  - ≥Erwartung → Feature wird genutzt
  - <50% → Feature wird ignoriert → Kill
```

**Pflicht-Check:**
- ✅ Outcome-Metric ist messbar (nicht „besser fühlen")
- ✅ Baseline ist als Zahl erfasst (manuell oder via DB-Query)
- ✅ Target ist konkret (z. B. „<1 Stunde", nicht „weniger Zeit")
- ✅ Decision-Schwellen sind vorher definiert (verhindert post-hoc Schönreden)

**Wenn ein KPI nicht definierbar ist** → Item ist zu vage, zurück zu Schritt 1.

---

## 4. Schritt 3 — Deploy

**Per Doc F (Dev Guidelines) §7:**

1. Code-Edit / Migration-Datei schreiben
2. Lokal `npm run lint` (muss grün sein)
3. Vor Migration: `mcp__supabase__apply_migration` oder Supabase Dashboard
4. Verify via Stichprobe-Query
5. Doc-Update wenn Migration neue Module/Spalten einführt

**Logging:** Jeder Deploy-Schritt landet in `data/logs/YYYY-MM-DD-welle-X-item-Z.md` mit Format:
- Was wurde gemacht
- Welche Files
- Welche Migration
- Stichprobe-Test-Ergebnis
- Open Issues

**Per `feedback_session_logging_enforcement.md`:** Logging ist Pflicht, nicht optional.

---

## 5. Schritt 4 — Track in os_metrics

**Per Doc D (Measurement Layer):**

### 5.1 Operational Tracking (auto)

Wenn das Item ein Frontend-Feature ist, wird via `lib/track-event.ts` Helper automatisch gemessen:

```tsx
import { trackOperationalMetric } from '@/lib/track-event';

useEffect(() => {
  trackOperationalMetric('insights_view_opened', 'hiring');
}, []);
```

### 5.2 Outcome Tracking (manuell)

Bei Item-Deploy: ein Eintrag in os_metrics als Baseline:
```sql
INSERT INTO os_metrics (metric_layer, metric_name, module, role, value, unit, source, item_ref, notes)
VALUES (
  'outcome',
  'mainak_hiring_screenings_per_week',
  'hiring',
  'mainak',
  0,
  'count',
  'manual',
  'welle_1_item_5',
  'baseline before send-button + email-template wiring'
);
```

48-72h nach Deploy: erneut messen, neuer Eintrag mit aktualisiertem Wert.

---

## 6. Schritt 5 — Item Review (Feature-Frequency-basiert, nicht Kalender-fix)

**Kritische Korrektur per Reviewer-Audit 10.04.:** Eine 48-72h-Fix-Cadence ist für einen Solo-Operator inkompatibel mit User-Features. Mainak nutzt Send-Button maximal 5×/Woche — nach 48h gibt es noch kein Signal.

### Item-Klassifikation (NEU)

Jedes Item bekommt eine **Item-Class** im Brief (Schritt 1):

| Class | Definition | Review-Cadence |
|---|---|---|
| **Foundation/Bug** | Backend-Fixes, Migrations, Bugfixes, Code-Cleanup. Luis testet selbst. | **48-72h** nach Deploy |
| **Daily-Use Feature** | User-Feature das täglich genutzt wird (z. B. Action Center) | **3-5 Tage** nach Deploy |
| **Weekly-Use Feature** | User-Feature das wöchentlich genutzt wird (z. B. Send-Button, Insights View) | **End-of-Wave Review** (kein dedicated Item Review) |
| **Monthly-Use Feature** | User-Feature das monatlich genutzt wird (z. B. Reporting) | **30 Tage** nach Deploy |

**Folgen:**
- Bug/Foundation-Items: schnelle 48h-Reviews, Luis kann 5-7 Items/Woche durchziehen
- Weekly-Features: keine Item-Reviews während der Welle. Nur Wave Review am Ende. Mainak hat Zeit das Feature 5-10× zu benutzen, dann gibt es Signal.

### Wie Reviewen

**Wer:** Luis (default Reviewer per Doc E).

1. Outcome-Metrik aus os_metrics abrufen:
   ```sql
   SELECT * FROM os_metrics
   WHERE item_ref = 'welle_1_item_5'
   ORDER BY captured_at DESC;
   ```

2. Mit Baseline + Target vergleichen.

3. Operational-Metrik prüfen:
   ```sql
   SELECT metric_name, COUNT(*), MAX(captured_at)
   FROM os_metrics
   WHERE module = 'hiring' AND metric_layer = 'operational' AND captured_at > NOW() - INTERVAL '7 days'
   GROUP BY metric_name;
   ```

4. **Frage stellen:** „Erfüllt das Item den Zweck, mit messbarem Beweis?"

5. **Eine von 3 Decisions treffen** (nicht „weiterbeobachten"):

   - **Scale** → Feature ist erfolgreich, ausbauen oder als done abhaken
   - **Iterate** → knapp am Target vorbei, eine konkrete Anpassung
   - **Kill** → deutlich am Target vorbei oder Operational-Metric zeigt Nicht-Nutzung → Feature zurückbauen

**Anti-Pattern:** „Wir gucken nochmal in 1 Woche." Nein. Decision JETZT, danach erst neuer Loop. AUSSER die Item-Class fordert es (Weekly = Wave Review = einzige Reviewing-Gelegenheit).

---

## 7. Schritt 6 — Decision (Scale / Iterate / Kill)

### 7.1 Scale

**Bedeutung:** Feature funktioniert wie geplant, nächste Ausbau-Stufe.

**Konsequenzen:**
- Item gilt als done
- KPI-Erfolg in `data/logs/` dokumentiert
- Nächstes Item in der Welle starten
- Lessons in Memory schreiben (Schritt 7)

### 7.2 Iterate

**Bedeutung:** Feature ist nahe am Target, eine konkrete Anpassung kann es retten.

**Pflicht:**
- **Konkrete Anpassung** definieren (nicht „verbessern")
- Zeitfenster: **eine Iteration, max 1 weiteres Item-Cycle (48-72h)**
- Nach Iteration: erneut Schritt 5 → Decision
- Wenn nach 2 Iterations immer noch nicht Target → automatisch Kill

**Anti-Pattern:** Endlos-Iterations. Max 2 Versuche.

### 7.3 Kill

**Bedeutung:** Feature funktioniert nicht, wird zurückgebaut.

**Pflicht:**
- **Frontend-Trigger entfernen** (Button hidden, Tab versteckt)
- **Edge Function deployed lassen** (kein DB-Schema-Cleanup, kein Code-Delete)
- **DB-Spalten bleiben** für historische Daten
- **Memory-Eintrag schreiben:** Was nicht funktioniert hat, warum, was wir gelernt haben
- **Item-Ref in os_metrics markieren** als „killed_at: YYYY-MM-DD"

**Warum nicht löschen:** Reversibilität. In 6 Monaten wissen wir vielleicht, wie es funktioniert hätte. Code-Delete kostet, Code-Hide nicht.

---

## 8. Schritt 7 — Write to Memory

**Pflicht:** Lessons aus jedem Item-Review landen in einer der Memory-Dateien.

**Wo:**
- `feedback_*.md` für allgemeine Verhaltensregeln (z. B. „bei AI-Aktivierung immer erst Cost-Schätzung")
- `project_*.md` für projekt-spezifisches Wissen (z. B. „Mainak nutzt Send-Button 5x/Woche")
- `data/logs/YYYY-MM-DD-welle-X-item-Z-review.md` für Review-Detail

**Format Memory-Eintrag (kurz):**

```markdown
---
name: <descriptive>
description: <one-liner>
type: feedback | project | reference
---

<Lesson in 1-3 Sätzen>

**Why:** <konkreter Auslöser, Datum, Item-Ref>

**How to apply:** <wann/wo greift diese Lesson in Zukunft>
```

**Pflicht-Check Schritt 7:**
- ✅ Memory-Eintrag existiert (auch bei Scale, nicht nur bei Kill)
- ✅ MEMORY.md ist updated mit Verweis auf neue Datei

---

## 9. Cadence-Fixpunkte (REDUZIERT auf 3 per Reviewer-Audit + Luis-Decision 10.04.)

**Vorher:** 5 Cadences (Item Review fix 48-72h + Wave + Sunday + Monthly + Weekly OS Mo). Reviewer: „mind. 2 davon werden in 3 Wochen geskippt".

**Jetzt:** **3 Cadences**, mit Option zur weiteren Reduktion auf 2 (Sunday + Wave) wenn Luis merkt dass Item Review zu schwer ist.

### 9.1 Item Review (Feature-Frequency-basiert)

**Wann:** Nach Item-Class:
- Foundation/Bug → 48-72h nach Deploy
- Daily-Use → 3-5 Tage
- Weekly-Use → KEIN Item Review, geht in Wave Review
- Monthly-Use → 30 Tage

**Wer:** Luis
**Format:** Schritt 5 + 6 + 7 wie oben
**Dauer:** 15-30 Min pro Item
**Logging:** `data/logs/YYYY-MM-DD-welle-X-item-Z-review.md`

### 9.2 Wave Review

**Wann:** Nach Abschluss aller Items einer Welle
**Wer:** Luis (allein) oder Luis + Tom/Mainak (für deren Items)
**Format:** Doc D (Measurement) §5 — Wave Review Template
**Dauer:** 60 Min
**Logging:** `data/logs/YYYY-MM-DD-welle-X-review.md`
**Output:**
- Zusammenfassung aller Item-Decisions (inkl. Weekly-Use Items die kein Item Review hatten)
- Outcome-Metric-Summary mit Delta
- Lessons (gehen in Memory)
- Plan für nächste Welle

### 9.3 Sonntags-Snapshot (manuelle Outcome-KPIs)

**Wann:** Jeden Sonntag, ~15 Min (nicht 30)
**Wer:** Luis
**Wie:** Per `os_metrics` Insert für jede Outcome-Metric einen aktuellen Wert
**Logging:** `data/logs/YYYY-MM-DD-sunday-snapshot.md`
**Warum:** Damit Outcome-KPIs nicht im Vakuum sind, sondern eine kontinuierliche Linie

### 9.4 ENTFERNT — Monatlicher Strategie-Review

**Begründung Reviewer:** Redundant mit Wave Review (welche etwa monatlich stattfindet). Layer-2-Trigger-Check kann in Wave Review mit aufgenommen werden.

### 9.5 ENTFERNT — Weekly OS Review (Mo aus CLAUDE.md)

**Begründung Reviewer:** Redundant mit Sunday Snapshot. Doppelter Cost.

### 9.6 Fallback-Option (Option A) — wenn 3 Cadences immer noch zu viel

Wenn Luis nach 4 Wochen merkt dass Item Reviews systematisch geskippt werden, **fallback auf 2 Cadences:**
- Wave Review (nach jeder Welle)
- Sunday Snapshot (wöchentlich)
- KEIN dedicated Item Review (alle Items werden in Wave Review reviewed)

**Trigger für Fallback:** ≥30% der Item Reviews wurden ausgelassen über 4 Wochen.

---

## 10. Was passiert wenn Cadence ausfällt? (SOFT WARNING, kein HARD BLOCK)

**Reviewer-Korrektur 10.04.:** Hard-Block bei verpassten Reviews ist kontraproduktiv für Solo-Operator. Wird zu Guilt-Spiral oder ignoriert → erodiert die ganze Loop-Disziplin. Soft Warning + Tracking ist robuster.

### 10.1 Item Review fällt aus

**Was passiert (NEU):**
- Cron Edge Function `os-metrics-stale-review-check` (siehe §14 Item D4) detektiert das täglich
- Schreibt Notification in `notifications` Tabelle
- Optional Telegram-Push wenn konfiguriert
- Item bleibt im Status `pending_review`, **blockiert NICHT die nächsten Items**
- Bei nächstem Wave Review: alle pending_review-Items werden zusammen reviewt

**Warum nicht „weiter blocken":** Realismus. Luis muss arbeiten, Reviews stapeln sich, hard block würde alles stoppen. Stattdessen: tracken + erinnern, im Wave Review nachholen.

### 10.2 Wave Review fällt aus

**Konsequenz:**
- Notification + nächste Welle wird **stark abgeraten** (aber nicht hard-blocked)
- Foundation-Doc-Update bleibt aus → Drift-Risiko-Warning in Sunday Snapshot

### 10.3 Sonntags-Snapshot fällt aus

**Konsequenz:**
- Lücke in os_metrics-Verlauf (akzeptabel max 2 Wochen)
- Bei 3+ Wochen Lücke: Cron-Notification „Tool ist nicht mehr im Daily-Loop"
- Trigger für Cadence-Fallback (siehe §9.6)

---

## 11. Ausnahmen vom Loop

### 11.1 Quick Fixes (<30 min, kein Code)

**Beispiele:**
- Typo-Fix in Frontend
- Memory-Eintrag schreiben
- Doc-Verlinkung korrigieren

**Loop:** Nicht erforderlich. Direkter Fix, kurzer Log-Eintrag, fertig.

### 11.2 P0 Bugs (Production Down)

**Beispiel:** Edge Function wirft 500-Error für alle User.

**Loop:** Aufgehoben. Sofort fixen, Post-Mortem-Doc danach (statt Item Review).

### 11.3 Foundation-Doc-Updates

**Beispiel:** Diese 7 Foundation-Docs werden geupdated weil neue Erkenntnis dazukam.

**Loop:** Light-version. Schritt 1 (Was wird geändert), Schritt 3 (Edit), Schritt 7 (Memory), kein Item-Review.

---

## 12. Konkrete Welle-1-Anwendung

### 12.1 Welle-1-Items aus Doc A §3 → Loop-Format

**Item 5 (Beispiel) — Send-Button + Email-Template Wiring**

```markdown
## Welle 1 — Item 5: Send-Button + Email-Template Wiring

**Modul:** Hiring (Modul 1)
**Owner-Action (Build):** Luis (Code in ApplicantDetailView.tsx + send-email Edge Function)
**Owner-Action (Test):** Mainak (testet via echtem Bewerber)
**Owner-Action (Review):** Luis
**Files:**
  - components/admin/ApplicantDetailView.tsx
  - supabase/functions/send-email/index.ts (existiert, evtl. anpassen)
**Migration:** keine
**Effort:** ~2h
**Welle-Scope (drin):** Button, der ein Email-Template auswählen lässt + via send-email Edge Function aufruft + applications.stage updated
**Welle-Scope (nicht drin):** Resend Domain Verification, neue Templates, Localization
**Dependencies:** Resend Domain "manueller Workaround" reicht (Luis-Antwort 10.04.)

### KPIs

**Outcome (per Rolle, manuell):**
- Metric: `mainak_time_per_application_email_seconds`
- Rolle: mainak
- Baseline: ~300s (5 min, manuell mailto + copy-paste)
- Target: <30s (button click + prefilled template)
- Schwellen:
  - ≥80% (Wert ≤60s) → Scale
  - 50-79% → Iterate
  - <50% (>150s) → Kill

**Operational (auto):**
- Metric: `send_button_clicks_per_week`
- Erwartung: ≥5/Woche (Mainak verarbeitet ~5 Bewerber/Woche)
- Schwelle: <3/Woche → Kill
```

### 12.2 Welle-1-Reihenfolge

**Vorschlag (auf Basis Dependencies):**

1. **Item 14** — Tom + Team in team_members anlegen (Foundation für Auth)
2. **Item D1+D2** — os_metrics + track-event Helper (Foundation für Tracking)
3. **Item D3** — Outcome-Baselines setzen
4. **Item 1** — Stage-Cleanup (bereinigt Funnel)
5. **Item 2** — 72h Auto-Reject Verifikation (Pre-Req für Item 5)
6. **Item 3 + 4** — LinkedIn 404 + Logo Bug (Quick Wins, kein Risk)
7. **Item 5** — Send-Button + Email-Template (Mainak benutzt täglich)
8. **Item 6** — Insights View (Luis benutzt wöchentlich)
9. **Item 7** — CV Upload (kleinerer Mehrwert, kann später)
10. **Item 8** — Eval Dashboard (braucht Daten aus 6+7)
11. **Item 15** — Notion-Check (vor Item 9 wegen möglicher Konflikte)
12. **Item 9** — Academy Aktivierung (Tom-Walkthrough)
13. **Item 10** — Public Landing Audit
14. **Item 11** — Notion → OS Migration Plan (Doc-Item)
15. **Item 12** — analyze-applicant Phase-2-Vorbereitung (Doc + UI-Hook)
16. **Item 13** — Paigh Sample-Tracking Konzept (Doc + Schema-Vorschlag)

**Geschätzter Welle-1-Effort gesamt:** 3-4 Tage Build + 1 Tag Reviews + 1 Tag Wave Review = ~1 Woche.

---

## 13. Decision (per Luis-Regel: Doc endet in Entscheidung)

**Was diese Doc festlegt:**

1. **Loop ist Pflicht** für jedes nicht-triviale Item: Build → KPI → Deploy → Track → Review (48-72h) → Decision → Memory.
2. **KPIs werden VOR dem Build** definiert. Kein Post-hoc Schönreden.
3. **Decision ist eine von 3:** Scale / Iterate / Kill. „Weiterbeobachten" ist verboten.
4. **Cadence-Fixpunkte sind hart:** Item Review 48-72h, Wave Review nach Welle-Ende, Sonntags-Snapshot wöchentlich, Strategie-Review monatlich.
5. **Cadence-Ausfall hat Konsequenz:** Item-Status wird auf „suspended" gesetzt, nächste Items werden gestoppt bis Review nachgeholt ist.
6. **Quick Fixes + P0 Bugs sind Ausnahmen** vom Loop, dürfen direkt gefixt werden.
7. **Welle-1-Reihenfolge** ist in §12 vorgeschlagen (16 Items, Dependencies-orientiert).
8. **Ein Item-Review-Template** in Doc-Form muss existieren. Wird in `docs/welle/_template/item-review-template.md` angelegt (NICHT Welle 1, später).
9. **Wave-Review-Template** ist in Doc D §5 definiert.

---

## 14. Welle-1-Items, die hier festgelegt werden

Diese ergänzen die 13 Hiring-Items aus Doc A:

| # | Item | Effort |
|---|---|---|
| **D1** | os_metrics Tabelle anlegen (Migration) | 30 min |
| **D2** | `lib/track-event.ts` Helper bauen | 30 min |
| **D3** | Outcome-Baselines für Luis, Tom, Mainak manuell setzen | 15 min |
| **L1** | `docs/welle/welle-1-plan.md` schreiben mit allen 16 Items im Loop-Format | 90 min |
| **L2** | Erstes Item-Review-Template anlegen (`docs/welle/_template/item-review-template.md`) | 15 min |

**Total Foundation-zu-Welle-1-Bridge:** ~3h Setup-Arbeit, dann kann Welle 1 starten.

---

## 15. Offene Fragen (NICHT blocking)

1. **Cadence-Reminders:** Wie erinnert sich Luis an Item Reviews? Cron + Telegram-Push? Manuell? → Welle 2 oder später.
2. **Wave Review mit Tom/Mainak:** Sollen sie eingeladen werden für deren Items oder reicht Async-Update? → Klären in Welle 1 wenn akut.
3. **Wave-Review-Cadence-Granularität:** Sollen Wave-Reviews wirklich pro Welle (~1 Woche) oder besser alle 2 Wochen?
4. **Sonntags-Snapshot Automatisierung:** Kann das per Cron Edge Function teilautomatisiert werden, sodass Luis nur die manuellen Outcome-Werte eintragen muss?

---

**Foundation komplett. Bereit für Welle 1.**

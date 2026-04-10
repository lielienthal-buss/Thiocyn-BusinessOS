# 06 — Measurement Layer

**Last updated:** 2026-04-10
**Stand:** Welle 0 (Foundation Setup)
**Verwendung:** Wie wir messen, ob das OS funktioniert. Pro Welle / Item / Modul: KPIs vorher festlegen, dann tracken, dann entscheiden.

---

## 0. Grund-Prinzip

**Storage ist trivial. Semantik ist load-bearing.** Per `feedback_two_level_metrics.md`.

**Zwei Ebenen:**
1. **Operational Metrics** (pro Feature) — „Wird das Feature genutzt? Läuft es technisch?"
2. **Outcome Metrics** (pro Rolle) — „Erfüllt das Tool seine Mission für diese Person?"

**Operational allein = blind** („wird oft geklickt, hilft niemandem").
**Outcome allein = nicht diagnostizierbar** („Tom ist langsamer, aber warum?").

→ **Wir brauchen beide.**

---

## 1. Ist das `os_metrics` separat oder Teil von `brand_metrics`?

**Verifikation aus Doc B:**

`brand_metrics` (existiert, 6 Rows):
- Inhalt: Brand-Performance (Revenue, ROAS, Ad-Spend, Conversions pro Brand)
- Owner: Modul 9 Brand Management
- Schreiber: vermutlich `sync-shopify-sales`, `sync-ad-performance`
- Reader: HomeView, BrandKPIsTab, etc.

**os_metrics (geplant, neu):**
- Inhalt: OS-Health + Operator-Outcomes (Luis-Stunden gespart, Tom-Throughput, Time-to-Hire)
- Owner: Modul 11 System / Meta
- Schreiber: Frontend-Events + halb-manuelle Erfassung in Reviews
- Reader: neue View `OSHealthTab` oder eingebettet in HomeView

**Inhalt überlappt nicht.** Brand-KPIs sind Business-Performance, OS-Metrics sind Operator-Outcomes. Sie beantworten verschiedene Fragen:
- brand_metrics → „Wie läuft das Geschäft?"
- os_metrics → „Hilft das System dem Operator?"

**Decision:** **`os_metrics` ist eigenständige Tabelle.** Dashboard surfaced beide nebeneinander.

---

## 2. os_metrics Schema (REDUZIERT auf 8 Spalten per Reviewer-Audit 10.04.)

**Vorher:** 11 Spalten + 5 Indexes. Reviewer: „Über-engineered für Welle 1, period_start/end + baseline + source kann später dazu wenn nötig."

**Jetzt:** 8 Spalten, 3 Indexes. Phase-1-tauglich, erweitbar.

```sql
-- Migration: YYYYMMDD_os_metrics.sql

CREATE TABLE IF NOT EXISTS public.os_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Klassifikation
  metric_layer TEXT NOT NULL CHECK (metric_layer IN ('operational', 'outcome')),
  metric_name TEXT NOT NULL,           -- z.B. 'time_to_hire_days', 'luis_hours_per_week_on_hiring'
  module TEXT NOT NULL,                -- z.B. 'hiring', 'academy', 'finance'
  role TEXT,                           -- nullable für operational, required für outcome

  -- Wert
  value NUMERIC NOT NULL,
  unit TEXT,                           -- z.B. 'hours', 'days', 'count', 'percent', 'usd'

  -- Kontext (minimal)
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  item_ref TEXT,                       -- Welle/Item (z.B. 'welle_1_item_5')
  notes TEXT                           -- optional kontext
);

-- Indexes (3 statt 5)
CREATE INDEX idx_os_metrics_module ON os_metrics(module);
CREATE INDEX idx_os_metrics_layer_role ON os_metrics(metric_layer, role);
CREATE INDEX idx_os_metrics_captured ON os_metrics(captured_at DESC);

-- RLS (Phase-1-Default, separate Policies pro Operation per Doc F §5.2 Fix)
ALTER TABLE os_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "os_metrics_read" ON os_metrics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "os_metrics_insert" ON os_metrics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Update + Delete bewusst weggelassen — Metrics sind append-only
-- Wer eine falsche Metric hat, schreibt eine neue Korrektur-Zeile

COMMENT ON TABLE os_metrics IS
'OS Health + Operator Outcomes. Zwei Ebenen: operational (pro Feature) + outcome (pro Rolle).
Append-only — keine Updates, keine Deletes. Per docs/foundation/06-measurement.md.';
```

**Was wegfiel + Begründung:**
- `period_start`, `period_end` → für Welle 1 nicht nötig, captured_at + item_ref reichen. Kann in Welle 2+ via `ALTER TABLE ADD COLUMN` ergänzt werden ohne Daten-Verlust.
- `baseline` → wird stattdessen als separate Zeile mit `notes='baseline'` gespeichert. Cleaner, kein Doppel-Spalten-Pattern.
- `source` → kann als prefix in `notes` ('manual:...' / 'auto:...') stehen, wenn nötig.
- Update + Delete Policies → bewusst weggelassen, Metrics sind append-only. Korrekturen via neue Zeile.

---

## 3. Welle-1 Outcome-KPIs (pro Rolle)

Diese sind die ersten Outcome-Metriken, die wir nach Welle 1 erfassen wollen. **Manuelle Erfassung** in Wave Review (kein Auto-Tracking nötig in Welle 1).

### 3.1 Luis (Owner)

| Metric | Unit | Baseline | Ziel Welle 1 | Source |
|---|---|---|---|---|
| `luis_hours_per_week_on_hiring_admin` | hours | ~3 (geschätzt) | <1 (Mainak/Tom übernehmen via OS) | manual |
| `luis_hours_per_week_on_finance_admin` | hours | ~5 (geschätzt) | unverändert (out-of-scope Welle 1) | manual |
| `luis_hours_per_week_on_intern_onboarding` | hours | ~2 (geschätzt) | <1 (Tom autonomer) | manual |
| `luis_decisions_pending_inbox_count` | count | unbekannt | ≤5 am Wochenende | auto via team_tasks |

### 3.2 Tom (Onboarding Lead)

| Metric | Unit | Baseline | Ziel Welle 1 | Source |
|---|---|---|---|---|
| `tom_onboarding_actions_per_week` | count | 0 (Tabellen leer) | ≥5 (Welle-1-Item 9 Aktivierung) | auto via intern_onboarding_checklist + intern_weekly_reviews |
| `tom_cs_tickets_resolved_per_week` | count | unbekannt | Baseline messen, dann Verbesserung | auto via support_tickets |
| `tom_tasks_completed_per_week` | count | ~4 (aktuell zugewiesen) | Baseline + Trend | auto via team_tasks |
| `tom_login_frequency_per_week` | count | 1 (Login seit 09.04.) | ≥5 nach Welle 1 | auto via auth.users |

### 3.3 Mainak (Marketing / Creator)

| Metric | Unit | Baseline | Ziel Welle 1 | Source |
|---|---|---|---|---|
| `mainak_hiring_screenings_per_week` | count | unbekannt | ≥5 nach Send-Button-Wiring (Item 5) | auto via application_notes oder ai_analysis |
| `mainak_creator_pipeline_updates_per_week` | count | 0 (Tabellen leer) | Baseline messen wenn Creator-Modul reaktiviert | n/a Welle 1 |

### 3.4 Vanessa (Sparring)

Out-of-Scope für Welle 1 (Finance-Modul kommt später).

### 3.5 Aggregat-OS-Health

| Metric | Unit | Baseline | Ziel Welle 1 | Source |
|---|---|---|---|---|
| `time_to_hire_days_avg` | days | unbekannt (alte Daten unvollständig) | Baseline messen, dann Verbesserung | computed: avg(decided_at - created_at) WHERE stage='hired' |
| `applications_processed_per_week` | count | ~10 (geschätzt) | Trend | auto via applications |
| `interns_active_count` | count | 10 | stabil oder +1 | auto via intern_accounts |
| `os_login_unique_users_per_week` | count | 1 (nur Luis) | ≥3 (Luis, Tom, Mainak) | auto via auth.users |

---

## 4. Welle-1 Operational Metriken (pro Feature)

Diese werden **automatisch** durch Frontend-Events erfasst, sobald Welle-1-Items deployed sind.

| Feature | Metric | Source |
|---|---|---|
| ApplicationListView | view_open_count | useEffect on mount |
| ApplicantDetailView | view_open_count | useEffect on mount |
| Send-Button (Item 5) | clicks_per_template | onClick handler |
| Eval Dashboard (Item 8) | view_open_count + time_on_view | useEffect + setInterval |
| CV Upload (Item 7) | uploads_attempted, uploads_succeeded | onSuccess/onError handler |
| Insights View (Item 6) | view_open_count, filter_changes | onClick |
| AcademyView | weekly_review_writes_per_week | onSave handler |
| Onboarding Checklist | items_checked_per_week | onCheckboxToggle handler |

**Implementation:** Helper-Function in `lib/track-event.ts` (✅ APPLIED 2026-04-10 Welle 1 Item D2).

Aktuelle Signatur (8-col Schema, kein `source`-Feld — wurde in Patch P7 gestrichen, Convention: `notes` Prefix `auto:` / `manual:` / `baseline:` / `review:`):

```typescript
// lib/track-event.ts (excerpt — see actual file for full types + outcome variant)
import { supabase } from './supabaseClient';

export async function trackOperationalMetric(
  metricName: string,
  module: MetricModule,
  options: { value?: number; unit?: string; itemRef?: string; notes?: string } = {}
): Promise<void> {
  const { value = 1, unit = 'count', itemRef, notes } = options;
  try {
    const { error } = await supabase.from('os_metrics').insert({
      metric_layer: 'operational',
      metric_name: metricName,
      module,
      role: null,
      value,
      unit,
      item_ref: itemRef ?? null,
      notes: notes ? `auto:${notes}` : 'auto',
    });
    if (error) console.error('[track-event] operational insert failed:', error.message);
  } catch (err) {
    console.error('[track-event] operational threw:', err);
  }
}
```

Aufruf in Components:
```tsx
import { trackOperationalMetric } from '@/lib/track-event';

useEffect(() => {
  void trackOperationalMetric('application_list_view_opened', 'hiring');
}, []);
```

**Pendant `trackOutcomeMetric(metricName, module, role, value, options)`** existiert für manuelle Outcome-Captures (Sunday Snapshot, Wave Review).

**Risk:** Hochfrequente Events (jeder Klick) könnten os_metrics aufblähen. Gegenmaßnahme: nur „bedeutsame" Events tracken (View Open, Save, Submit), nicht jeder Hover.

---

## 5. Wave Review Template

Nach jeder Welle wird ein **Wave Review** geschrieben (per Doc 7 — Feedback Loop). Format:

```markdown
# Wave Review — Welle X (YYYY-MM-DD)

## Items in Welle
[Liste aller Items mit Status: completed / iterated / killed / deferred]

## Outcome-Metriken (manuell + auto)
| Rolle | Metric | Vor | Nach | Delta | Decision |
|---|---|---|---|---|---|
| Luis | hours_per_week_on_hiring_admin | 3 | 1 | -2 | Scale (Aktivierung weiter) |
| Tom | onboarding_actions_per_week | 0 | 8 | +8 | Scale |
| ... | ... | ... | ... | ... | ... |

## Operational-Metriken (automatisch)
[Aggregierte Counts pro Feature, sortiert nach Nutzung]

## Lessons (gehen in Memory)
- Was funktionierte
- Was funktionierte nicht
- Welche Annahme war falsch

## Next Wave
- Welche Items
- Welche Owner-Verschiebungen
- Welche AI-Functions evtl. Phase-2-aktivierbar
```

---

## 6. Where lives das Dashboard für os_metrics?

**Decision:** Neue View `OSHealthTab.tsx` als Sub-Tab im HomeView (Command Center).

**Inhalt:**
- Section 1: Per-Rolle Outcome-KPIs (Luis-Stunden, Tom-Throughput, etc.) als Cards
- Section 2: Aggregat-OS-Health (Time-to-Hire, Applications/Woche, Active Interns)
- Section 3: Operational-Drilldown (welche Features werden genutzt) — Tabellen-Style

**Welle-1-Item:** Nicht jetzt bauen. Erst os_metrics-Tabelle anlegen, Daten sammeln, in Welle 2 die View bauen wenn Daten existieren.

---

## 7. Self-Learning-Loop Integration

Per `feedback_closed_feedback_loop.md`:

```
1. Build Item
   ↓ (KPI vorher festlegen)
2. Define KPI VORHER
   ↓ (in os_metrics als baseline einfügen)
3. Deploy
   ↓
4. Track in os_metrics
   ↓ (auto via Frontend-Events + manual via Review)
5. Item Review nach 48-72h
   ↓ (KPI vs Baseline vergleichen)
6. Decision: Scale / Iterate / Kill
   ↓ (in Memory schreiben als feedback_*.md)
7. Write to Memory
```

**Konkret pro Welle-1-Item:**
1. Vor Build: KPI-Eintrag in os_metrics als `metric_layer='outcome'` mit `value=baseline, source='manual'`
2. Nach Deploy: 48h warten, dann erneut messen
3. Bei Review: Decision treffen, Memory-Datei schreiben

---

## 8. Decision (per Luis-Regel: Doc endet in Entscheidung)

**Was diese Doc festlegt:**

1. **`os_metrics` ist eigenständige Tabelle** (NICHT mit `brand_metrics` kombiniert).
2. **Schema festgelegt** (siehe §2). 11 Spalten, RLS Phase-1-konform.
3. **Welle-1 Outcome-KPIs definiert** (siehe §3): 4 für Luis, 4 für Tom, 2 für Mainak, 4 Aggregat. Vanessa out-of-scope.
4. **Operational-Tracking via `trackOperationalMetric` Helper** in `lib/track-event.ts` — nur „bedeutsame" Events.
5. **`OSHealthTab` View ist NICHT Welle-1-Build.** Erst os_metrics-Tabelle + Daten, dann View in Welle 2.
6. **Wave Review Template** definiert.
7. **Closed Feedback Loop integriert** mit os_metrics als Storage-Layer.

**Welle-1-Items, die hier festgelegt werden:**
- **Item D1:** os_metrics Tabelle anlegen (Migration `YYYYMMDD_os_metrics.sql`)
- **Item D2:** `lib/track-event.ts` Helper bauen
- **Item D3:** Outcome-Baseline für Luis, Tom, Mainak per manuellem Eintrag in os_metrics setzen (Beispiel: `INSERT ... metric_name='luis_hours_per_week_on_hiring_admin', value=3, source='manual', notes='estimated baseline before Welle 1'`)

---

## 9. Offene Fragen (NICHT blocking)

1. **Baseline-Werte für Luis-Stunden:** Sind die geschätzten 3h Hiring + 5h Finance + 2h Onboarding pro Woche realistisch, oder soll Luis das vor Welle 1 messen (z. B. 1 Woche tracken)?
2. **Tom-Login-Tracking:** Wird das via Supabase Auth `last_sign_in_at` gemacht oder müssen wir eigene Logging-Logic bauen?
3. **`OSHealthTab` Position:** Sub-Tab im HomeView oder eigene View im Dashboard-Menü?
4. **Wave-Review-Cadence:** Nach jedem Item (48-72h) oder nach gesamter Welle? → Wird in Doc 7 entschieden.

---

**Nächster Schritt:** Doc 7 (Loop Process) — Closed Feedback Loop mit Cadence-Fixpunkten als finale Foundation.

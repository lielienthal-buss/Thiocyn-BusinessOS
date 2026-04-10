# 04 — Dev Guidelines

**Last updated:** 2026-04-10
**Stand:** Welle 0 (Foundation Setup)
**Verwendung:** Constraints für jeden Code-Edit. Vor jedem Pull Request / Edit lesen. Bei Unsicherheit: Conservative-Default.

---

## 0. Grund-Prinzip

**Constraints sind Multiplikatoren.** Klare Regeln machen AI-assisted Development präziser, nicht bürokratisch. Wenn Claude Code keine Constraints hat, halluziniert es Architektur.

---

## 1. TypeScript Constraints

### 1.1 IST-Zustand (Live verifiziert)

**`tsconfig.json` aktuell:**
- `strict`: ❌ NICHT gesetzt
- `noImplicitAny`: ❌ NICHT gesetzt
- `strictNullChecks`: ❌ NICHT gesetzt
- `noUncheckedIndexedAccess`: ❌ NICHT gesetzt
- `target`: ES2022 ✅
- `moduleResolution`: bundler ✅
- `jsx`: react-jsx ✅
- `paths`: `@/*` Aliasing ✅
- `allowJs`: true (vermutlich Legacy)

**`eslint.config.js` aktuell:**
- `@typescript-eslint/no-explicit-any`: warn (nicht error)
- `@typescript-eslint/no-unused-vars`: warn

**Diagnose:** TypeScript läuft permissiv. Code funktioniert, aber Type-Safety ist niedrig. `any`-Types schleichen sich ein, Null-Checks fehlen, Index-Access ist unsicher. Das ist tolerierbar für Solo-Dev mit AI-Assist, aber **bei Skalierung Layer 2** wird es teuer.

### 1.2 Regel für Welle 1

**Default für neue Files:** Strict-konform schreiben, auch wenn `tsconfig.json` es nicht erzwingt:
- ✅ Explizite Types für alle Function-Parameter + Returns
- ✅ Explizite Types für alle State-Hooks (`useState<Type>(...)`)
- ✅ Null-Check vor Property-Access
- ❌ KEIN `any` außer in `// @ts-expect-error TODO: ...` Notfällen
- ❌ KEIN unbewachtes `obj[key]` ohne Null-Check
- ✅ Type-Guards statt Type-Assertions wo möglich
- ✅ Discriminated Unions für State-Variants

### 1.3 tsconfig.json Härtung — Backlog

**NICHT in Welle 1 (nicht-blocking, aber notiert):**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Warum nicht jetzt:** Würde existierende Files brechen → großes Refactor. Wird in einer eigenen Welle gemacht (z. B. „Welle TS-Strict") nach Hiring-Welle.

---

## 2. React Component Patterns

### 2.1 Component Structure

```tsx
// 1. Imports (sortiert: external → internal → types)
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ApplicationStage } from '@/types';

// 2. Types / Interfaces
interface Props {
  applicationId: string;
  onUpdate?: (id: string) => void;
}

interface State {
  loading: boolean;
  data: ApplicationData | null;
  error: string | null;
}

// 3. Constants (oben, vor Component)
const PAGE_SIZE = 15;
const STAGE_LABELS: Record<ApplicationStage, string> = { /* ... */ };

// 4. Sub-Components / Helpers (lokal, klein, ohne State)
const StatusBadge: React.FC<{ status: string }> = ({ status }) => /* ... */;

// 5. Main Component
const MyView: React.FC<Props> = ({ applicationId, onUpdate }) => {
  // a) Hooks (in Reihenfolge: useState → useEffect → useCallback → custom)
  const [state, setState] = useState<State>({ loading: true, data: null, error: null });

  // b) Effects
  useEffect(() => { /* ... */ }, [applicationId]);

  // c) Handlers
  const handleSave = async () => { /* ... */ };

  // d) Early Returns (loading, error, empty)
  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState message={state.error} />;
  if (!state.data) return <EmptyState />;

  // e) Main JSX
  return ( /* ... */ );
};

export default MyView;
```

### 2.2 State Management

**Regel:** Lokaler State first. Context nur wenn 3+ Komponenten dasselbe brauchen.

| Use Case | Pattern |
|---|---|
| Form-Daten | `useState<FormData>(initialState)` |
| Loading/Error/Data | Discriminated Union via `useState<State>` |
| Geteilte Brand-Auswahl | `BrandContext` (existiert bereits) |
| Auth-Session | Supabase Auth Listener in Layout-Component |
| Komplexe Forms | Bei >5 Felder: extrahiere in Custom Hook |

**Anti-Pattern:** Globale Stores (Redux, Zustand) — wir haben aktuell keine, brauchen wir nicht für Welle 1.

### 2.3 Data Fetching

**Default:** Custom Hook `useSupabaseQuery` (existiert in `lib/useSupabaseQuery.ts`).

```tsx
const { data, loading, error, refetch } = useSupabaseQuery(() =>
  supabase.from('applications').select('*').order('created_at', { ascending: false })
);
```

**Anti-Pattern:**
- `useEffect` mit direktem Supabase-Call ohne Cleanup
- Direkter Supabase-Aufruf in Render
- Mehrere parallele Fetches die nicht via `Promise.all` koordiniert sind

---

## 3. Naming Conventions

### 3.1 Files & Folders

| Element | Convention | Beispiel |
|---|---|---|
| React Components | PascalCase, `.tsx` | `ApplicationListView.tsx` |
| Hooks | camelCase mit `use` Prefix, `.ts` | `useSupabaseQuery.ts` |
| Utilities / Helpers | camelCase, `.ts` | `formatDate.ts` |
| Types | PascalCase, `.ts` (oder `types/index.ts`) | `Application`, `ApplicationStage` |
| Constants | UPPER_SNAKE_CASE in Datei, lowercase Datei | `PAGE_SIZE`, `STAGE_LABELS` |
| Folders (`components/`, `lib/`) | lowercase | `components/admin/finance/` |
| Sub-Modul-Folders | lowercase | `creator/`, `analytics/` |

### 3.2 Database

| Element | Convention | Beispiel |
|---|---|---|
| Tabellen | snake_case, plural | `applications`, `intern_accounts`, `team_members` |
| Spalten | snake_case | `created_at`, `full_name`, `assigned_to_email` |
| Foreign Keys | `<referenced_table_singular>_id` | `intern_id`, `application_id`, `auth_user_id` |
| Boolean | positive Form, kein `is_not_*` | `is_active`, `captcha_verified`, `datev_exported` |
| Timestamps | `_at` Suffix | `created_at`, `updated_at`, `task_sent_at` |
| Status Enums | snake_case Strings, CHECK constraint | `status TEXT CHECK (status IN ('open','resolved'))` |
| RLS Policies | `<table>_<action>_<role>` | `disputes_read_authenticated`, `finance_inbox_write_service_role` |

### 3.3 Edge Functions

| Element | Convention | Beispiel |
|---|---|---|
| Function Slug | kebab-case, verb-object | `analyze-applicant`, `hire-candidate`, `sync-paypal-disputes` |
| Function Folder | kebab-case in `supabase/functions/<slug>/` | `supabase/functions/analyze-applicant/index.ts` |
| Shared Code | `_shared/` Prefix | `_shared/config.ts` |
| Env Vars | UPPER_SNAKE_CASE | `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |

---

## 4. Edge Function Standards

### 4.1 Pflicht-Pattern für jede neue Edge Function

**Template:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 1. CORS Headers (immer dabei)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 2. Input Schema (in Welle 1: TypeScript Interface, später: zod)
interface RequestPayload {
  application_id: string;
  department: string;
}

serve(async (req) => {
  // 3. CORS Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 4. Input Parsing + Validation
    const payload: RequestPayload = await req.json();
    if (!payload.application_id || !payload.department) {
      return new Response(
        JSON.stringify({ error: 'application_id and department are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Supabase Client (mit Service Role für Server-Side Ops)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 6. Business Logic
    const { data, error } = await supabase.from('applications').select('*').eq('id', payload.application_id).single();
    if (error) throw error;

    // 7. Response
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    // 8. Error Handling — IMMER mit corsHeaders
    console.error('Function error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 4.2 Pflichten

| # | Regel | Warum |
|---|---|---|
| 1 | **Input Validation** vor jeder Logic | Verhindert kryptische Errors bei fehlenden Feldern |
| 2 | **CORS Headers** in JEDER Response (auch Errors) | Sonst ist Frontend-Fehler kryptisch |
| 3 | **Try/Catch** wraped die Main-Logic | Nie unhandled Promise rejection |
| 4 | **`console.error` bei Errors** | Logs in Supabase Edge Function Logs verwendbar |
| 5 | **Service Role Client** für Server-Side Ops | Bypasses RLS, Function muss selbst auth-checken wenn nötig |
| 6 | **`Deno.env.get('X')!` Non-Null Assert** nur für Pflicht-Vars | Fail loud, nicht silent |
| 7 | **`verify_jwt: true` in `_metadata.json`** für UI-Trigger Functions | User-Auth Pflicht |
| 8 | **`verify_jwt: false`** nur für Cron / Webhook / Public | Mit eigener Auth-Logik |

### 4.3 zod-Validation (Welle 2 — nicht jetzt)

**Geplant für Welle 2 (nicht Welle 1):**
```typescript
import { z } from 'https://esm.sh/zod@3';

const RequestSchema = z.object({
  application_id: z.string().uuid(),
  department: z.enum(['marketing', 'support', 'finance', 'analytics', 'recruiting', 'ecommerce']),
});

const payload = RequestSchema.parse(await req.json()); // wirft bei invalid
```

**Warum erst Welle 2:** Welle 1 ist Foundation + Hiring-Items. Edge Function Refactor kommt nach.

---

## 5. Database Standards

### 5.1 Migrationen

**Datei-Naming:** `YYYYMMDD_descriptive_name.sql` in `supabase/migrations/`
- Beispiel: `20260411_team_members_cleanup.sql`

**Inhalt:**
- Idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT ... ON CONFLICT DO NOTHING`)
- Mit Comments für Spalten + Tabellen-Zwecke
- RLS aktivieren via `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- Policies separat definieren mit klarem Namens-Schema
- Indexes für Foreign Keys + häufig gefilterten Spalten

### 5.2 RLS Policies (Welle-1-Default)

Aktueller Standard ist `auth.role() = 'authenticated'` für alles. Das ist Phase-1-konform (Single-Owner), aber **nicht Layer-2-konform**.

**Welle-1-Default für neue Tabellen** (PostgreSQL erfordert pro Operation eine eigene Policy — Multi-Operation-Syntax ist invalid):

```sql
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Read: alle authenticated Users (Phase 1)
CREATE POLICY "new_table_read" ON new_table
  FOR SELECT USING (auth.role() = 'authenticated');

-- Write Insert
CREATE POLICY "new_table_insert" ON new_table
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Write Update
CREATE POLICY "new_table_update" ON new_table
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Write Delete
CREATE POLICY "new_table_delete" ON new_table
  FOR DELETE USING (auth.role() = 'authenticated');
```

**Reviewer-Korrektur 10.04.:** Vorherige Doc-Version hatte `FOR INSERT, UPDATE, DELETE WITH CHECK (...)` — das ist invalid PostgreSQL Syntax. Jede Operation braucht eine eigene Policy.

**Welle 2 Pattern (nicht jetzt):**
```sql
-- Section-gated via team_members.allowed_sections
CREATE POLICY "new_table_read_section" ON new_table
  FOR SELECT USING (
    'finance' = ANY(
      SELECT allowed_sections FROM team_members
      WHERE auth_user_id = auth.uid() AND status = 'active'
    )
  );
```

### 5.3 Banking / Money Tables

**Pflicht:** Tabellen mit Money-/Banking-/Payment-Bezug bekommen STRENGERE RLS, auch in Phase 1:

```sql
-- Beispiel: integration_secrets ist bereits korrekt
ALTER TABLE integration_secrets ENABLE ROW LEVEL SECURITY;

-- KEINE direkte Authenticated-Policy
-- Read NUR via service_role (Edge Function)
CREATE POLICY "integration_secrets_service_only" ON integration_secrets
  FOR ALL USING (auth.role() = 'service_role');
```

**Verboten:** `auth.role() = 'authenticated'` Read auf Banking-Tabellen.

### 5.4 Source-of-Truth-Regel

Per Doc B (Architecture) §1:
- Eine Tabelle ist genau eine Kategorie (SoT / Derived / Cache / Linking / Empty / Config)
- **Doppel-Writes verboten** — wenn `derived_view` aus `sot_table` berechnet wird, darf NIEMAND direkt in `derived_view` schreiben außer der Berechnungs-Function

---

## 6. Frontend → DB Access Rules

### 6.1 Direct DB Access from UI

**Erlaubt (lesend):**
- ✅ Direkte Supabase-Reads aus React-Components für ihre eigenen Daten
- ✅ Via `useSupabaseQuery` Hook bevorzugt

**Erlaubt (schreibend, beschränkt):**
- ✅ Updates auf vom User direkt manipulierten Records (z. B. Notes, Status-Toggle)
- ✅ Inserts in Single-Record-Forms (z. B. AddInternModal)

**Verboten:**
- ❌ Bulk-Updates / Bulk-Deletes ohne Confirm-Modal
- ❌ Updates auf Tabellen mit Money-/Banking-Bezug
- ❌ Direkter Schreib-Zugriff auf Cache-Tabellen (z. B. `daily_briefings`, `brand_metrics`)
- ❌ Cross-Table Inserts die eigentlich eine Edge Function sein sollten

**Faustregel:** Wenn der Schreib-Vorgang **mehr als 1 Tabelle** betrifft oder **externe Side-Effects** hat (Email-Versand, Auth-User-Create), gehört es in eine **Edge Function**.

### 6.2 Edge Function Trigger from UI

```tsx
// Standard-Pattern für Edge Function Aufruf aus UI
const handleHire = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke('hire-candidate', {
      body: { application_id: applicantId, department: selectedDept },
    });
    if (error) throw error;
    onSuccess(data);
  } catch (err) {
    setError(String(err));
  } finally {
    setLoading(false);
  }
};
```

---

## 7. Branch & Deployment Strategie

### 7.1 IST-Zustand

**Aktuell:** Repo wird vermutlich direkt auf `main` gepushed (kein PR-Workflow für Single-Maintainer). Vercel deployed automatisch auf Push.

### 7.2 Welle-1-Regel

**Default für Welle 1:** Direkter Push auf `main` ist akzeptabel, ABER:
- ✅ Vor jedem Push: lokaler Build + Lint (`npm run lint`)
- ✅ Bei größeren Items (z. B. CV Upload, Insights View): Feature-Branch + manueller Merge
- ✅ Bei Migration: separate Migration-Datei in `supabase/migrations/` mit Datum
- ❌ KEIN `--force` Push
- ❌ KEINE Schema-Migrations ohne Doc-Update

### 7.3 Migration Apply

**Schritte:**
1. Migration-Datei schreiben (`supabase/migrations/YYYYMMDD_name.sql`)
2. Lokal mit `supabase db diff` checken (oder: vor Apply Doc-Review)
3. Apply via `mcp__supabase__apply_migration` oder Supabase Dashboard
4. Verify via `mcp__supabase__list_tables` + Stichprobe-Query
5. Doc-Update wenn Migration neue Module/Spalten einführt

**Niemals:** `mcp__supabase__execute_sql` für DDL — nutze immer `apply_migration` damit es im Migration-Log steht.

---

## 8. Error Handling Patterns

### 8.1 Frontend

```tsx
// Standard Error State Pattern
const [error, setError] = useState<string | null>(null);

// In handler
try {
  await someOp();
} catch (err) {
  console.error('Operation failed:', err);
  setError(err instanceof Error ? err.message : 'Unknown error');
  toast.error('Operation failed'); // wenn sonner verfügbar
}

// In Render
{error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
```

### 8.2 Edge Function

Siehe §4.1 Template — try/catch wraped die Main-Logic, gibt strukturiertes JSON zurück, loggt via console.error.

### 8.3 User-Facing Error Messages

| Layer | User sieht | Console hat |
|---|---|---|
| Bekannter Fehler (Validation, 404) | Klare Message: „Bewerber nicht gefunden" | Original-Error-Detail |
| Unbekannter Fehler | Generisch: „Fehler — bitte erneut versuchen" | Stack Trace |
| Network Timeout | „Verbindungsfehler — bitte erneut" | Network-Detail |

---

## 9. Security Constraints

### 9.1 Credentials

**Pflicht:**
- ❌ NIE Credentials im Code (auch nicht commented out)
- ❌ NIE `.env`-Datei in git
- ✅ `.env.local` für Vite (nur Build-Time, nicht Runtime)
- ✅ Supabase Edge Function Secrets via `Deno.env.get()`
- ✅ DB-Storage für API-Keys: `integration_secrets` Tabelle (service-role-only RLS)

### 9.2 User Input

**Pflicht:**
- ✅ Captcha auf Public Forms (`captcha_verified` Spalte exists)
- ✅ RLS Policy für Anonymous Inserts (siehe `applications` V2 Pattern)
- ✅ Sanitization: Supabase-Client escaped Parameter automatisch — keine String-Concatenation

### 9.3 PII / GDPR

**Sensibel:** `applications.*` enthält Bewerber-PII (Name, Email, Telefon, Motivation, LinkedIn, ggf. CV).

**Regeln:**
- ✅ DSGVO-Lösch-Mechanismus muss existieren (per `architecture-decisions.md`: 30-Tage-Auto-Delete für rejected applications)
- ❌ KEINE PII in console.log, Logs, oder Edge Function Responses
- ❌ KEIN PII-Export ohne explizite User-Aktion

---

## 10. AI-Code Constraints (Phase 1)

Per `feedback_business_os_phasing.md`:

**Phase 1 Default:**
- ✅ Edge Functions die `ANTHROPIC_API_KEY` brauchen sind deployment-ready, aktivierungs-pausiert
- ✅ Frontend-Triggers für AI-Functions können existieren, sind aber mit „Phase 2"-Label markiert oder hidden
- ❌ KEIN proaktives AI-Aufruf in Daily-Loops (Cron-Triggered AI ist OFF)
- ❌ KEINE AI-Aktivierung ohne explizites Activation-Trigger-Doc (siehe Doc C — AI Strategy)

**Welle-1-Test:** Bei jedem Code-Edit fragen: „Würde das eine AI-Funktion aktiv aufrufen ohne dass Luis es bestellt hat?" → Wenn ja, abbrechen, in Doc C lockern oder anders bauen.

---

## 11. Kommentare & Doku im Code

**Regel:** Code soll selbst-erklärend sein. Kommentare nur für:
- ✅ Warum (nicht was) — wenn Logic kontraintuitiv ist
- ✅ TODO mit Datum + Owner: `// TODO 2026-04-15 (Luis): refactor to use ...`
- ✅ Sicherheits-Anmerkungen
- ❌ Trivial-Kommentare (`// loop through items`)
- ❌ Outdated Kommentare die mit Code nicht mehr matchen

---

## 12. Decision (per Luis-Regel: Doc endet in Entscheidung)

**Was diese Doc festlegt:**

1. **TypeScript Strict ist Welle-2-Backlog**, nicht Welle 1. Aber: Neue Files werden strict-konform geschrieben, auch ohne tsconfig-Erzwingung.
2. **React Pattern festgelegt:** Component-Struktur, State-Management, Data-Fetching via `useSupabaseQuery`.
3. **Naming Conventions hart:** snake_case in DB, PascalCase in Components, kebab-case in Edge Function Slugs.
4. **Edge Function Pflicht-Pattern:** CORS, Input Validation, Try/Catch, console.error, Service Role.
5. **zod-Validation = Welle 2**, nicht jetzt. Welle 1 nutzt TypeScript Interfaces.
6. **Frontend → DB Access:** lesend ja (via Hook), schreibend nur Single-Record. Multi-Table / External-Side-Effect = Edge Function Pflicht.
7. **Money-Tables haben strengere RLS** als Default-Tables (service_role only).
8. **Migration via `apply_migration`**, nicht `execute_sql`.
9. **AI-Code-Constraint:** Phase-1-Default ist „deployed but not invoked".

---

## 12.5 Backup, Disaster Recovery, Secret Rotation, Migration Rollback (NEU per Reviewer-Audit 10.04.)

### 12.5.1 Backup / Disaster Recovery

**Aktuell:**
- Supabase Free/Pro hat **automatisierte Daily Backups** (7 Tage Retention auf Pro, 30 Tage auf Team)
- Hart Limes nutzt aktuell vermutlich Pro Tier — verifizieren

**RTO (Recovery Time Objective):** 4 Stunden — bei totalem Project-Loss kann eine Restore von Backup + Frontend-Re-Deploy in 4h passieren

**RPO (Recovery Point Objective):** 24 Stunden — max 1 Tag Daten-Verlust akzeptabel

**Pflicht für Welle 1:**
- ✅ Verifizieren dass Supabase Backups aktiv sind (Dashboard → Settings → Backups)
- ✅ Eine Backup-Restore-Probe in Welle 2 oder 3 (NICHT Welle 1, aber Item für nächste Welle)
- ✅ Frontend-Code in `Thiocyn-BusinessOS` Repo — wenn nicht in git, hat keinen Backup → siehe §7 git-Init

### 12.5.2 Secret Rotation

**Welche Secrets:**
- `ANTHROPIC_API_KEY` (in Edge Function Env Vars)
- `RESEND_API_KEY` (in Edge Function Env Vars)
- `SUPABASE_SERVICE_ROLE_KEY` (intern)
- PayPal Credentials in `integration_secrets` Tabelle
- Shopify-Keys (wenn angebunden)

**Pflicht-Cadence:**
- **Welle 1:** Jährlich rotieren (manuell via Dashboards)
- **Welle 2+:** Bei Verdacht auf Leak sofort
- **Bei Personal-Wechsel** (z. B. wenn Vanessa-Anteil endet): alle Credentials in `integration_secrets` reviewen

**Nicht-Pflicht in Welle 1:** Automatisches Rotation-System

### 12.5.3 Migration Rollback

**Aktuell:** Migrations sind idempotent (CREATE IF NOT EXISTS), aber nicht reversibel. Eine fehlerhafte Migration kann nicht via `npm run rollback` zurückgenommen werden.

**Pflicht für Welle 1:**
- ✅ Jede Migration-Datei hat einen Comment mit Manual-Rollback-SQL
- Beispiel:
  ```sql
  -- Migration: 20260411_team_members_cleanup.sql
  -- ROLLBACK: DELETE FROM team_members WHERE invited_by = 'system' AND created_at > '2026-04-10';
  INSERT INTO team_members (...) VALUES (...);
  ```
- ✅ Bei jeder Migration: erst lokal/Branch testen, dann Production
- ✅ Bei größeren Migrationen: Supabase Branch nutzen (`mcp__supabase__create_branch`)

**Nicht-Pflicht in Welle 1:** Versionierte Migration Tool (wie Prisma Migrate, Flyway)

---

## 13. Backlog (für spätere Verfeinerung)

**Nicht-blocking, aber notiert:**

1. `tsconfig.json` Härtung (strict, noUncheckedIndexedAccess) → Welle TS-Strict
2. zod-Validation für alle Edge Functions → Welle 2
3. Migration zu Sektion-gated RLS via `team_members.allowed_sections` → Welle 2
4. CI/CD Pipeline: Lint + Build + Test bei jedem PR (aktuell manuell)
5. Test-Setup (Vitest oder Playwright) — aktuell keine Tests im Repo
6. Architecture Decision Records (ADR) Format-Update — `docs/architecture-decisions.md` ist V2, neue ADRs für 2026 fehlen
7. Monorepo-Tooling falls Layer 2 mehrere Frontends braucht (aktuell single-repo)
8. Storybook für UI-Components (für Mainak/Tom als Demo)

---

**Nächster Schritt:** Doc C (AI Strategy) — Pro AI-Function: Activation Trigger + Kill Criteria + Fallback.

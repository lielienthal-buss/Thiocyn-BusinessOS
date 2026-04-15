# Marketing Hub — Campaign Ops Plan

**Status:** Draft
**Owner:** Luis
**Stakeholder:** Matic (CMO), Agenturen (extern)
**Stand:** 2026-04-15
**Aufwand:** ~2–3 Tage Phase 1 + 2–3 Tage Phase 2

---

## Ziel

Marketing Hub von **Read-Dashboard → operatives Tool** ausbauen, in dem Matic (Fractional CMO) cross-brand Kampagnen mit Agenturen plant, brieft, approved und misst — ohne Trello/Sheets parallel.

**Nicht-Ziel:** Creative Production, Asset Management, Video-Gen (extern via Higgsfield/Editor-Workflow).

---

## Nutzer-Rollen

| Rolle | Scope | Rechte |
|---|---|---|
| `admin` (Luis) | alle Brands, alles | CRUD + User-Management |
| `cmo` (Matic) | alle Brands, Marketing only | Campaigns CRUD, Approval, Comments, KPIs read |
| `agency_external` | zugewiesene Brand(s) + eigene Agentur-ID | Campaigns read eigener Rows, Comments CRUD, Assets upload, **kein** Finance/ISO/HR |
| `brand_manager` (später) | eine Brand | Campaigns read + Comments |

---

## Datenmodell

### Neue Tabellen

```sql
-- Haupt-Tabelle: ersetzt flache ad_campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL REFERENCES brands(id),
  name TEXT NOT NULL,
  objective TEXT,                    -- awareness | conversion | retention | launch
  platform TEXT NOT NULL,            -- meta | google | tiktok | cross
  status TEXT NOT NULL DEFAULT 'draft',
  -- draft → brief_review → approved → live → paused → completed → killed
  budget_planned NUMERIC(10,2),
  budget_spent NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  owner_id UUID REFERENCES team_members(id),      -- CMO = Matic
  agency_id UUID REFERENCES agencies(id),          -- nullable für intern
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  allowed_brands TEXT[],             -- Whitelist Brands
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Best-practice brief schema (industry standard: IAB + agency-side creative briefs)
CREATE TABLE campaign_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  -- Strategic
  objective TEXT,                    -- primary goal (1 verb + 1 metric)
  target_audience TEXT,              -- demo + psycho + behavioral
  insight TEXT,                      -- customer truth the campaign leverages
  key_message TEXT,                  -- single-minded proposition
  angle TEXT,                        -- hook / narrative approach
  offer TEXT,                        -- what the customer gets
  -- Operational
  kpi_target JSONB,                  -- {roas: 2.5, cpa: 15, ctr: 1.5}
  budget NUMERIC(10,2),
  timeline_start DATE,
  timeline_end DATE,
  -- Creative
  creative_requirements JSONB,       -- {format: [...], count: N, dimensions: [...]}
  mandatories TEXT,                  -- brand guidelines, legal, compliance
  dos_and_donts TEXT,
  reference_links TEXT[],            -- inspiration / past winners
  -- Meta
  notes TEXT,
  version INT DEFAULT 1,
  -- Tier-1 approval (campaign-level: strategy + budget locked)
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES team_members(id)
);

-- Tier-2 approval: creative-set level (assets reviewed in batches within live campaign)
CREATE TABLE campaign_creative_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- e.g. "Week 1 UGC batch", "Retargeting V2"
  status TEXT DEFAULT 'draft',       -- draft | review | approved | rejected | live | paused
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES team_members(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES team_members(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assets belong to a creative set (not directly to campaign)
-- → update campaign_assets.campaign_id → creative_set_id (see below)

CREATE TABLE campaign_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  author_id UUID REFERENCES team_members(id),
  author_name TEXT,                  -- Snapshot für gelöschte User
  body TEXT NOT NULL,
  parent_id UUID REFERENCES campaign_comments(id),   -- Threading
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Assets attach to creative sets (tier-2 approval unit), not directly to campaigns
CREATE TABLE campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_set_id UUID REFERENCES campaign_creative_sets(id) ON DELETE CASCADE,
  type TEXT,                         -- video | image | copy | landing_page
  url TEXT NOT NULL,
  label TEXT,
  uploaded_by UUID REFERENCES team_members(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE campaign_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  spend NUMERIC(10,2),
  impressions BIGINT,
  clicks BIGINT,
  conversions INT,
  revenue NUMERIC(10,2),
  roas NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN spend > 0 THEN revenue/spend ELSE 0 END) STORED,
  cpa NUMERIC(10,2) GENERATED ALWAYS AS (CASE WHEN conversions > 0 THEN spend/conversions ELSE 0 END) STORED,
  ctr NUMERIC(5,2) GENERATED ALWAYS AS (CASE WHEN impressions > 0 THEN (clicks::NUMERIC/impressions)*100 ELSE 0 END) STORED,
  source TEXT DEFAULT 'manual',      -- manual | meta_api | google_api
  UNIQUE (campaign_id, snapshot_date)
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES team_members(id),
  table_name TEXT,
  row_id UUID,
  action TEXT,                       -- insert | update | delete | approve
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration von `ad_campaigns`
- Nicht drop — in `campaigns` migrieren (1:1 Mapping), dann `ad_campaigns` als deprecated View auf `campaigns` behalten (AdPerformanceTab läuft weiter bis CampaignView live).

---

## RLS-Policies (Phase 2)

**Grundsatz:** JWT-Claim `role` + `agency_id` + `allowed_brands` — jede Policy prüft diese.

```sql
-- Campaigns: admin/cmo alles, agency nur eigene
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT TO authenticated
USING (
  auth.jwt()->>'role' IN ('admin','cmo')
  OR (auth.jwt()->>'role' = 'agency_external'
      AND agency_id::TEXT = auth.jwt()->>'agency_id'
      AND brand_id = ANY(string_to_array(auth.jwt()->>'allowed_brands',',')))
);

CREATE POLICY "campaigns_modify" ON campaigns FOR ALL TO authenticated
USING (
  auth.jwt()->>'role' IN ('admin','cmo')
  OR (auth.jwt()->>'role' = 'agency_external'
      AND agency_id::TEXT = auth.jwt()->>'agency_id')
);
```

Analog für `campaign_briefs`, `campaign_comments`, `campaign_assets`, `campaign_kpis`.

**Finance/ISO/HR Tabellen:** RLS explizit auf `role IN ('admin','cmo')` restriktieren — agency_external darf nie.

---

## UI — CampaignView (neuer Tab unter Marketing)

### Layout
- **Header:** Brand-Filter, Agency-Filter, Status-Filter, "+ New Campaign"
- **Kanban-Board:** Columns = Status (Draft / Brief Review / Approved / Live / Paused / Done)
  - Card zeigt: Name, Brand-Badge, Agency-Badge, Budget, Tage laufend, ROAS (if live), ungelesene Comments
- **Detail-Drawer** bei Klick:
  - **Tab 1 — Brief:** Goal, Audience, Angle, KPI-Targets, Creative-Refs (Drive-Links), Matic's Notes + Approve-Button
  - **Tab 2 — Comments:** Threaded, mit @mention
  - **Tab 3 — Assets:** Upload-Liste (nur Links, kein Storage — Drive/Frame.io extern)
  - **Tab 4 — Performance:** KPI-Timeline (Sparkline Spend/ROAS/CPA), Manual-Entry-Row

### Approval-Flow
1. Agentur erstellt Draft + fills Brief → Status `brief_review`
2. Matic reviewt → Comment oder Approve → Status `approved`
3. Launch → Status `live` (manuell, später auto bei Meta-Launch)
4. Pause/End → `paused` / `completed`

---

## Matic-Workflow (konkret)

**Täglich (10 Min):**
- Kanban-Check: neue Briefs? (badge)
- Live-Campaigns: ROAS unter Target? (rote Cards)

**Wöchentlich (30 Min):**
- Performance-Review pro Brand
- Budget-Reallocation (Pause/Scale)
- Retro-Comments an Agenturen

**Monatlich:**
- Export für Luis (Brand-Roll-Up ROAS + Spend)

---

## Phasen & Tasks

### Phase 1 — Intern produktiv (2–3 Tage)
- [ ] Migration SQL (7 Tabellen) + Apply auf Thiocyn-BusinessOS Supabase
- [ ] Seed: Matic als `cmo` in `team_members`, 1 Test-Agentur in `agencies`
- [ ] `CampaignView.tsx` Kanban + Drawer (Tabs)
- [ ] Hooks: `useCampaigns`, `useCampaignBrief`, `useCampaignComments`
- [ ] Integration in MarketingView als neuer Sub-Tab
- [ ] Bestehende `ad_campaigns` nach `campaigns` migrieren
- [ ] Matic-Walkthrough + Feedback-Loop

### Phase 2 — Agency Access (2–3 Tage)
- [ ] RLS-Policies aktivieren (alle 7 neuen Tabellen + Finance/ISO/HR restriktieren)
- [ ] JWT Custom Claims via Supabase Auth Hook (role, agency_id, allowed_brands)
- [ ] `/agency` Login-Route (separates minimales Layout, nur CampaignView)
- [ ] Audit-Log Trigger auf campaigns + briefs
- [ ] Agency-Onboarding: Magic Link Invite + AV-Vertrag Template
- [ ] Test: 1 Pilot-Agentur auf 1 Brand

### Phase 3 — Later (nicht jetzt)
- Meta Ads API Auto-Sync (wartet auf Valentin OAuth)
- Google Ads API Sync
- Slack/Email Notifications bei Brief-Review + ROAS-Alert
- KPI-Goal-Auto-Check + Alert wenn unter Target >3 Tage

---

## Best-Practice-Entscheidungen (gesetzt, kein Input nötig)

- **Brief-Template:** IAB-konform + Agency-Standard. Fields: Objective, Target Audience, Insight, Key Message, Angle, Offer, KPI-Targets, Budget, Timeline, Creative Requirements, Mandatories, Do's/Don'ts, Reference Links. Siehe `campaign_briefs` Schema.
- **Approval-Modell:** Zwei-Stufen.
  1. **Tier 1 (Campaign-level):** Strategy + Budget + Brief approved einmal vor Launch → `campaigns.status = approved`.
  2. **Tier 2 (Creative-Set-level):** Assets in Batches einreichbar während Campaign läuft → `campaign_creative_sets.status` (draft → review → approved/rejected → live).
  Warum: Strategy lockt einmal, Creatives iterieren ongoing — Standard bei Performance-Agenturen.

---

## Abhängigkeiten & Risiken

| Item | Status | Impact |
|---|---|---|
| Meta Ads OAuth (Valentin) | 🔴 offen | Performance-Tab bleibt manuell bis unblocked |
| RLS-Migration auf Altbestand | 🟡 | Luis' Admin-Zugriff muss erhalten bleiben (kein Lockout) |
| AV-Vertrag für Agenturen (DSGVO) | 🟡 | Legal-Sign-Off vor Phase 2 Launch |

---

## Verknüpfte Dokumente

- `docs/foundation/01-architecture.md` — RLS-Gaps referenziert
- `project_marketing_strategy.md` (Memory) — Profit-first + Branding-Shift
- `matic-cmo.md` (Memory) — Rolle + Vergütung
- `welle-1-plan.md` — Build-Pattern Referenz

-- Marketing Hub Phase 1 — Campaign Ops Foundation
-- Plan: docs/welle/marketing-hub-campaign-ops-plan.md
-- Stand: 2026-04-15

-- ─── 1. Agencies ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  allowed_brands TEXT[],
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 2. Campaigns (replaces flat ad_campaigns) ──────────────────────────────

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','brief_review','approved','live','paused','completed','killed')),
  budget_planned NUMERIC(10,2),
  budget_spent NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  start_date DATE,
  end_date DATE,
  owner_id UUID,
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_agency ON campaigns(agency_id);

-- ─── 3. Campaign Briefs (IAB-standard) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  -- Strategic
  objective TEXT,
  target_audience TEXT,
  insight TEXT,
  key_message TEXT,
  angle TEXT,
  offer TEXT,
  -- Operational
  kpi_target JSONB DEFAULT '{}',
  budget NUMERIC(10,2),
  timeline_start DATE,
  timeline_end DATE,
  -- Creative
  creative_requirements JSONB DEFAULT '{}',
  mandatories TEXT,
  dos_and_donts TEXT,
  reference_links TEXT[],
  -- Meta
  notes TEXT,
  version INT DEFAULT 1,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_briefs_campaign ON campaign_briefs(campaign_id);

-- ─── 4. Creative Sets (Tier-2 approval unit) ────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_creative_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','review','approved','rejected','live','paused')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_sets_campaign ON campaign_creative_sets(campaign_id);

-- ─── 5. Campaign Assets (attach to creative sets) ───────────────────────────

CREATE TABLE IF NOT EXISTS campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_set_id UUID NOT NULL REFERENCES campaign_creative_sets(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('video','image','copy','landing_page')),
  url TEXT NOT NULL,
  label TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_creative_set ON campaign_assets(creative_set_id);

-- ─── 6. Campaign Comments (threaded) ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  author_id UUID,
  author_name TEXT,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES campaign_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_campaign ON campaign_comments(campaign_id);

-- ─── 7. Campaign KPIs (daily snapshots) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS campaign_kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  spend NUMERIC(10,2),
  impressions BIGINT,
  clicks BIGINT,
  conversions INT,
  revenue NUMERIC(10,2),
  roas NUMERIC GENERATED ALWAYS AS (CASE WHEN spend > 0 THEN revenue/spend ELSE 0 END) STORED,
  cpa NUMERIC GENERATED ALWAYS AS (CASE WHEN conversions > 0 THEN spend/conversions ELSE 0 END) STORED,
  ctr NUMERIC GENERATED ALWAYS AS (CASE WHEN impressions > 0 THEN (clicks::NUMERIC/impressions)*100 ELSE 0 END) STORED,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','meta_api','google_api','tiktok_api')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (campaign_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_kpis_campaign_date ON campaign_kpis(campaign_id, snapshot_date DESC);

-- ─── 8. Audit Log ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  table_name TEXT,
  row_id UUID,
  action TEXT CHECK (action IN ('insert','update','delete','approve','reject')),
  diff JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_table_row ON audit_log(table_name, row_id);

-- ─── 9. Updated-at triggers ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaigns_updated ON campaigns;
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_briefs_updated ON campaign_briefs;
CREATE TRIGGER trg_briefs_updated BEFORE UPDATE ON campaign_briefs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── 10. Migration: ad_campaigns → campaigns ────────────────────────────────
-- Maps old flat rows into new schema. Old table stays (no drop) for AdPerformanceTab compat.

-- Map actual ad_campaigns columns: brand_id, campaign_name, platform ('Meta'/'Google'/'TikTok'/'Amazon'),
-- budget_daily, spend_mtd, status ('active'/'paused'/'ended'), period_start, period_end
INSERT INTO campaigns (id, brand_id, name, platform, status, budget_planned, budget_spent, start_date, end_date, created_at)
SELECT
  id,
  COALESCE(brand_id, 'unknown'),
  COALESCE(campaign_name, 'Untitled'),
  LOWER(platform),
  CASE
    WHEN status = 'active' THEN 'live'
    WHEN status = 'paused' THEN 'paused'
    WHEN status = 'ended'  THEN 'completed'
    ELSE 'draft'
  END,
  budget_daily,
  spend_mtd,
  period_start,
  period_end,
  COALESCE(created_at, now())
FROM ad_campaigns
ON CONFLICT (id) DO NOTHING;

-- ─── 11. RLS placeholder (enabled in Phase 2) ───────────────────────────────
-- Phase 1: tables readable/writable by any authenticated user (matches existing pattern).
-- Phase 2 will introduce role-based policies (admin/cmo/agency_external).

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_creative_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Phase 1 permissive policies (same as existing tables)
CREATE POLICY "phase1_all_authenticated" ON agencies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON campaign_briefs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON campaign_creative_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON campaign_assets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON campaign_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON campaign_kpis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "phase1_all_authenticated" ON audit_log FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- Business OS — Influencer Phase C: Strategic Expansion
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- C1: creator_brands junction table (cross-brand sharing)
-- C3: creator_gifts table (seasonal gifting calendar)
-- C4: UGC→Paid pipeline helper (push_creator_to_ads function)
-- C5: creator_prospects table (auto-sourcing pipeline)
-- Run AFTER 20260409_influencer_phase_b.sql
-- ============================================================================

-- ============================================================================
-- C1. TABLE: creator_brands — Cross-brand sharing
-- ============================================================================
-- Allows one creator to work with multiple brands.
-- Primary brand = main affiliation, secondary = cross-brand collab.

CREATE TABLE IF NOT EXISTS creator_brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_slug      TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'primary'
                  CHECK (role IN ('primary', 'secondary')),
  affiliate_code  TEXT,
  commission_pct  NUMERIC(4,2) DEFAULT 5.0,
  active          BOOLEAN DEFAULT TRUE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,

  UNIQUE (creator_id, brand_slug)
);

COMMENT ON TABLE creator_brands IS
'Cross-brand creator assignments. One creator can have one primary and multiple secondary brand affiliations.';

CREATE INDEX IF NOT EXISTS idx_cb_creator ON creator_brands(creator_id);
CREATE INDEX IF NOT EXISTS idx_cb_brand ON creator_brands(brand_slug);
CREATE INDEX IF NOT EXISTS idx_cb_active ON creator_brands(active) WHERE active = TRUE;

ALTER TABLE creator_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cb_select_auth" ON creator_brands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "cb_write_auth" ON creator_brands FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- View: Cross-brand creator overview
CREATE OR REPLACE VIEW cross_brand_creators AS
SELECT
  c.id AS creator_id,
  c.name,
  c.tier,
  c.creator_grade,
  c.total_sales,
  ARRAY_AGG(cb.brand_slug ORDER BY cb.role) AS brands,
  COUNT(cb.brand_slug) AS brand_count,
  BOOL_OR(cb.role = 'secondary') AS has_secondary
FROM creator_scoreboard c
JOIN creator_brands cb ON cb.creator_id = c.id AND cb.active = TRUE
GROUP BY c.id, c.name, c.tier, c.creator_grade, c.total_sales
HAVING COUNT(cb.brand_slug) > 1
ORDER BY c.total_sales DESC;

-- ============================================================================
-- C3. TABLE: creator_gifts — Seasonal gifting
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_gifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id      UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_slug      TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  gift_type       TEXT NOT NULL
                  CHECK (gift_type IN ('welcome_kit', 'seasonal', 'holiday', 'milestone', 'cross_brand')),
  gift_description TEXT,
  season          TEXT CHECK (season IN ('Q1', 'Q2', 'Q3', 'Q4')),
  year            INTEGER CHECK (year BETWEEN 2025 AND 2100),
  shipped_date    DATE,
  tracking_number TEXT,
  content_received BOOLEAN DEFAULT FALSE,
  content_task_id UUID REFERENCES creator_tasks(id) ON DELETE SET NULL,
  cost_eur        NUMERIC(8,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE creator_gifts IS
'Tracks gifting to creators: welcome kits, seasonal drops, holiday boxes, milestone rewards.';

CREATE INDEX IF NOT EXISTS idx_gifts_creator ON creator_gifts(creator_id);
CREATE INDEX IF NOT EXISTS idx_gifts_brand ON creator_gifts(brand_slug);
CREATE INDEX IF NOT EXISTS idx_gifts_season ON creator_gifts(year, season);
CREATE INDEX IF NOT EXISTS idx_gifts_pending ON creator_gifts(content_received) WHERE content_received = FALSE;

ALTER TABLE creator_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts_select_auth" ON creator_gifts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "gifts_write_auth" ON creator_gifts FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- View: Gifting pipeline — what's shipped, what's missing content
CREATE OR REPLACE VIEW gifting_pipeline AS
SELECT
  cg.id AS gift_id,
  c.name AS creator_name,
  c.tier,
  cg.brand_slug,
  cg.gift_type,
  cg.gift_description,
  cg.season,
  cg.year,
  cg.shipped_date,
  cg.content_received,
  cg.cost_eur,
  CASE
    WHEN cg.shipped_date IS NULL THEN 'not_shipped'
    WHEN cg.content_received THEN 'content_received'
    WHEN cg.shipped_date < CURRENT_DATE - INTERVAL '14 days' THEN 'overdue'
    ELSE 'awaiting_content'
  END AS gift_status
FROM creator_gifts cg
JOIN creators c ON c.id = cg.creator_id
ORDER BY cg.shipped_date DESC NULLS FIRST;

-- ============================================================================
-- C4. FUNCTION: push_creator_content_to_ads
-- ============================================================================
-- Creates a creative_assets row from an approved/repost-worthy creator task.
-- Called from the "Push to Ads" button in CreatorView.

CREATE OR REPLACE FUNCTION push_creator_content_to_ads(p_task_id UUID)
RETURNS UUID AS $$
DECLARE
  v_task RECORD;
  v_creator RECORD;
  v_angle_id UUID;
  v_asset_name TEXT;
  v_asset_id UUID;
BEGIN
  -- Get task
  SELECT * INTO v_task FROM creator_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found: %', p_task_id; END IF;

  -- Get creator
  SELECT * INTO v_creator FROM creators WHERE id = v_task.creator_id;

  -- Resolve angle
  IF v_task.angle_code IS NOT NULL THEN
    SELECT id INTO v_angle_id FROM creative_angles
    WHERE brand_slug = v_task.brand_slug AND code = v_task.angle_code;
  END IF;

  -- Build asset name: BRAND_CREATOR_KW##_FORMAT_V1
  v_asset_name := UPPER(REPLACE(v_task.brand_slug, '-', '')) || '_' ||
                  UPPER(LEFT(REGEXP_REPLACE(v_creator.name, '[^a-zA-Z]', '', 'g'), 6)) || '_' ||
                  'KW' || v_task.week_number || '_' ||
                  COALESCE(UPPER(v_task.submission_type), 'UGC') || '_V1';

  -- Insert creative asset
  INSERT INTO creative_assets (
    brand_slug, angle_id, asset_name, format, platform,
    status, storage_url, produced_by, notes
  ) VALUES (
    v_task.brand_slug,
    v_angle_id,
    v_asset_name,
    COALESCE(UPPER(v_task.submission_type), 'UGC'),
    'IG',
    'ready',
    v_task.submission_url,
    'creator',
    'Auto-pushed from creator task ' || p_task_id || ' (' || v_creator.name || ')'
  )
  RETURNING id INTO v_asset_id;

  -- Link task to asset
  UPDATE creator_tasks SET asset_id = v_asset_id WHERE id = p_task_id;

  RETURN v_asset_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- C5. TABLE: creator_prospects — Auto-sourcing pipeline
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_prospects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_handle TEXT NOT NULL UNIQUE,
  instagram_url   TEXT,
  display_name    TEXT,
  follower_count  INTEGER,
  bio_text        TEXT,
  source          TEXT NOT NULL DEFAULT 'hashtag_scan'
                  CHECK (source IN ('hashtag_scan', 'competitor_followers', 'organic_referral', 'creator_marketplace', 'manual')),
  source_hashtag  TEXT,                   -- e.g. '#meinthiocyn'
  suggested_brand TEXT REFERENCES brands(slug) ON DELETE SET NULL,
  niche_match     BOOLEAN DEFAULT FALSE,
  public_profile  BOOLEAN DEFAULT TRUE,
  qualification_score INTEGER DEFAULT 0,  -- 0-20 scale
  status          TEXT NOT NULL DEFAULT 'discovered'
                  CHECK (status IN ('discovered', 'qualified', 'contacted', 'converted', 'rejected')),
  converted_creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  discovered_at   TIMESTAMPTZ DEFAULT NOW(),
  qualified_at    TIMESTAMPTZ,
  notes           TEXT
);

COMMENT ON TABLE creator_prospects IS
'Auto-sourced creator prospects from hashtag scanning, competitor analysis, etc. Feeds into the creator pipeline.';

CREATE INDEX IF NOT EXISTS idx_prospects_status ON creator_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_brand ON creator_prospects(suggested_brand);
CREATE INDEX IF NOT EXISTS idx_prospects_score ON creator_prospects(qualification_score DESC) WHERE status = 'qualified';
CREATE INDEX IF NOT EXISTS idx_prospects_source ON creator_prospects(source);

ALTER TABLE creator_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prospects_select_auth" ON creator_prospects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "prospects_write_auth" ON creator_prospects FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- View: Qualified prospects ready for outreach
CREATE OR REPLACE VIEW qualified_prospects AS
SELECT
  cp.id,
  cp.instagram_handle,
  cp.display_name,
  cp.follower_count,
  cp.suggested_brand,
  b.name AS brand_name,
  cp.qualification_score,
  cp.source,
  cp.source_hashtag,
  cp.niche_match,
  cp.discovered_at,
  cp.notes
FROM creator_prospects cp
LEFT JOIN brands b ON b.slug = cp.suggested_brand
WHERE cp.status = 'qualified'
  AND cp.qualification_score >= 12
  AND cp.public_profile = TRUE
  AND cp.follower_count >= 1000
ORDER BY cp.qualification_score DESC, cp.follower_count DESC;

-- ============================================================================
-- C5b. FUNCTION: convert_prospect_to_creator
-- ============================================================================
-- Converts a qualified prospect into a creator row.

CREATE OR REPLACE FUNCTION convert_prospect_to_creator(p_prospect_id UUID)
RETURNS UUID AS $$
DECLARE
  v_prospect RECORD;
  v_creator_id UUID;
BEGIN
  SELECT * INTO v_prospect FROM creator_prospects WHERE id = p_prospect_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prospect not found: %', p_prospect_id; END IF;

  INSERT INTO creators (
    name, instagram_url, brand_slug, brand, status, follower_range, notes
  ) VALUES (
    COALESCE(v_prospect.display_name, v_prospect.instagram_handle),
    COALESCE(v_prospect.instagram_url, 'https://www.instagram.com/' || REPLACE(v_prospect.instagram_handle, '@', '') || '/'),
    v_prospect.suggested_brand,
    (SELECT name FROM brands WHERE slug = v_prospect.suggested_brand),
    'Prospect',
    CASE
      WHEN v_prospect.follower_count >= 100000 THEN '100K+'
      WHEN v_prospect.follower_count >= 50000 THEN '50K-100K'
      WHEN v_prospect.follower_count >= 10000 THEN '10K-50K'
      WHEN v_prospect.follower_count >= 1000 THEN '1K-10K'
      ELSE '<1K'
    END,
    'Auto-converted from prospect. Source: ' || v_prospect.source || '. Score: ' || v_prospect.qualification_score
  )
  RETURNING id INTO v_creator_id;

  -- Update prospect
  UPDATE creator_prospects SET
    status = 'converted',
    converted_creator_id = v_creator_id
  WHERE id = p_prospect_id;

  RETURN v_creator_id;
END;
$$ LANGUAGE plpgsql;

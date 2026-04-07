-- ============================================================================
-- Business OS — Creative Factory Layer
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- Tables: creative_angles, creative_assets, asset_performance, angle_insights
-- Views: angle_scoreboard, brand_creative_health, winning_patterns
-- Trigger: auto-classify asset performance
-- Run AFTER supabase_brand_layer.sql
-- ============================================================================

-- ============================================================================
-- TABLE: creative_angles
-- ============================================================================
-- Central angle registry across all brands. Single source of truth.
-- Replaces markdown angle libraries for operational use.

CREATE TABLE IF NOT EXISTS creative_angles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  code            TEXT NOT NULL,          -- 'PROB01', 'MECH03', 'ASPI02' etc.
  category        TEXT NOT NULL
                  CHECK (category IN ('problem', 'mechanism', 'aspiration', 'social_proof', 'contrarian', 'identity', 'trust')),
  name            TEXT NOT NULL,          -- 'Kontrollverlust', 'Körpereigenes Molekül'
  hook_de         TEXT,                   -- German hook text
  hook_en         TEXT,                   -- English hook text (nullable for DE-only brands)
  persona         TEXT[],                 -- ['Sandra', 'Markus', 'Lena'] or ['Conscious Explorer']
  awareness_stage TEXT NOT NULL DEFAULT 'solution_aware'
                  CHECK (awareness_stage IN ('unaware', 'problem_aware', 'solution_aware', 'product_aware', 'most_aware')),
  format          TEXT[],                 -- ['UGC Story', 'Talking Head', 'Carousel']
  performance_tag TEXT NOT NULL DEFAULT 'untested'
                  CHECK (performance_tag IN ('untested', 'testing', 'winner', 'performer', 'loser', 'retired')),

  -- Aggregated metrics (auto-updated by trigger)
  avg_ctr         NUMERIC(5,4) DEFAULT 0,
  avg_roas        NUMERIC(6,2) DEFAULT 0,
  avg_completion   NUMERIC(5,2) DEFAULT 0,  -- percent
  total_assets    INTEGER DEFAULT 0,
  total_winners   INTEGER DEFAULT 0,
  win_rate        NUMERIC(5,2) DEFAULT 0,   -- percent: winners / total tested

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (brand_slug, code)               -- THIOCYN + PROB01 is unique
);

COMMENT ON TABLE creative_angles IS
'Creative angle registry for all brands. Each angle has a unique code per brand. Performance metrics are auto-aggregated from asset_performance.';

DROP TRIGGER IF EXISTS trigger_creative_angles_updated_at ON creative_angles;
CREATE TRIGGER trigger_creative_angles_updated_at
BEFORE UPDATE ON creative_angles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_angles_brand ON creative_angles(brand_slug);
CREATE INDEX IF NOT EXISTS idx_angles_category ON creative_angles(category);
CREATE INDEX IF NOT EXISTS idx_angles_perf ON creative_angles(performance_tag);
CREATE INDEX IF NOT EXISTS idx_angles_win_rate ON creative_angles(win_rate DESC) WHERE win_rate > 0;

ALTER TABLE creative_angles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "angles_select_auth" ON creative_angles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "angles_write_auth" ON creative_angles FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: creative_assets
-- ============================================================================
-- Every creative asset across all brands. Follows naming convention.
-- Links to an angle and optionally to a content_post and ad_campaign.

CREATE TABLE IF NOT EXISTS creative_assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  angle_id        UUID REFERENCES creative_angles(id) ON DELETE SET NULL,
  campaign        TEXT,                   -- 'Q2SUMMER', 'ALWAYS-ON', 'BF26'
  asset_name      TEXT NOT NULL UNIQUE,   -- Full name: THIOCYN_Q2SUMMER_MECH01_VID_IG_V1
  format          TEXT NOT NULL
                  CHECK (format IN ('IMG', 'VID', 'CAR', 'UGC', 'VSL', 'GIF', 'STATIC')),
  platform        TEXT NOT NULL
                  CHECK (platform IN ('IG', 'TT', 'FB', 'YT', 'PIN', 'META', 'ALL')),
  version         INTEGER NOT NULL DEFAULT 1,
  hook_text       TEXT,                   -- The actual hook used in this asset
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'in_production', 'review', 'ready', 'live', 'paused', 'retired')),
  storage_url     TEXT,                   -- Supabase Storage or external URL
  thumbnail_url   TEXT,
  duration_sec    INTEGER,                -- Video duration in seconds
  content_post_id UUID REFERENCES content_posts(id) ON DELETE SET NULL,

  -- Metadata
  produced_by     TEXT,                   -- 'ai_higgsfield', 'ai_kling', 'intern', 'creator', 'agency'
  parent_asset_id UUID REFERENCES creative_assets(id) ON DELETE SET NULL,  -- V2 points to V1
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE creative_assets IS
'Creative assets across all brands. Each asset follows the naming convention and links to an angle. Parent-child relationship tracks variants (V1 → V2 → V3).';

DROP TRIGGER IF EXISTS trigger_creative_assets_updated_at ON creative_assets;
CREATE TRIGGER trigger_creative_assets_updated_at
BEFORE UPDATE ON creative_assets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_assets_brand ON creative_assets(brand_slug);
CREATE INDEX IF NOT EXISTS idx_assets_angle ON creative_assets(angle_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON creative_assets(status) WHERE status IN ('live', 'ready');
CREATE INDEX IF NOT EXISTS idx_assets_format ON creative_assets(format);
CREATE INDEX IF NOT EXISTS idx_assets_campaign ON creative_assets(campaign);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON creative_assets(parent_asset_id) WHERE parent_asset_id IS NOT NULL;

ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assets_select_auth" ON creative_assets FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "assets_write_auth" ON creative_assets FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: asset_performance
-- ============================================================================
-- Daily performance snapshots per asset. Pulled from Meta/TikTok via n8n.
-- Multiple rows per asset (one per day) → enables trend analysis.

CREATE TABLE IF NOT EXISTS asset_performance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        UUID NOT NULL REFERENCES creative_assets(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Paid metrics
  impressions     INTEGER DEFAULT 0,
  clicks          INTEGER DEFAULT 0,
  ctr             NUMERIC(5,4) DEFAULT 0,    -- clicks / impressions
  spend           NUMERIC(10,2) DEFAULT 0,
  purchases       INTEGER DEFAULT 0,
  revenue         NUMERIC(10,2) DEFAULT 0,
  roas            NUMERIC(6,2) DEFAULT 0,    -- revenue / spend
  cpm             NUMERIC(8,2) DEFAULT 0,    -- cost per 1000 impressions
  cpc             NUMERIC(8,2) DEFAULT 0,    -- cost per click

  -- Engagement metrics (organic + paid)
  likes           INTEGER DEFAULT 0,
  comments        INTEGER DEFAULT 0,
  shares          INTEGER DEFAULT 0,
  saves           INTEGER DEFAULT 0,

  -- Video metrics
  video_views     INTEGER DEFAULT 0,
  completion_rate NUMERIC(5,2) DEFAULT 0,    -- percent who watched to end
  avg_watch_time  NUMERIC(6,2) DEFAULT 0,    -- seconds
  hold_rate_3s    NUMERIC(5,2) DEFAULT 0,    -- percent still watching at 3s

  -- Classification (auto-set by trigger)
  classification  TEXT DEFAULT 'untested'
                  CHECK (classification IN ('untested', 'testing', 'winner', 'performer', 'neutral', 'loser', 'retired')),

  source          TEXT DEFAULT 'manual'
                  CHECK (source IN ('manual', 'meta_api', 'tiktok_api', 'google_api', 'n8n')),

  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (asset_id, snapshot_date)          -- One snapshot per asset per day
);

COMMENT ON TABLE asset_performance IS
'Daily performance snapshots per creative asset. Auto-classified based on thresholds. Source: Meta/TikTok APIs via n8n, or manual entry.';

CREATE INDEX IF NOT EXISTS idx_perf_asset ON asset_performance(asset_id);
CREATE INDEX IF NOT EXISTS idx_perf_date ON asset_performance(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_perf_class ON asset_performance(classification);
CREATE INDEX IF NOT EXISTS idx_perf_ctr ON asset_performance(ctr DESC) WHERE ctr > 0;
CREATE INDEX IF NOT EXISTS idx_perf_roas ON asset_performance(roas DESC) WHERE roas > 0;

ALTER TABLE asset_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perf_select_auth" ON asset_performance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "perf_write_auth" ON asset_performance FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: angle_insights
-- ============================================================================
-- Extracted patterns and learnings. The "brain" of the system.
-- Auto-generated or manually added after feedback loop runs.

CREATE TABLE IF NOT EXISTS angle_insights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug      TEXT REFERENCES brands(slug) ON DELETE SET NULL,  -- NULL = cross-brand insight
  insight_type    TEXT NOT NULL
                  CHECK (insight_type IN ('pattern', 'recommendation', 'warning', 'cross_brand', 'persona_learning', 'format_learning')),
  title           TEXT NOT NULL,                           -- 'MECH angles outperform PROB by 2.3x CTR'
  description     TEXT NOT NULL,                           -- Full insight description
  evidence        JSONB,                                   -- Supporting data points
  confidence      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (confidence IN ('low', 'medium', 'high', 'proven')),
  actionable      BOOLEAN DEFAULT TRUE,
  action_taken    BOOLEAN DEFAULT FALSE,
  related_angles  TEXT[],                                  -- ['MECH01', 'MECH03']
  source          TEXT DEFAULT 'feedback_loop'
                  CHECK (source IN ('feedback_loop', 'manual', 'ai_analysis', 'cross_brand_mining')),
  valid_until     DATE,                                    -- Insights can expire
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE angle_insights IS
'Extracted patterns and learnings from creative performance data. The learning layer of the Creative Factory. Insights can be brand-specific or cross-brand.';

DROP TRIGGER IF EXISTS trigger_angle_insights_updated_at ON angle_insights;
CREATE TRIGGER trigger_angle_insights_updated_at
BEFORE UPDATE ON angle_insights
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_insights_brand ON angle_insights(brand_slug);
CREATE INDEX IF NOT EXISTS idx_insights_type ON angle_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_confidence ON angle_insights(confidence);
CREATE INDEX IF NOT EXISTS idx_insights_actionable ON angle_insights(actionable) WHERE actionable = TRUE AND action_taken = FALSE;

ALTER TABLE angle_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_select_auth" ON angle_insights FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insights_write_auth" ON angle_insights FOR ALL WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTION: auto-classify asset performance
-- ============================================================================
-- Runs on every INSERT/UPDATE to asset_performance.
-- Classifies based on thresholds defined in the feedback loop skill.

CREATE OR REPLACE FUNCTION classify_asset_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Minimum 1000 impressions for classification
  IF NEW.impressions < 1000 THEN
    NEW.classification := 'testing';
    RETURN NEW;
  END IF;

  -- Winner: CTR >1.5% OR ROAS >3x OR completion >35% OR saves >50
  IF NEW.ctr > 0.015 OR NEW.roas > 3.0 OR NEW.completion_rate > 35 OR NEW.saves > 50 THEN
    NEW.classification := 'winner';
  -- Performer: CTR 1.0-1.5% AND ROAS 2-3x
  ELSIF NEW.ctr > 0.01 AND NEW.roas > 2.0 THEN
    NEW.classification := 'performer';
  -- Loser: CTR <0.8% AND ROAS <1.5x
  ELSIF NEW.ctr < 0.008 AND NEW.roas < 1.5 THEN
    NEW.classification := 'loser';
  ELSE
    NEW.classification := 'neutral';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_classify_performance ON asset_performance;
CREATE TRIGGER trigger_classify_performance
BEFORE INSERT OR UPDATE ON asset_performance
FOR EACH ROW EXECUTE FUNCTION classify_asset_performance();

-- ============================================================================
-- FUNCTION: auto-aggregate angle metrics
-- ============================================================================
-- After performance data changes, roll up metrics to the parent angle.

CREATE OR REPLACE FUNCTION aggregate_angle_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_angle_id UUID;
  v_stats RECORD;
BEGIN
  -- Get the angle_id for this asset
  SELECT angle_id INTO v_angle_id
  FROM creative_assets WHERE id = NEW.asset_id;

  IF v_angle_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Aggregate latest snapshot per asset for this angle
  SELECT
    COALESCE(AVG(p.ctr), 0) AS avg_ctr,
    COALESCE(AVG(p.roas), 0) AS avg_roas,
    COALESCE(AVG(p.completion_rate), 0) AS avg_completion,
    COUNT(DISTINCT p.asset_id) AS total_assets,
    COUNT(DISTINCT p.asset_id) FILTER (WHERE p.classification = 'winner') AS total_winners
  INTO v_stats
  FROM (
    SELECT DISTINCT ON (asset_id) asset_id, ctr, roas, completion_rate, classification
    FROM asset_performance
    WHERE asset_id IN (SELECT id FROM creative_assets WHERE angle_id = v_angle_id)
    ORDER BY asset_id, snapshot_date DESC
  ) p;

  -- Update angle with aggregated metrics
  UPDATE creative_angles SET
    avg_ctr = v_stats.avg_ctr,
    avg_roas = v_stats.avg_roas,
    avg_completion = v_stats.avg_completion,
    total_assets = v_stats.total_assets,
    total_winners = v_stats.total_winners,
    win_rate = CASE
      WHEN v_stats.total_assets > 0
      THEN ROUND((v_stats.total_winners::NUMERIC / v_stats.total_assets) * 100, 2)
      ELSE 0
    END,
    performance_tag = CASE
      WHEN v_stats.total_assets = 0 THEN 'untested'
      WHEN v_stats.total_winners > 0 AND (v_stats.total_winners::NUMERIC / v_stats.total_assets) >= 0.5 THEN 'winner'
      WHEN v_stats.avg_ctr > 0.01 THEN 'performer'
      WHEN v_stats.avg_ctr < 0.008 AND v_stats.total_assets >= 3 THEN 'loser'
      ELSE 'testing'
    END
  WHERE id = v_angle_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_aggregate_angle ON asset_performance;
CREATE TRIGGER trigger_aggregate_angle
AFTER INSERT OR UPDATE ON asset_performance
FOR EACH ROW EXECUTE FUNCTION aggregate_angle_metrics();

-- ============================================================================
-- VIEW: angle_scoreboard
-- ============================================================================
-- Live leaderboard: which angles perform best per brand?

CREATE OR REPLACE VIEW angle_scoreboard AS
SELECT
  ca.brand_slug,
  b.name AS brand_name,
  ca.code,
  ca.category,
  ca.name AS angle_name,
  ca.hook_de,
  ca.performance_tag,
  ca.avg_ctr,
  ca.avg_roas,
  ca.avg_completion,
  ca.total_assets,
  ca.total_winners,
  ca.win_rate,
  RANK() OVER (PARTITION BY ca.brand_slug ORDER BY ca.win_rate DESC, ca.avg_roas DESC) AS rank
FROM creative_angles ca
JOIN brands b ON b.slug = ca.brand_slug
WHERE ca.total_assets > 0
ORDER BY ca.brand_slug, rank;

-- ============================================================================
-- VIEW: brand_creative_health
-- ============================================================================
-- Per-brand health check: how many angles tested, win rate, coverage gaps.

CREATE OR REPLACE VIEW brand_creative_health AS
SELECT
  b.slug AS brand_slug,
  b.name AS brand_name,
  COUNT(ca.id) AS total_angles,
  COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'untested') AS untested,
  COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'testing') AS testing,
  COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'winner') AS winners,
  COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'performer') AS performers,
  COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'loser') AS losers,
  ROUND(
    (COUNT(ca.id) FILTER (WHERE ca.performance_tag NOT IN ('untested'))::NUMERIC /
     NULLIF(COUNT(ca.id), 0)) * 100, 1
  ) AS test_coverage_pct,
  ROUND(
    (COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'winner')::NUMERIC /
     NULLIF(COUNT(ca.id) FILTER (WHERE ca.performance_tag NOT IN ('untested')), 0)) * 100, 1
  ) AS overall_win_rate_pct,
  -- Category coverage
  COUNT(DISTINCT ca.category) AS categories_used,
  7 - COUNT(DISTINCT ca.category) AS categories_missing
FROM brands b
LEFT JOIN creative_angles ca ON ca.brand_slug = b.slug
WHERE b.status = 'active'
GROUP BY b.slug, b.name
ORDER BY test_coverage_pct DESC NULLS LAST;

-- ============================================================================
-- VIEW: winning_patterns
-- ============================================================================
-- Cross-brand pattern detection: which angle categories win across brands?

CREATE OR REPLACE VIEW winning_patterns AS
SELECT
  ca.category,
  COUNT(DISTINCT ca.brand_slug) AS brands_tested,
  COUNT(ca.id) AS total_angles,
  COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'winner') AS winners,
  ROUND(AVG(ca.avg_ctr), 4) AS avg_ctr_across_brands,
  ROUND(AVG(ca.avg_roas), 2) AS avg_roas_across_brands,
  ROUND(
    (COUNT(ca.id) FILTER (WHERE ca.performance_tag = 'winner')::NUMERIC /
     NULLIF(COUNT(ca.id) FILTER (WHERE ca.performance_tag NOT IN ('untested')), 0)) * 100, 1
  ) AS category_win_rate_pct
FROM creative_angles ca
WHERE ca.total_assets > 0
GROUP BY ca.category
ORDER BY category_win_rate_pct DESC NULLS LAST;

-- ============================================================================
-- VIEW: asset_variant_tree
-- ============================================================================
-- Shows parent → child relationships for asset variants.

CREATE OR REPLACE VIEW asset_variant_tree AS
SELECT
  parent.asset_name AS original,
  child.asset_name AS variant,
  child.version,
  child.hook_text,
  child.status,
  latest_perf.ctr,
  latest_perf.roas,
  latest_perf.classification
FROM creative_assets child
JOIN creative_assets parent ON parent.id = child.parent_asset_id
LEFT JOIN LATERAL (
  SELECT ctr, roas, classification
  FROM asset_performance
  WHERE asset_id = child.id
  ORDER BY snapshot_date DESC
  LIMIT 1
) latest_perf ON TRUE
ORDER BY parent.asset_name, child.version;

-- ============================================================================
-- Done. Verify:
--   SELECT brand_slug, code, category, performance_tag FROM creative_angles;
--   SELECT asset_name, status FROM creative_assets;
--   SELECT * FROM angle_scoreboard LIMIT 10;
--   SELECT * FROM brand_creative_health;
--   SELECT * FROM winning_patterns;
-- ============================================================================

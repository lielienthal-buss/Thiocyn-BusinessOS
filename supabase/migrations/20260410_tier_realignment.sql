-- ============================================================================
-- Business OS — Tier System Realignment
-- ============================================================================
-- Converts influencer tier system from sales-based model
-- (starter/silver/gold/ambassador) to documented 4-tier program
-- (gifting/affiliate/influencer/ambassador) with 25% CAC cap.
--
-- Replaces auto_update_creator_tier() with request_tier_upgrade()
-- that proposes upgrades via notifications instead of auto-promoting.
--
-- Run AFTER 20260409_influencer_phase_b.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Migrate existing tier data
-- ============================================================================

UPDATE creators SET tier = 'gifting'     WHERE tier = 'starter';
UPDATE creators SET tier = 'affiliate'   WHERE tier = 'silver';
UPDATE creators SET tier = 'influencer'  WHERE tier = 'gold';
-- ambassador stays ambassador

-- ============================================================================
-- 2. Drop and recreate CHECK constraint
-- ============================================================================

ALTER TABLE creators DROP CONSTRAINT IF EXISTS chk_creators_tier;

DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_creators_tier
    CHECK (tier IN ('gifting', 'affiliate', 'influencer', 'ambassador'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 3. Add new columns to creators
-- ============================================================================

ALTER TABLE creators ADD COLUMN IF NOT EXISTS compensation_model TEXT DEFAULT 'product_only';
ALTER TABLE creators ADD COLUMN IF NOT EXISTS retainer_eur NUMERIC(8,2);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS flat_fee_eur NUMERIC(8,2);
ALTER TABLE creators ADD COLUMN IF NOT EXISTS cac_pct NUMERIC(5,2);

DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_creators_compensation_model
    CHECK (compensation_model IN ('product_only', 'commission', 'flat_fee', 'retainer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. Set compensation_model based on migrated tiers
-- ============================================================================

UPDATE creators SET compensation_model = 'product_only' WHERE tier = 'gifting';
UPDATE creators SET compensation_model = 'commission'   WHERE tier = 'affiliate';
UPDATE creators SET compensation_model = 'flat_fee'     WHERE tier = 'influencer';
UPDATE creators SET compensation_model = 'retainer'     WHERE tier = 'ambassador';

-- ============================================================================
-- 5. Replace auto_update_creator_tier() with request_tier_upgrade()
-- ============================================================================
-- Old function auto-promoted based on sales thresholds.
-- New function proposes upgrades via notification — human must approve.
-- Still updates total_sales and total_revenue on the creator.

CREATE OR REPLACE FUNCTION request_tier_upgrade()
RETURNS TRIGGER AS $$
DECLARE
  v_total_sales    INTEGER;
  v_total_revenue  NUMERIC(10,2);
  v_current_tier   TEXT;
  v_creator_name   TEXT;
  v_content_count  INTEGER;
  v_created_at     TIMESTAMPTZ;
  v_tier_updated   TIMESTAMPTZ;
  v_avg_delivery   NUMERIC(5,2);
  v_suggested_tier TEXT := NULL;
  v_criteria_met   TEXT := '';
BEGIN
  -- Fetch current creator data
  SELECT
    COALESCE(c.total_sales, 0),
    COALESCE(c.total_revenue, 0),
    c.tier,
    c.name,
    COALESCE(c.content_count, 0),
    c.created_at,
    c.tier_updated_at
  INTO
    v_total_sales, v_total_revenue, v_current_tier,
    v_creator_name, v_content_count, v_created_at, v_tier_updated
  FROM creators c
  WHERE c.id = NEW.creator_id;

  -- Accumulate this week's sales + revenue
  v_total_sales   := v_total_sales + COALESCE(NEW.sales, 0);
  v_total_revenue := v_total_revenue + COALESCE(NEW.revenue, 0);

  -- Update creator totals (sales tracking continues regardless of tier)
  UPDATE creators SET
    total_sales   = v_total_sales,
    total_revenue = v_total_revenue
  WHERE id = NEW.creator_id;

  -- Compute avg delivery rate over last 4 weeks
  SELECT COALESCE(ROUND(AVG(cp.delivery_rate), 1), 0)
  INTO v_avg_delivery
  FROM (
    SELECT delivery_rate
    FROM creator_performance
    WHERE creator_id = NEW.creator_id
    ORDER BY year DESC, week_number DESC
    LIMIT 4
  ) cp;

  -- ── Check upgrade eligibility ──

  -- T1 (gifting) → T2 (affiliate): 2+ gifting cycles completed
  IF v_current_tier = 'gifting' AND v_content_count >= 2 THEN
    v_suggested_tier := 'affiliate';
    v_criteria_met   := 'content_count=' || v_content_count || ' (>=2 gifting cycles)';
  END IF;

  -- T2 (affiliate) → T3 (influencer): active >=3 months + delivery_rate >=90 (4w avg)
  IF v_current_tier = 'affiliate'
     AND v_created_at < NOW() - INTERVAL '3 months'
     AND v_avg_delivery >= 90
  THEN
    v_suggested_tier := 'influencer';
    v_criteria_met   := 'active_since=' || v_created_at::DATE
                     || ', avg_delivery_4w=' || v_avg_delivery || '% (>=90%)';
  END IF;

  -- T3 (influencer) → T4 (ambassador): at T3 >=3 months
  IF v_current_tier = 'influencer'
     AND v_tier_updated IS NOT NULL
     AND v_tier_updated < NOW() - INTERVAL '3 months'
  THEN
    v_suggested_tier := 'ambassador';
    v_criteria_met   := 'at_influencer_since=' || v_tier_updated::DATE
                     || ' (>=3 months at current tier)';
  END IF;

  -- ── Insert notification if upgrade suggested ──
  IF v_suggested_tier IS NOT NULL THEN
    -- Avoid duplicate pending requests
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE type = 'tier_upgrade_request'
        AND metadata->>'creator_id' = NEW.creator_id::TEXT
        AND metadata->>'suggested_tier' = v_suggested_tier
        AND created_at > NOW() - INTERVAL '7 days'
    ) THEN
      INSERT INTO notifications (type, title, body, metadata)
      VALUES (
        'tier_upgrade_request',
        'Tier Upgrade Vorschlag: ' || COALESCE(v_creator_name, 'Creator'),
        COALESCE(v_creator_name, 'Creator')
          || ' qualifiziert sich fuer '
          || v_suggested_tier
          || ' (aktuell: ' || v_current_tier || '). '
          || 'Kriterien: ' || v_criteria_met || '.',
        jsonb_build_object(
          'creator_id', NEW.creator_id,
          'current_tier', v_current_tier,
          'suggested_tier', v_suggested_tier,
          'criteria_met', v_criteria_met,
          'total_sales', v_total_sales,
          'avg_delivery_4w', v_avg_delivery
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS trigger_auto_tier ON creator_performance;
CREATE TRIGGER trigger_request_tier_upgrade
AFTER INSERT ON creator_performance
FOR EACH ROW EXECUTE FUNCTION request_tier_upgrade();

-- ============================================================================
-- 6. Recreate views that reference tier values
-- ============================================================================

-- 6.1 Creator Scoreboard — now includes compensation columns
CREATE OR REPLACE VIEW creator_scoreboard AS
SELECT
  c.id,
  c.name,
  c.brand_slug,
  c.tier,
  c.onboarding_status,
  c.assigned_operator,
  c.total_sales,
  c.total_revenue,
  c.content_count,
  c.last_content_date,
  c.compensation_model,
  c.retainer_eur,
  c.flat_fee_eur,
  COALESCE(perf.avg_delivery_rate, 0) AS avg_delivery_rate_4w,
  COALESCE(perf.total_top_videos, 0) AS top_videos_4w,
  COALESCE(perf.recent_sales, 0) AS sales_4w,
  CASE
    WHEN COALESCE(perf.avg_delivery_rate, 0) >= 80 AND c.total_sales >= 5 THEN 'A'
    WHEN COALESCE(perf.avg_delivery_rate, 0) >= 50 THEN 'B'
    ELSE 'C'
  END AS creator_grade,
  RANK() OVER (
    PARTITION BY c.brand_slug
    ORDER BY COALESCE(perf.avg_delivery_rate, 0) DESC, c.total_sales DESC
  ) AS rank
FROM creators c
LEFT JOIN LATERAL (
  SELECT
    ROUND(AVG(delivery_rate), 1) AS avg_delivery_rate,
    SUM(top_videos) AS total_top_videos,
    SUM(sales) AS recent_sales
  FROM creator_performance cp
  WHERE cp.creator_id = c.id
  ORDER BY cp.year DESC, cp.week_number DESC
  LIMIT 4
) perf ON TRUE
WHERE c.status = 'Active'
ORDER BY c.brand_slug, rank;

-- 6.2 Creator Operator Dashboard — ambassador is still a valid tier name
CREATE OR REPLACE VIEW creator_operator_dashboard AS
SELECT
  c.assigned_operator,
  tm.name AS operator_name,
  COUNT(c.id) AS total_creators,
  COUNT(c.id) FILTER (WHERE c.onboarding_status = 'active') AS active_creators,
  COUNT(c.id) FILTER (WHERE c.tier = 'ambassador') AS ambassadors,
  SUM(c.total_sales) AS total_sales,
  SUM(c.total_revenue) AS total_revenue,
  COALESCE(tasks.open_tasks, 0) AS open_tasks_this_week,
  COALESCE(tasks.delivered_tasks, 0) AS delivered_this_week,
  CASE
    WHEN COALESCE(tasks.open_tasks, 0) + COALESCE(tasks.delivered_tasks, 0) > 0
    THEN ROUND(
      (COALESCE(tasks.delivered_tasks, 0)::NUMERIC /
       (COALESCE(tasks.open_tasks, 0) + COALESCE(tasks.delivered_tasks, 0))) * 100, 1
    )
    ELSE 0
  END AS delivery_rate_this_week
FROM creators c
LEFT JOIN team_members tm ON tm.email = c.assigned_operator
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE ct.status IN ('sent', 'acknowledged')) AS open_tasks,
    COUNT(*) FILTER (WHERE ct.status IN ('submitted', 'feedback_given', 'approved')) AS delivered_tasks
  FROM creator_tasks ct
  WHERE ct.creator_id = c.id
    AND ct.year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND ct.week_number = EXTRACT(WEEK FROM CURRENT_DATE)
) tasks ON TRUE
WHERE c.assigned_operator IS NOT NULL
GROUP BY c.assigned_operator, tm.name, tasks.open_tasks, tasks.delivered_tasks;

-- 6.3 Weekly Pulse — references creator_scoreboard (already updated above)
CREATE OR REPLACE VIEW weekly_pulse AS
WITH current_week AS (
  SELECT
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER AS yr,
    EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER AS wk
),
task_stats AS (
  SELECT
    ct.brand_slug,
    COUNT(*) AS tasks_total,
    COUNT(*) FILTER (WHERE ct.status IN ('submitted', 'feedback_given', 'approved')) AS tasks_delivered,
    COUNT(*) FILTER (WHERE ct.status IN ('sent', 'acknowledged')) AS tasks_pending,
    COUNT(*) FILTER (WHERE ct.status = 'overdue' OR (ct.deadline < CURRENT_DATE AND ct.status IN ('sent', 'acknowledged'))) AS tasks_overdue,
    COUNT(*) FILTER (WHERE ct.repost_worthy) AS repost_worthy,
    ROUND(AVG(ct.quality_rating) FILTER (WHERE ct.quality_rating IS NOT NULL), 1) AS avg_quality
  FROM creator_tasks ct, current_week cw
  WHERE ct.year = cw.yr AND ct.week_number = cw.wk
  GROUP BY ct.brand_slug
),
tier_events AS (
  SELECT
    c.brand_slug,
    COUNT(*) AS tier_upgrades
  FROM creators c
  WHERE c.tier_updated_at >= DATE_TRUNC('week', CURRENT_DATE)
  GROUP BY c.brand_slug
),
top_creators AS (
  SELECT
    cs.brand_slug,
    ARRAY_AGG(cs.name ORDER BY cs.rank LIMIT 5) AS top_5_names,
    ARRAY_AGG(cs.creator_grade ORDER BY cs.rank LIMIT 5) AS top_5_grades
  FROM creator_scoreboard cs
  GROUP BY cs.brand_slug
)
SELECT
  b.slug AS brand_slug,
  b.name AS brand_name,
  COALESCE(ts.tasks_total, 0) AS tasks_total,
  COALESCE(ts.tasks_delivered, 0) AS tasks_delivered,
  COALESCE(ts.tasks_pending, 0) AS tasks_pending,
  COALESCE(ts.tasks_overdue, 0) AS tasks_overdue,
  CASE
    WHEN COALESCE(ts.tasks_total, 0) > 0
    THEN ROUND((COALESCE(ts.tasks_delivered, 0)::NUMERIC / ts.tasks_total) * 100, 1)
    ELSE 0
  END AS delivery_rate,
  COALESCE(ts.repost_worthy, 0) AS repost_worthy,
  ts.avg_quality,
  COALESCE(te.tier_upgrades, 0) AS tier_upgrades_this_week,
  tc.top_5_names,
  tc.top_5_grades
FROM brands b
LEFT JOIN task_stats ts ON ts.brand_slug = b.slug
LEFT JOIN tier_events te ON te.brand_slug = b.slug
LEFT JOIN top_creators tc ON tc.brand_slug = b.slug
WHERE b.status = 'active'
ORDER BY COALESCE(ts.tasks_total, 0) DESC;

-- ============================================================================
-- 7. Index on new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_creators_compensation ON creators(compensation_model);

-- ============================================================================
-- Done. Verify:
--   SELECT tier, compensation_model, COUNT(*) FROM creators GROUP BY 1, 2;
--   SELECT conname, consrc FROM pg_constraint WHERE conrelid = 'creators'::regclass;
--   SELECT * FROM creator_scoreboard LIMIT 5;
--   SELECT type, title FROM notifications WHERE type = 'tier_upgrade_request' LIMIT 5;
-- ============================================================================

COMMIT;

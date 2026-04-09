-- ============================================================================
-- Business OS — Influencer Phase B: Automation Layer
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- B2: pg_cron for auto-tasking + snapshot
-- B3: Tier-upgrade notification trigger
-- B4: Onboarding automation trigger (affiliate code + first task)
-- B5: Weekly Pulse stats view
-- Run AFTER 20260409_influencer_phase_a.sql
-- ============================================================================

-- ============================================================================
-- B2. pg_cron — Weekly auto-tasking + Friday snapshot
-- ============================================================================
-- pg_cron must be enabled in Supabase Dashboard > Database > Extensions
-- These use supabase_functions.http_request to call Edge Functions via HTTP

-- Monday 08:00 UTC: distribute weekly tasks
SELECT cron.schedule(
  'creator-weekly-tasks',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/distribute-creator-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Friday 18:00 UTC: snapshot performance
SELECT cron.schedule(
  'creator-weekly-snapshot',
  '0 18 * * 5',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/snapshot-creator-performance',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- B3. Tier-upgrade notification
-- ============================================================================
-- Extends the existing auto_update_creator_tier trigger to insert a notification
-- when a creator's tier changes.

CREATE OR REPLACE FUNCTION auto_update_creator_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_total_sales INTEGER;
  v_new_tier TEXT;
  v_old_tier TEXT;
  v_creator_name TEXT;
BEGIN
  -- Get current creator data
  SELECT total_sales, tier, name INTO v_total_sales, v_old_tier, v_creator_name
  FROM creators WHERE id = NEW.creator_id;

  -- Add this week's sales
  v_total_sales := COALESCE(v_total_sales, 0) + COALESCE(NEW.sales, 0);

  -- Determine new tier
  IF v_total_sales >= 300 THEN
    v_new_tier := 'ambassador';
  ELSIF v_total_sales >= 100 THEN
    v_new_tier := 'gold';
  ELSIF v_total_sales >= 20 THEN
    v_new_tier := 'silver';
  ELSE
    v_new_tier := 'starter';
  END IF;

  -- Update creator
  UPDATE creators SET
    total_sales = v_total_sales,
    total_revenue = COALESCE(total_revenue, 0) + COALESCE(NEW.revenue, 0),
    tier = v_new_tier,
    tier_updated_at = CASE WHEN v_old_tier != v_new_tier THEN NOW() ELSE tier_updated_at END
  WHERE id = NEW.creator_id;

  -- Insert notification on tier upgrade
  IF v_old_tier IS DISTINCT FROM v_new_tier AND v_new_tier > v_old_tier THEN
    INSERT INTO notifications (type, title, body, metadata)
    VALUES (
      'tier_upgrade',
      'Tier Upgrade: ' || COALESCE(v_creator_name, 'Creator'),
      COALESCE(v_creator_name, 'Creator') || ' wurde von ' || COALESCE(v_old_tier, 'starter') || ' auf ' || v_new_tier || ' hochgestuft (' || v_total_sales || ' Sales).',
      jsonb_build_object(
        'creator_id', NEW.creator_id,
        'old_tier', COALESCE(v_old_tier, 'starter'),
        'new_tier', v_new_tier,
        'total_sales', v_total_sales
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists (DROP + CREATE in 20260407), no need to recreate

-- ============================================================================
-- B4. Onboarding automation — auto affiliate code + notification
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_onboard_creator()
RETURNS TRIGGER AS $$
DECLARE
  v_code TEXT;
  v_suffix TEXT;
BEGIN
  -- Only trigger when status changes to 'Active' or new row is Active
  IF NEW.status = 'Active' AND (OLD IS NULL OR OLD.status != 'Active') THEN

    -- Generate affiliate code if not set: brand_first4name_3random
    IF NEW.affiliate_code IS NULL OR NEW.affiliate_code = '' THEN
      v_suffix := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
      v_code := COALESCE(NEW.brand_slug, 'brand') || '_' ||
                LOWER(LEFT(REGEXP_REPLACE(NEW.name, '[^a-zA-Z]', '', 'g'), 4)) ||
                v_suffix;

      -- Ensure uniqueness
      WHILE EXISTS (SELECT 1 FROM creators WHERE affiliate_code = v_code) LOOP
        v_suffix := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
        v_code := COALESCE(NEW.brand_slug, 'brand') || '_' ||
                  LOWER(LEFT(REGEXP_REPLACE(NEW.name, '[^a-zA-Z]', '', 'g'), 4)) ||
                  v_suffix;
      END LOOP;

      NEW.affiliate_code := v_code;
    END IF;

    -- Set onboarding status to pending if not already set
    IF NEW.onboarding_status IS NULL OR NEW.onboarding_status = '' THEN
      NEW.onboarding_status := 'pending';
    END IF;

    -- Notify about new active creator
    INSERT INTO notifications (type, title, body, metadata)
    VALUES (
      'creator_activated',
      'Neuer aktiver Creator: ' || NEW.name,
      NEW.name || ' ist jetzt aktiv (' || COALESCE(NEW.brand_slug, 'untagged') || '). Affiliate Code: ' || COALESCE(NEW.affiliate_code, v_code) || '. Brand Kit senden + ersten Task zuweisen.',
      jsonb_build_object(
        'creator_id', NEW.id,
        'brand_slug', NEW.brand_slug,
        'affiliate_code', COALESCE(NEW.affiliate_code, v_code)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_onboard ON creators;
CREATE TRIGGER trigger_auto_onboard
BEFORE INSERT OR UPDATE ON creators
FOR EACH ROW EXECUTE FUNCTION auto_onboard_creator();

-- ============================================================================
-- B5. VIEW: weekly_pulse — Aggregated stats for dashboard
-- ============================================================================

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
  FROM creators c, current_week cw
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

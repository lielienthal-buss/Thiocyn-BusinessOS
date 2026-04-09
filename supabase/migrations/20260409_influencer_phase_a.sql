-- ============================================================================
-- Business OS — Influencer Phase A: Cleanup & Activate
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- Adds: brand_fit_score, dormant creator view, brand quota stats view
-- Run AFTER 20260407_content_machine_influencer.sql
-- ============================================================================

-- ============================================================================
-- 1. EXTEND: creators table — brand_fit_score
-- ============================================================================

ALTER TABLE creators ADD COLUMN IF NOT EXISTS brand_fit_score INTEGER DEFAULT NULL;

DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_creators_brand_fit_score
    CHECK (brand_fit_score BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN creators.brand_fit_score IS
'Brand fit quality: 1=strong fit (bio+content+audience), 2=moderate fit, 3=weak fit. Set during bulk tagging.';

CREATE INDEX IF NOT EXISTS idx_creators_brand_fit ON creators(brand_fit_score) WHERE brand_fit_score IS NOT NULL;

-- ============================================================================
-- 2. VIEW: dormant_creators — Re-engagement candidates
-- ============================================================================

CREATE OR REPLACE VIEW dormant_creators AS
SELECT
  c.id,
  c.name,
  c.instagram_url,
  c.email,
  c.brand,
  c.brand_slug,
  c.status,
  c.onboarding_status,
  c.tier,
  c.last_content_date,
  c.total_sales,
  c.content_count,
  c.assigned_operator,
  CASE
    WHEN c.onboarding_status IN ('pending', 'product_sent') THEN 'stalled_onboarding'
    WHEN c.last_content_date < NOW() - INTERVAL '30 days' THEN 'inactive_30d'
    WHEN c.last_content_date < NOW() - INTERVAL '60 days' THEN 'inactive_60d'
    WHEN c.last_content_date IS NULL AND c.status = 'Active' THEN 'never_posted'
    ELSE 'other'
  END AS dormancy_reason,
  NOW() - c.last_content_date AS days_since_last_content
FROM creators c
WHERE c.status = 'Active'
  AND (
    c.onboarding_status IN ('pending', 'product_sent')
    OR c.last_content_date < NOW() - INTERVAL '30 days'
    OR (c.last_content_date IS NULL AND c.status = 'Active')
  )
ORDER BY c.last_content_date ASC NULLS FIRST;

COMMENT ON VIEW dormant_creators IS
'Creators needing re-engagement: stalled onboarding, 30+ days inactive, or never posted.';

-- ============================================================================
-- 3. VIEW: brand_creator_quotas — Current vs target per brand
-- ============================================================================

CREATE OR REPLACE VIEW brand_creator_quotas AS
SELECT
  b.slug AS brand_slug,
  b.name AS brand_name,
  COUNT(c.id) AS current_count,
  COUNT(c.id) FILTER (WHERE c.status = 'Active') AS active_count,
  COUNT(c.id) FILTER (WHERE c.brand_fit_score = 1) AS fit_score_1,
  COUNT(c.id) FILTER (WHERE c.brand_fit_score = 2) AS fit_score_2,
  COUNT(c.id) FILTER (WHERE c.brand_fit_score = 3) AS fit_score_3,
  COUNT(c.id) FILTER (WHERE c.brand_slug IS NULL OR c.brand_slug = '') AS untagged,
  CASE b.slug
    WHEN 'thiocyn' THEN 80
    WHEN 'dr-severin' THEN 50
    WHEN 'paigh' THEN 30
    WHEN 'take-a-shot' THEN 25
    WHEN 'wristr' THEN 15
    ELSE 0
  END AS target_count
FROM brands b
LEFT JOIN creators c ON c.brand_slug = b.slug
WHERE b.status = 'active'
GROUP BY b.slug, b.name
ORDER BY target_count DESC;

COMMENT ON VIEW brand_creator_quotas IS
'Brand creator quotas: current count vs target, with fit score distribution.';

-- ============================================================================
-- 4. VIEW: untagged_creators — Creators without brand assignment
-- ============================================================================

CREATE OR REPLACE VIEW untagged_creators AS
SELECT
  c.id,
  c.name,
  c.instagram_url,
  c.email,
  c.brand,
  c.status,
  c.follower_range,
  c.tier,
  c.total_sales,
  c.notes,
  c.created_at
FROM creators c
WHERE (c.brand_slug IS NULL OR c.brand_slug = '')
  AND c.status != 'churned'
ORDER BY c.status DESC, c.created_at DESC;

COMMENT ON VIEW untagged_creators IS
'All creators without brand_slug assignment, excluding churned. Primary target for Phase A bulk tagging.';

-- Migration: Data Integrity — sync triggers, config-driven quotas, composite FKs
-- Date: 2026-04-12
-- Project: dfzrkzvsdiiihoejfozn

-- =============================================================================
-- 1. Trigger: Sync creators.brand_slug → creator_brands (primary)
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_creator_primary_brand()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.brand_slug IS NOT NULL AND (OLD IS NULL OR OLD.brand_slug IS DISTINCT FROM NEW.brand_slug) THEN
    -- Deactivate old primary if brand changed
    IF OLD IS NOT NULL AND OLD.brand_slug IS NOT NULL AND OLD.brand_slug != NEW.brand_slug THEN
      UPDATE creator_brands SET active = FALSE, ended_at = NOW()
      WHERE creator_id = NEW.id AND brand_slug = OLD.brand_slug AND role = 'primary';
    END IF;

    -- Upsert new primary
    INSERT INTO creator_brands (creator_id, brand_slug, role, active)
    VALUES (NEW.id, NEW.brand_slug, 'primary', TRUE)
    ON CONFLICT (creator_id, brand_slug) DO UPDATE SET
      role = 'primary', active = TRUE, ended_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_primary_brand ON creators;
CREATE TRIGGER trigger_sync_primary_brand
AFTER INSERT OR UPDATE OF brand_slug ON creators
FOR EACH ROW EXECUTE FUNCTION sync_creator_primary_brand();

-- =============================================================================
-- 2. Move brand quotas to brand_configs
-- =============================================================================

ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS creator_target_count INTEGER DEFAULT 0;

-- Seed values (safe upsert — only updates rows that match existing brand slugs)
UPDATE brand_configs SET creator_target_count = 80
WHERE brand_slug = (SELECT slug FROM brands WHERE slug = 'thiocyn');

UPDATE brand_configs SET creator_target_count = 50
WHERE brand_slug = (SELECT slug FROM brands WHERE slug = 'dr-severin');

UPDATE brand_configs SET creator_target_count = 30
WHERE brand_slug = (SELECT slug FROM brands WHERE slug = 'paigh');

UPDATE brand_configs SET creator_target_count = 25
WHERE brand_slug = (SELECT slug FROM brands WHERE slug = 'take-a-shot');

UPDATE brand_configs SET creator_target_count = 15
WHERE brand_slug = (SELECT slug FROM brands WHERE slug = 'wristr');

-- Recreate view: config-driven instead of hardcoded CASE
CREATE OR REPLACE VIEW brand_creator_quotas AS
SELECT
  b.slug,
  b.name,
  COUNT(c.id)                                        AS current_count,
  COUNT(c.id) FILTER (WHERE c.status = 'Active')     AS active_count,
  COUNT(c.id) FILTER (WHERE c.brand_fit_score = 1)   AS fit_1_count,
  COUNT(c.id) FILTER (WHERE c.brand_fit_score = 2)   AS fit_2_count,
  COUNT(c.id) FILTER (WHERE c.brand_fit_score = 3)   AS fit_3_count,
  COUNT(c.id) FILTER (WHERE c.brand_slug IS NULL)     AS untagged,
  COALESCE(bc.creator_target_count, 0)                AS target_count
FROM brands b
LEFT JOIN creators c ON c.brand_slug = b.slug
LEFT JOIN brand_configs bc ON bc.brand_slug = b.slug
WHERE b.status = 'active'
GROUP BY b.slug, b.name, bc.creator_target_count;

-- =============================================================================
-- 3. Composite FK: creator_tasks.angle_code → creative_angles
-- =============================================================================

-- Ensure unique constraint exists on creative_angles(brand_slug, code)
DO $$ BEGIN
  ALTER TABLE creative_angles ADD CONSTRAINT uq_angles_brand_code UNIQUE (brand_slug, code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add composite FK (nullable angle_code — only validates non-null values)
DO $$ BEGIN
  ALTER TABLE creator_tasks ADD CONSTRAINT fk_ctasks_angle
    FOREIGN KEY (brand_slug, angle_code) REFERENCES creative_angles(brand_slug, code) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 4. Backfill creator_brands for existing data
-- =============================================================================

INSERT INTO creator_brands (creator_id, brand_slug, role, active)
SELECT c.id, c.brand_slug, 'primary', TRUE
FROM creators c
WHERE c.brand_slug IS NOT NULL
ON CONFLICT (creator_id, brand_slug) DO NOTHING;

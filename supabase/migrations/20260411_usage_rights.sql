-- ============================================================================
-- Business OS — Usage Rights Enforcement & Content Rejection Flow
-- ============================================================================
-- 1. usage_rights_consent table (tracks written consent for paid ad usage)
-- 2. ALTER creative_assets — add usage rights columns
-- 3. REPLACE push_creator_content_to_ads() — add usage rights check
-- 4. ALTER creator_tasks — add rejection flow (rejected / resubmitted)
-- 5. VIEW usage_rights_overview — compliance dashboard
--
-- Run AFTER 20260410_tier_realignment.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLE: usage_rights_consent
-- ============================================================================
-- Tracks written consent for content usage in paid ads.
-- One active consent per (creator, brand, type) enforced via partial unique.

CREATE TABLE IF NOT EXISTS usage_rights_consent (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_slug     TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  consent_type   TEXT NOT NULL CHECK (consent_type IN ('organic', 'whitelisting', 'paid_usage')),
  granted_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ,        -- 3 months for whitelisting, NULL for perpetual
  document_url   TEXT,                -- link to signed consent form
  active         BOOLEAN DEFAULT TRUE,
  revoked_at     TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE usage_rights_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read usage_rights_consent"
  ON usage_rights_consent FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert usage_rights_consent"
  ON usage_rights_consent FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update usage_rights_consent"
  ON usage_rights_consent FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete usage_rights_consent"
  ON usage_rights_consent FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_urc_creator_brand
  ON usage_rights_consent (creator_id, brand_slug);

CREATE INDEX IF NOT EXISTS idx_urc_active
  ON usage_rights_consent (active) WHERE active = TRUE;

-- Only one active consent per (creator, brand, consent_type)
CREATE UNIQUE INDEX IF NOT EXISTS uq_urc_active_consent
  ON usage_rights_consent (creator_id, brand_slug, consent_type)
  WHERE active = TRUE;

-- updated_at trigger
CREATE TRIGGER set_updated_at_usage_rights_consent
  BEFORE UPDATE ON usage_rights_consent
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 2. ALTER creative_assets — add usage rights columns
-- ============================================================================

ALTER TABLE creative_assets ADD COLUMN IF NOT EXISTS paid_usage_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE creative_assets ADD COLUMN IF NOT EXISTS usage_rights_tier TEXT;
ALTER TABLE creative_assets ADD COLUMN IF NOT EXISTS usage_consent_id UUID;

-- CHECK constraint (idempotent)
DO $$ BEGIN
  ALTER TABLE creative_assets ADD CONSTRAINT chk_usage_rights_tier
    CHECK (usage_rights_tier IN ('organic_only', 'whitelisting', 'full_paid'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FK to usage_rights_consent (idempotent)
DO $$ BEGIN
  ALTER TABLE creative_assets ADD CONSTRAINT fk_assets_usage_consent
    FOREIGN KEY (usage_consent_id) REFERENCES usage_rights_consent(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 3. FUNCTION: push_creator_content_to_ads (replaces Phase C version)
-- ============================================================================
-- Creates a creative_assets row from an approved creator task.
-- Now enforces usage rights based on creator tier:
--   gifting / affiliate  → organic_only, paid_usage_allowed = FALSE
--   influencer           → requires active whitelisting/paid_usage consent
--   ambassador           → full_paid, paid_usage_allowed = TRUE

CREATE OR REPLACE FUNCTION push_creator_content_to_ads(p_task_id UUID)
RETURNS UUID AS $$
DECLARE
  v_task         RECORD;
  v_creator      RECORD;
  v_angle_id     UUID;
  v_asset_id     UUID;
  v_asset_name   TEXT;
  v_format       TEXT;
  v_usage_tier   TEXT;
  v_paid_allowed BOOLEAN;
  v_consent_id   UUID;
BEGIN
  -- Get task
  SELECT * INTO v_task FROM creator_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task % not found', p_task_id;
  END IF;

  -- Get creator with tier
  SELECT * INTO v_creator FROM creators WHERE id = v_task.creator_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Creator not found for task %', p_task_id;
  END IF;

  -- Determine usage rights based on tier
  IF v_creator.tier IN ('gifting', 'affiliate') THEN
    v_usage_tier   := 'organic_only';
    v_paid_allowed := FALSE;
    v_consent_id   := NULL;

  ELSIF v_creator.tier = 'influencer' THEN
    -- Check for active whitelisting or paid_usage consent
    SELECT id INTO v_consent_id
    FROM usage_rights_consent
    WHERE creator_id   = v_creator.id
      AND brand_slug   = v_task.brand_slug
      AND consent_type IN ('whitelisting', 'paid_usage')
      AND active       = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY consent_type DESC   -- prefer paid_usage over whitelisting
    LIMIT 1;

    IF v_consent_id IS NULL THEN
      RAISE EXCEPTION
        'Whitelisting consent required for tier "influencer" creator "%" (brand: %). '
        'Add consent via usage_rights_consent table first.',
        v_creator.name, v_task.brand_slug;
    END IF;
    v_usage_tier   := 'whitelisting';
    v_paid_allowed := TRUE;

  ELSE  -- ambassador
    v_usage_tier   := 'full_paid';
    v_paid_allowed := TRUE;
    -- Get consent record if exists (optional for ambassadors)
    SELECT id INTO v_consent_id
    FROM usage_rights_consent
    WHERE creator_id = v_creator.id
      AND brand_slug = v_task.brand_slug
      AND active     = TRUE
    LIMIT 1;
  END IF;

  -- Resolve angle
  IF v_task.angle_code IS NOT NULL THEN
    SELECT id INTO v_angle_id
    FROM creative_angles
    WHERE brand_slug = v_task.brand_slug AND code = v_task.angle_code
    LIMIT 1;
  END IF;

  -- Build asset name
  v_format     := UPPER(COALESCE(v_task.submission_type, 'UGC'));
  v_asset_name := UPPER(REPLACE(v_task.brand_slug, '-', '')) || '_' ||
                  UPPER(LEFT(REGEXP_REPLACE(v_creator.name, '[^a-zA-Z]', '', 'g'), 6)) ||
                  '_KW' || v_task.week_number ||
                  '_' || v_format || '_V1';

  -- Insert creative asset with usage rights
  INSERT INTO creative_assets (
    brand_slug, angle_id, asset_name, format, platform, status,
    storage_url, produced_by, notes,
    paid_usage_allowed, usage_rights_tier, usage_consent_id
  ) VALUES (
    v_task.brand_slug, v_angle_id, v_asset_name, v_format, 'IG', 'ready',
    v_task.submission_url, 'creator',
    'Auto-pushed from creator task ' || p_task_id::TEXT,
    v_paid_allowed, v_usage_tier, v_consent_id
  ) RETURNING id INTO v_asset_id;

  -- Link task to asset
  UPDATE creator_tasks SET asset_id = v_asset_id WHERE id = p_task_id;

  RETURN v_asset_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 4. ALTER creator_tasks — rejection flow
-- ============================================================================
-- Adds 'rejected' and 'resubmitted' to the status CHECK,
-- plus columns for rejection reason and resubmission tracking.

-- Drop the existing inline CHECK on status (may be unnamed)
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT con.conname INTO v_constraint_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attnum = ANY(con.conkey)
    AND att.attrelid = con.conrelid
  WHERE con.conrelid = 'creator_tasks'::regclass
    AND con.contype  = 'c'
    AND att.attname  = 'status'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE creator_tasks DROP CONSTRAINT ' || v_constraint_name;
  END IF;
END $$;

-- Recreate with rejected + resubmitted
ALTER TABLE creator_tasks ADD CONSTRAINT chk_ctasks_status
  CHECK (status IN (
    'sent', 'acknowledged', 'submitted', 'feedback_given',
    'approved', 'overdue', 'skipped', 'rejected', 'resubmitted'
  ));

-- Rejection columns
ALTER TABLE creator_tasks ADD COLUMN IF NOT EXISTS rejection_reason      TEXT;
ALTER TABLE creator_tasks ADD COLUMN IF NOT EXISTS resubmission_deadline DATE;
ALTER TABLE creator_tasks ADD COLUMN IF NOT EXISTS original_task_id      UUID;

DO $$ BEGIN
  ALTER TABLE creator_tasks ADD CONSTRAINT fk_ctasks_original
    FOREIGN KEY (original_task_id) REFERENCES creator_tasks(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- 5. VIEW: usage_rights_overview — compliance dashboard
-- ============================================================================

CREATE OR REPLACE VIEW usage_rights_overview AS
SELECT
  c.id                AS creator_id,
  c.name              AS creator_name,
  c.tier,
  c.brand_slug,
  CASE c.tier
    WHEN 'gifting'    THEN 'organic_only'
    WHEN 'affiliate'  THEN 'organic_only'
    WHEN 'influencer' THEN 'whitelisting'
    WHEN 'ambassador' THEN 'full_paid'
  END                 AS tier_usage_level,
  urc.id              AS consent_id,
  urc.consent_type,
  urc.active          AS consent_active,
  urc.expires_at      AS consent_expires,
  urc.document_url,
  CASE
    WHEN c.tier IN ('gifting', 'affiliate') THEN FALSE
    WHEN c.tier = 'ambassador' THEN TRUE
    WHEN c.tier = 'influencer'
      AND urc.active = TRUE
      AND (urc.expires_at IS NULL OR urc.expires_at > NOW()) THEN TRUE
    ELSE FALSE
  END                 AS can_use_in_paid_ads,
  -- Count assets pushed without proper consent
  (SELECT COUNT(*)
   FROM creative_assets ca
   WHERE ca.produced_by        = 'creator'
     AND ca.brand_slug         = c.brand_slug
     AND ca.paid_usage_allowed = TRUE
     AND c.tier NOT IN ('ambassador')
     AND NOT EXISTS (
       SELECT 1 FROM usage_rights_consent urc2
       WHERE urc2.creator_id = c.id
         AND urc2.brand_slug = c.brand_slug
         AND urc2.active     = TRUE
         AND (urc2.expires_at IS NULL OR urc2.expires_at > NOW())
     )
  )                   AS assets_without_consent
FROM creators c
LEFT JOIN usage_rights_consent urc
  ON  urc.creator_id = c.id
  AND urc.brand_slug = c.brand_slug
  AND urc.active     = TRUE
WHERE c.status = 'Active'
ORDER BY c.tier, c.brand_slug, c.name;

COMMIT;

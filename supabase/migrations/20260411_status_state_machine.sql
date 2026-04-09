-- ============================================================================
-- Business OS — Creator Status State Machine
-- ============================================================================
-- Adds composite CHECK constraint enforcing valid (status, onboarding_status)
-- combinations, plus supporting columns and trigger for churned_at.
-- ============================================================================

-- 1. Add new columns
ALTER TABLE creators ADD COLUMN IF NOT EXISTS churned_at TIMESTAMPTZ;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS pause_reason TEXT;

-- 2. Clean up existing data before constraint
UPDATE creators SET onboarding_status = 'active'
WHERE status = 'Active' AND onboarding_status = 'pending';

UPDATE creators SET onboarding_status = 'pending'
WHERE status IN ('Prospect', 'Contacted', 'Interested')
  AND onboarding_status IS NOT NULL AND onboarding_status != 'pending';

UPDATE creators SET churned_at = NOW()
WHERE onboarding_status = 'churned' AND churned_at IS NULL;

-- 3. Add composite CHECK constraint (NOT VALID first, then validate)
DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_status_onboarding_consistency CHECK (
    CASE
      WHEN status IN ('Prospect', 'Contacted', 'Interested')
        THEN onboarding_status IS NULL OR onboarding_status = 'pending'
      WHEN status = 'Product sent'
        THEN onboarding_status IN ('pending', 'product_sent')
      WHEN status = 'Content posted'
        THEN onboarding_status IN ('product_sent', 'first_video')
      WHEN status = 'Active'
        THEN onboarding_status IN ('active', 'paused', 'churned')
      ELSE TRUE
    END
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE creators VALIDATE CONSTRAINT chk_status_onboarding_consistency;

-- 4. Trigger: auto-set / clear churned_at on status transitions
CREATE OR REPLACE FUNCTION auto_set_churned_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.onboarding_status = 'churned' AND (OLD.onboarding_status IS NULL OR OLD.onboarding_status != 'churned') THEN
    NEW.churned_at := NOW();
  END IF;

  IF NEW.onboarding_status != 'churned' AND OLD.onboarding_status = 'churned' THEN
    NEW.churned_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_churned_at ON creators;
CREATE TRIGGER trigger_auto_churned_at
BEFORE UPDATE ON creators
FOR EACH ROW EXECUTE FUNCTION auto_set_churned_at();

-- 5. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_creators_status_onboarding ON creators(status, onboarding_status);
CREATE INDEX IF NOT EXISTS idx_creators_churned ON creators(churned_at) WHERE churned_at IS NOT NULL;

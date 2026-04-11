-- ============================================================================
-- Welle 2 — Treasury Foundation
-- ============================================================================
-- 1. ALTER finance_pipeline: mahnstufe + priority_tier + scheduled_pay_date +
--    late_fee_risk_eur + auto_paid + schedule_rationale
-- 2. CREATE TABLE finance_mahnungen (1:n history per invoice)
-- 3. CREATE TABLE cash_snapshots (account balance snapshots)
--
-- Mahnstufen-Skala: 0=keine, 1=Erinnerung, 2=1.Mahnung, 3=2./Letzte, 4=Inkasso
-- Priority Tier:    1=Logistik, 2=Behörden, 3=SV, 4=Gehälter, 5=Ads,
--                   6=Lieferanten, 7=Tools, 8=Freelancer
--                   (per system/memory/finance/sops/zahlungspriorisierung.md)
-- ============================================================================

-- ============================================================================
-- 1. ALTER finance_pipeline (additive)
-- ============================================================================

ALTER TABLE finance_pipeline ADD COLUMN IF NOT EXISTS mahnstufe SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE finance_pipeline ADD COLUMN IF NOT EXISTS priority_tier SMALLINT;
ALTER TABLE finance_pipeline ADD COLUMN IF NOT EXISTS scheduled_pay_date DATE;
ALTER TABLE finance_pipeline ADD COLUMN IF NOT EXISTS late_fee_risk_eur NUMERIC(10,2);
ALTER TABLE finance_pipeline ADD COLUMN IF NOT EXISTS auto_paid BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE finance_pipeline ADD COLUMN IF NOT EXISTS schedule_rationale TEXT;

DO $$ BEGIN
  ALTER TABLE finance_pipeline ADD CONSTRAINT chk_fp_mahnstufe CHECK (mahnstufe BETWEEN 0 AND 4);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE finance_pipeline ADD CONSTRAINT chk_fp_priority_tier CHECK (priority_tier IS NULL OR priority_tier BETWEEN 1 AND 8);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 2. CREATE TABLE finance_mahnungen
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_mahnungen (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id       UUID REFERENCES finance_pipeline(id) ON DELETE CASCADE,
  vendor            TEXT NOT NULL,
  entity            TEXT NOT NULL,
  stufe             SMALLINT NOT NULL CHECK (stufe BETWEEN 1 AND 4),
  amount_eur        NUMERIC(10,2) NOT NULL,
  mahngebuehren_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  received_at       DATE NOT NULL,
  deadline          DATE,
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'disputed', 'cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_pipeline ON finance_mahnungen (pipeline_id);
CREATE INDEX IF NOT EXISTS idx_fm_status_deadline ON finance_mahnungen (status, deadline) WHERE status = 'open';

DO $$ BEGIN
  CREATE TRIGGER set_updated_at_finance_mahnungen
    BEFORE UPDATE ON finance_mahnungen
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE finance_mahnungen ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY fm_select ON finance_mahnungen FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY fm_insert ON finance_mahnungen FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY fm_update ON finance_mahnungen FOR UPDATE TO authenticated USING (is_admin_or_owner()) WITH CHECK (is_admin_or_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY fm_delete ON finance_mahnungen FOR DELETE TO authenticated USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 3. CREATE TABLE cash_snapshots
-- ============================================================================
-- Strenger RLS als finance_pipeline: nur admin/owner liest (sensible Cash-Daten).
-- Snapshots sind immutable (kein updated_at), nur Owner kann editieren.

CREATE TABLE IF NOT EXISTS cash_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account       TEXT NOT NULL,
  account_label TEXT,
  balance       NUMERIC(12,2) NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'EUR',
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'qonto_api', 'paypal_api')),
  notes         TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cs_date ON cash_snapshots (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_cs_account_date ON cash_snapshots (account, snapshot_date DESC);

ALTER TABLE cash_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY cs_select ON cash_snapshots FOR SELECT TO authenticated USING (is_admin_or_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cs_insert ON cash_snapshots FOR INSERT TO authenticated WITH CHECK (is_admin_or_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cs_update ON cash_snapshots FOR UPDATE TO authenticated USING (is_owner()) WITH CHECK (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cs_delete ON cash_snapshots FOR DELETE TO authenticated USING (is_owner());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

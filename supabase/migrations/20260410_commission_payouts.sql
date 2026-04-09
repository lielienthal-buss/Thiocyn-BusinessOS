-- ============================================================================
-- Business OS — Commission & Payout Tracking System
-- ============================================================================
-- Creates the commission calculation and payout infrastructure for the
-- creator program. Tracks monthly commissions per creator per brand,
-- enforces the 25% CAC cap, handles carry-forward for sub-threshold
-- amounts, and records actual payouts.
--
-- Business rules:
--   T1 Gifting:    product only, no monetary commission
--   T2 Affiliate:  10-15% commission, customer 10% discount, CAC <= 25%
--   T3 Influencer: flat fee per post (150-800), CAC <= 25%
--   T4 Ambassador: monthly retainer (300-2500) + perf bonus, CAC <= 25%
--   Minimum payout threshold: 20 EUR (below = carry forward)
--
-- Run AFTER 20260410_tier_realignment.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. creator_commissions — monthly commission records
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  brand_slug TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Revenue data
  order_count INTEGER DEFAULT 0,
  gross_revenue NUMERIC(10,2) DEFAULT 0,
  -- Commission calculation
  tier_at_calculation TEXT NOT NULL,
  compensation_model TEXT NOT NULL CHECK (compensation_model IN ('product_only', 'commission', 'flat_fee', 'retainer')),
  commission_pct NUMERIC(4,2),
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  flat_fee_total NUMERIC(10,2),
  retainer_amount NUMERIC(10,2),
  performance_bonus NUMERIC(10,2) DEFAULT 0,
  -- CAC tracking
  customer_discount_pct NUMERIC(4,2) DEFAULT 10.0,
  total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cac_pct NUMERIC(5,2),
  -- Status
  status TEXT NOT NULL DEFAULT 'calculated' CHECK (status IN ('calculated', 'below_threshold', 'approved', 'paid', 'cancelled', 'carried_forward')),
  carried_from_id UUID REFERENCES creator_commissions(id),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (creator_id, brand_slug, period_start, period_end)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_commissions_creator ON creator_commissions(creator_id);
CREATE INDEX IF NOT EXISTS idx_commissions_brand ON creator_commissions(brand_slug);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON creator_commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON creator_commissions(period_start, period_end);

-- RLS
ALTER TABLE creator_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_commissions" ON creator_commissions;
CREATE POLICY "authenticated_read_commissions" ON creator_commissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_commissions" ON creator_commissions;
CREATE POLICY "authenticated_write_commissions" ON creator_commissions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_commissions_updated_at ON creator_commissions;
CREATE TRIGGER trigger_commissions_updated_at
  BEFORE UPDATE ON creator_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. creator_payouts — actual payment records
-- ============================================================================

CREATE TABLE IF NOT EXISTS creator_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  commission_ids UUID[] NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'bank_transfer')),
  payment_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON creator_payouts(status);

-- RLS
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_payouts" ON creator_payouts;
CREATE POLICY "authenticated_read_payouts" ON creator_payouts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_write_payouts" ON creator_payouts;
CREATE POLICY "authenticated_write_payouts" ON creator_payouts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_payouts_updated_at ON creator_payouts;
CREATE TRIGGER trigger_payouts_updated_at
  BEFORE UPDATE ON creator_payouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ALTER creators — add payment fields
-- ============================================================================

ALTER TABLE creators ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS payment_email TEXT;

DO $$ BEGIN
  ALTER TABLE creators ADD CONSTRAINT chk_creators_payment_method
    CHECK (payment_method IN ('paypal', 'bank_transfer'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. VIEW monthly_commission_summary
-- ============================================================================

CREATE OR REPLACE VIEW monthly_commission_summary AS
SELECT
  cc.period_start,
  cc.period_end,
  cc.brand_slug,
  b.name AS brand_name,
  cc.creator_id,
  c.name AS creator_name,
  c.tier,
  cc.compensation_model,
  cc.order_count,
  cc.gross_revenue,
  cc.commission_amount,
  cc.flat_fee_total,
  cc.retainer_amount,
  cc.performance_bonus,
  cc.total_cost,
  cc.total_cac_pct,
  cc.status,
  cc.approved_by,
  cc.approved_at,
  -- Payout info
  p.id AS payout_id,
  p.status AS payout_status,
  p.payment_method AS payout_method,
  p.processed_at AS payout_date
FROM creator_commissions cc
JOIN creators c ON c.id = cc.creator_id
JOIN brands b ON b.slug = cc.brand_slug
LEFT JOIN creator_payouts p ON cc.id = ANY(p.commission_ids)
ORDER BY cc.period_start DESC, cc.brand_slug, cc.total_cost DESC;

-- ============================================================================
-- 5. FUNCTION calculate_monthly_commissions(p_month DATE)
-- ============================================================================
-- Calculates commissions for all active creators for the given month.
-- Returns a summary table. Handles carry-forward for sub-threshold amounts.
-- Upserts into creator_commissions (safe to re-run).

CREATE OR REPLACE FUNCTION calculate_monthly_commissions(p_month DATE)
RETURNS TABLE (
  creator_name TEXT,
  brand TEXT,
  tier TEXT,
  model TEXT,
  gross_revenue NUMERIC,
  total_cost NUMERIC,
  cac_pct NUMERIC,
  status TEXT
) AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
  v_creator RECORD;
  v_revenue NUMERIC;
  v_cost NUMERIC;
  v_cac NUMERIC;
  v_status TEXT;
  v_tasks_count INTEGER;
  v_carried NUMERIC;
BEGIN
  v_period_start := DATE_TRUNC('month', p_month)::DATE;
  v_period_end := (DATE_TRUNC('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  FOR v_creator IN
    SELECT cr.id, cr.name, cr.brand_slug, cr.tier, cr.compensation_model,
           cr.affiliate_pct, cr.flat_fee_eur, cr.retainer_eur, cr.total_revenue
    FROM creators cr
    WHERE cr.status = 'Active'
      AND cr.tier != 'gifting'
      AND cr.compensation_model != 'product_only'
  LOOP
    -- Revenue: aggregate from creator_performance for weeks within the month
    SELECT COALESCE(SUM(cp.revenue), 0) INTO v_revenue
    FROM creator_performance cp
    WHERE cp.creator_id = v_creator.id
      AND (cp.year * 100 + cp.week_number) >= (EXTRACT(YEAR FROM v_period_start) * 100 + EXTRACT(WEEK FROM v_period_start))
      AND (cp.year * 100 + cp.week_number) <= (EXTRACT(YEAR FROM v_period_end) * 100 + EXTRACT(WEEK FROM v_period_end));

    -- Calculate cost based on compensation model
    v_cost := 0;

    IF v_creator.compensation_model = 'commission' THEN
      -- T2 Affiliate: commission_pct x gross_revenue
      v_cost := ROUND(v_revenue * COALESCE(v_creator.affiliate_pct, 10) / 100, 2);

    ELSIF v_creator.compensation_model = 'flat_fee' THEN
      -- T3 Influencer: count approved tasks x flat_fee_eur
      SELECT COUNT(*) INTO v_tasks_count
      FROM creator_tasks ct
      WHERE ct.creator_id = v_creator.id
        AND ct.status = 'approved'
        AND ct.created_at BETWEEN v_period_start AND v_period_end + INTERVAL '1 day';
      v_cost := v_tasks_count * COALESCE(v_creator.flat_fee_eur, 0);

    ELSIF v_creator.compensation_model = 'retainer' THEN
      -- T4 Ambassador: fixed retainer + performance bonus if GMV > 3x retainer
      v_cost := COALESCE(v_creator.retainer_eur, 0);
      IF v_revenue > (COALESCE(v_creator.retainer_eur, 0) * 3) THEN
        v_cost := v_cost + LEAST(v_revenue * 0.05, 300);
      END IF;
    END IF;

    -- Calculate CAC%
    IF v_revenue > 0 THEN
      v_cac := ROUND((v_cost / v_revenue) * 100, 2);
    ELSE
      v_cac := NULL;
    END IF;

    -- Check minimum threshold (20 EUR)
    IF v_cost < 20 AND v_creator.compensation_model = 'commission' THEN
      v_status := 'below_threshold';
    ELSE
      v_status := 'calculated';
    END IF;

    -- Check for carried forward amount from previous months
    SELECT COALESCE(SUM(cc2.total_cost), 0) INTO v_carried
    FROM creator_commissions cc2
    WHERE cc2.creator_id = v_creator.id
      AND cc2.brand_slug = v_creator.brand_slug
      AND cc2.status = 'below_threshold'
      AND cc2.period_end < v_period_start;

    IF v_carried > 0 AND v_cost + v_carried >= 20 THEN
      v_cost := v_cost + v_carried;
      v_status := 'calculated';
      -- Mark old below-threshold records as carried forward
      UPDATE creator_commissions
      SET status = 'carried_forward'
      WHERE creator_id = v_creator.id
        AND brand_slug = v_creator.brand_slug
        AND status = 'below_threshold'
        AND period_end < v_period_start;
    END IF;

    -- Upsert commission record
    INSERT INTO creator_commissions (
      creator_id, brand_slug, period_start, period_end,
      order_count, gross_revenue,
      tier_at_calculation, compensation_model,
      commission_pct, commission_amount,
      flat_fee_total, retainer_amount, performance_bonus,
      total_cost, total_cac_pct, status
    ) VALUES (
      v_creator.id, v_creator.brand_slug, v_period_start, v_period_end,
      0, v_revenue,
      v_creator.tier, v_creator.compensation_model,
      v_creator.affiliate_pct,
      CASE WHEN v_creator.compensation_model = 'commission' THEN v_cost ELSE 0 END,
      CASE WHEN v_creator.compensation_model = 'flat_fee' THEN v_cost ELSE NULL END,
      CASE WHEN v_creator.compensation_model = 'retainer' THEN COALESCE(v_creator.retainer_eur, 0) ELSE NULL END,
      CASE WHEN v_creator.compensation_model = 'retainer' AND v_cost > COALESCE(v_creator.retainer_eur, 0)
           THEN v_cost - COALESCE(v_creator.retainer_eur, 0) ELSE 0 END,
      v_cost, v_cac, v_status
    )
    ON CONFLICT (creator_id, brand_slug, period_start, period_end) DO UPDATE SET
      gross_revenue = EXCLUDED.gross_revenue,
      commission_amount = EXCLUDED.commission_amount,
      flat_fee_total = EXCLUDED.flat_fee_total,
      retainer_amount = EXCLUDED.retainer_amount,
      performance_bonus = EXCLUDED.performance_bonus,
      total_cost = EXCLUDED.total_cost,
      total_cac_pct = EXCLUDED.total_cac_pct,
      status = EXCLUDED.status,
      updated_at = NOW();

    RETURN QUERY SELECT
      v_creator.name::TEXT,
      v_creator.brand_slug::TEXT,
      v_creator.tier::TEXT,
      v_creator.compensation_model::TEXT,
      v_revenue,
      v_cost,
      v_cac,
      v_status::TEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. pg_cron — monthly commission calculation
-- ============================================================================
-- Runs on the 1st of each month at 03:00 UTC for the previous month.
-- Requires pg_cron extension (enabled on Supabase by default).

SELECT cron.schedule(
  'monthly-commission-calc',
  '0 3 1 * *',
  $$SELECT * FROM calculate_monthly_commissions((CURRENT_DATE - INTERVAL '1 month')::DATE);$$
);

-- ============================================================================
-- Done. Verify:
--   SELECT * FROM creator_commissions LIMIT 5;
--   SELECT * FROM creator_payouts LIMIT 5;
--   SELECT payment_method, payment_email FROM creators LIMIT 5;
--   SELECT * FROM monthly_commission_summary LIMIT 5;
--   SELECT * FROM calculate_monthly_commissions('2026-03-01');
--   SELECT * FROM cron.job WHERE jobname = 'monthly-commission-calc';
-- ============================================================================

COMMIT;

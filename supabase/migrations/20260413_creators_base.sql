-- Documentation migration: creators base table (pre-existing in live DB, no prior migration)

CREATE TABLE IF NOT EXISTS creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instagram_url text,
  email text,
  brand text,
  status text DEFAULT 'Prospect',
  follower_range text,
  notes text,
  created_at timestamptz DEFAULT now(),
  tier text DEFAULT 'starter',
  affiliate_code text,
  affiliate_pct numeric DEFAULT 5.0,
  total_sales integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  content_count integer DEFAULT 0,
  last_content_date timestamptz,
  assigned_operator text,
  onboarding_status text DEFAULT 'pending',
  brand_slug text,
  tier_updated_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  compensation_model text DEFAULT 'product_only',
  retainer_eur numeric,
  flat_fee_eur numeric,
  cac_pct numeric,
  payment_method text,
  payment_email text,
  churned_at timestamptz,
  pause_reason text,
  brand_fit_score integer
);

-- Enable RLS
ALTER TABLE IF EXISTS creators ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and manage their own creator records
CREATE POLICY IF NOT EXISTS "authenticated_read_creators" ON creators
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "authenticated_manage_creators" ON creators
  FOR UPDATE
  USING (auth.role() = 'authenticated');

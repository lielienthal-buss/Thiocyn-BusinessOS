-- ============================================================================
-- Business OS — Shopify Support Tables
-- Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- Creates: integration_secrets, product_performance, shopify_sync_log
-- Alters:  brand_configs (adds Shopify columns)
-- Schedules: weekly Shopify sync via pg_cron
-- Run AFTER 20260409_influencer_phase_c.sql
-- ============================================================================

-- ============================================================================
-- 1. integration_secrets — encrypted API credentials per brand
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  integration TEXT NOT NULL CHECK (integration IN ('shopify', 'paypal', 'meta', 'tiktok', 'google')),
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_slug, integration, key_name)
);

CREATE INDEX IF NOT EXISTS idx_integration_secrets_brand_integration
  ON integration_secrets (brand_slug, integration);

ALTER TABLE integration_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_integration_secrets"
  ON integration_secrets FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_integration_secrets"
  ON integration_secrets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_integration_secrets"
  ON integration_secrets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_integration_secrets"
  ON integration_secrets FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_integration_secrets_updated_at
  BEFORE UPDATE ON integration_secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. product_performance — aggregated product sales data
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug TEXT NOT NULL REFERENCES brands(slug) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_title TEXT,
  variant_title TEXT,
  total_orders INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  creator_attributed_orders INTEGER DEFAULT 0,
  creator_attributed_revenue NUMERIC(10,2) DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'last_7d',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_slug, product_id, period)
);

CREATE INDEX IF NOT EXISTS idx_product_performance_brand
  ON product_performance (brand_slug);

CREATE INDEX IF NOT EXISTS idx_product_performance_brand_period
  ON product_performance (brand_slug, period);

ALTER TABLE product_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_product_performance"
  ON product_performance FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_write_product_performance"
  ON product_performance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_product_performance"
  ON product_performance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_delete_product_performance"
  ON product_performance FOR DELETE TO authenticated USING (true);

CREATE TRIGGER set_product_performance_updated_at
  BEFORE UPDATE ON product_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. shopify_sync_log — audit trail for sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopify_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug TEXT NOT NULL,
  sync_type TEXT DEFAULT 'orders',
  orders_fetched INTEGER DEFAULT 0,
  orders_matched INTEGER DEFAULT 0,
  revenue_total NUMERIC(10,2) DEFAULT 0,
  creator_revenue NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_brand_created
  ON shopify_sync_log (brand_slug, created_at DESC);

ALTER TABLE shopify_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_shopify_sync_log"
  ON shopify_sync_log FOR SELECT TO authenticated USING (true);

-- No client-side write policies — writes happen via service_role from edge functions

-- ============================================================================
-- 4. brand_configs — create if missing, then add Shopify columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS brand_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug TEXT NOT NULL UNIQUE REFERENCES brands(slug) ON DELETE CASCADE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS shopify_store_url TEXT;
ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS shopify_api_version TEXT DEFAULT '2024-10';
ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS shopify_sync_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE brand_configs ADD COLUMN IF NOT EXISTS shopify_last_sync_at TIMESTAMPTZ;

-- Enable RLS + policies only if table was just created (idempotent via IF NOT EXISTS)
ALTER TABLE brand_configs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "authenticated_read_brand_configs"
    ON brand_configs FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_write_brand_configs"
    ON brand_configs FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_update_brand_configs"
    ON brand_configs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated_delete_brand_configs"
    ON brand_configs FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Trigger: safe create (may already exist if table existed)
DO $$ BEGIN
  CREATE TRIGGER set_brand_configs_updated_at
    BEFORE UPDATE ON brand_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 5. pg_cron — weekly Shopify sync schedule (Tuesday 06:00 UTC)
-- ============================================================================

SELECT cron.schedule(
  'shopify-weekly-sync',
  '0 6 * * 2',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-shopify-sales',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"sync_all_brands": true}'::jsonb
  );
  $$
);

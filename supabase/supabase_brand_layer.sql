-- ============================================================================
-- Business OS — Brand Layer
-- Hart Limes GmbH | Supabase Project: dfzrkzvsdiiihoejfozn
-- ============================================================================
-- Tables: brands, brand_configs, agent_logs
-- Run AFTER supabase_business_os.sql
-- Safe: IF NOT EXISTS / OR REPLACE — idempotent on existing data
-- ============================================================================

-- ============================================================================
-- TABLE: brands
-- ============================================================================
-- Central registry of all Hart Limes brands.
-- Used as FK reference across team_tasks, disputes, invoices, ad_campaigns, etc.

CREATE TABLE IF NOT EXISTS brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,                           -- URL-safe identifier e.g. 'thiocyn'
  name          TEXT NOT NULL,                                  -- Display name e.g. 'Thiocyn'
  category      TEXT,                                           -- e.g. 'Hair Care'
  tagline       TEXT,                                           -- Brand tagline
  language      TEXT[] DEFAULT ARRAY['de'],                     -- ['de'], ['de','en'], etc.
  status        TEXT DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'archived')),
  color         TEXT DEFAULT '#6366f1',                         -- Hex color for UI brand pills
  emoji         TEXT DEFAULT '🏷️',                             -- Brand emoji for quick ID
  instagram_handle TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE brands IS
'Central brand registry for all Hart Limes brands. Used as FK reference across all OS tables.';

DROP TRIGGER IF EXISTS trigger_brands_updated_at ON brands;
CREATE TRIGGER trigger_brands_updated_at
BEFORE UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_brands_slug   ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_brands_status ON brands(status) WHERE status = 'active';

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_select_authenticated" ON brands
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "brands_write_authenticated" ON brands
  FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SEED: 6 Hart Limes Brands
-- ============================================================================

INSERT INTO brands (slug, name, category, tagline, language, status, color, emoji, instagram_handle) VALUES
(
  'thiocyn',
  'Thiocyn',
  'Hair Care',
  'Confidence that grows every day.',
  ARRAY['de', 'en'],
  'active',
  '#16a34a',
  '💚',
  '@thiocyn'
),
(
  'take-a-shot',
  'Take A Shot',
  'Eyewear / Outdoor',
  'See the moment. Live it fully.',
  ARRAY['de'],
  'active',
  '#f97316',
  '📸',
  '@takeashot.official'
),
(
  'dr-severin',
  'Dr. Severin',
  'Premium Skincare',
  'Science you can feel.',
  ARRAY['de'],
  'active',
  '#9333ea',
  '🔬',
  '@dr.severin'
),
(
  'paigh',
  'Paigh',
  'Fair Fashion',
  'Wear what carries you.',
  ARRAY['de'],
  'active',
  '#ec4899',
  '🌸',
  '@paigh'
),
(
  'wristr',
  'Wristr',
  'Smartwatch Bands',
  'Dein Brand am Handgelenk.',
  ARRAY['de'],
  'active',
  '#475569',
  '⌚',
  '@wristr.official'
),
(
  'timber-john',
  'Timber & John',
  'Naturmode',
  'Naturverbunden. Zeitlos.',
  ARRAY['de'],
  'paused',
  '#d97706',
  '🌲',
  NULL
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TABLE: brand_configs
-- ============================================================================
-- Per-brand integration settings and credential references.
-- Actual API keys are stored in n8n Credentials or Supabase Vault — NEVER here.
-- This table stores references (names/IDs) and non-sensitive config.

CREATE TABLE IF NOT EXISTS brand_configs (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug                TEXT NOT NULL UNIQUE REFERENCES brands(slug) ON DELETE CASCADE,

  -- Shopify
  shopify_store_url         TEXT,            -- e.g. 'thiocyn.myshopify.com'
  shopify_api_key_ref       TEXT,            -- n8n credential name: 'Shopify — Thiocyn'
  shopify_webhook_secret_ref TEXT,           -- n8n credential name for webhook validation

  -- Meta / Facebook
  meta_ad_account_id        TEXT,            -- e.g. 'act_123456789'
  meta_pixel_id             TEXT,
  meta_page_id              TEXT,
  meta_credential_ref       TEXT,            -- n8n credential name: 'Meta — Thiocyn'

  -- TikTok
  tiktok_ad_account_id      TEXT,
  tiktok_credential_ref     TEXT,

  -- Customer Support
  cs_email                  TEXT,            -- e.g. 'support@thiocyn.de'
  paigh_inbox_id            TEXT,            -- Paigh CS inbox ID

  -- Email / Comms (Resend)
  sender_email              TEXT,            -- e.g. 'no-reply@thiocyn.de'
  resend_domain_ref         TEXT,            -- Resend domain name

  -- E-Commerce
  amazon_seller_id          TEXT,
  billbee_shop_id           TEXT,            -- Billbee shop ID for order sync

  -- Notes
  notes                     TEXT,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE brand_configs IS
'Per-brand integration config. API keys go to n8n/Supabase Vault — only references stored here.';

ALTER TABLE brand_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_configs_authenticated" ON brand_configs
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SEED: brand_configs (placeholder values — Valentin fills in actual data)
-- ============================================================================

INSERT INTO brand_configs (brand_slug, shopify_store_url, cs_email, sender_email, meta_credential_ref, shopify_api_key_ref)
VALUES
(
  'thiocyn',
  'thiocyn.myshopify.com',
  'support@thiocyn.de',
  'no-reply@thiocyn.de',
  'Meta — Thiocyn',
  'Shopify — Thiocyn'
),
(
  'take-a-shot',
  'take-a-shot.myshopify.com',
  'support@takeashot.de',
  'no-reply@takeashot.de',
  'Meta — Take A Shot',
  'Shopify — Take A Shot'
),
(
  'dr-severin',
  'dr-severin.myshopify.com',
  'support@drseverin.de',
  'no-reply@drseverin.de',
  'Meta — Dr. Severin',
  'Shopify — Dr. Severin'
),
(
  'paigh',
  'paigh.myshopify.com',
  'support@paigh.de',
  'no-reply@paigh.de',
  'Meta — Paigh',
  'Shopify — Paigh'
),
(
  'wristr',
  'wristr.myshopify.com',
  'support@wristr.de',
  'no-reply@wristr.de',
  'Meta — Wristr',
  'Shopify — Wristr'
),
(
  'timber-john',
  'timber-john.myshopify.com',
  NULL,
  NULL,
  NULL,
  'Shopify — Timber & John'
)
ON CONFLICT (brand_slug) DO NOTHING;

-- ============================================================================
-- TABLE: agent_logs
-- ============================================================================
-- Every agent action is logged here — audit trail + cost tracking.
-- Inserted by: Vercel Edge Functions, Supabase Edge Functions, n8n workflows.

CREATE TABLE IF NOT EXISTS agent_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      TEXT NOT NULL,       -- 'jarvis' | 'hr-agent' | 'finance-agent' | 'n8n' | etc.
  action          TEXT NOT NULL,       -- 'application_scored' | 'task_delegated' | 'dispute_triaged'
  brand_slug      TEXT REFERENCES brands(slug) ON DELETE SET NULL,
  user_email      TEXT,                -- Who triggered (NULL = automated/scheduled)
  input           JSONB,               -- What was passed in
  output          JSONB,               -- What the agent returned
  status          TEXT DEFAULT 'success'
                  CHECK (status IN ('success', 'error', 'pending', 'skipped')),
  duration_ms     INTEGER,             -- Execution time in milliseconds
  tokens_used     INTEGER,             -- Anthropic tokens consumed (if applicable)
  cost_usd        REAL,                -- Estimated cost in USD
  error_message   TEXT,                -- If status = 'error'
  source          TEXT DEFAULT 'dashboard'
                  CHECK (source IN ('dashboard', 'n8n', 'supabase_trigger', 'api', 'scheduled')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE agent_logs IS
'Audit log for every agent action. Used for cost tracking, debugging, and process history.';

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent    ON agent_logs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_brand    ON agent_logs(brand_slug);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action   ON agent_logs(action);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created  ON agent_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_status   ON agent_logs(status) WHERE status = 'error';

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
-- Authenticated users can read all logs
CREATE POLICY "agent_logs_select_authenticated" ON agent_logs
  FOR SELECT USING (auth.role() = 'authenticated');
-- Any source (including anon service calls) can insert logs
CREATE POLICY "agent_logs_insert_any" ON agent_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- HELPER VIEW: agent_cost_summary
-- ============================================================================
-- Quick cost overview per agent and per day

CREATE OR REPLACE VIEW agent_cost_summary AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  agent_name,
  brand_slug,
  COUNT(*)                       AS total_calls,
  SUM(tokens_used)               AS total_tokens,
  ROUND(SUM(cost_usd)::NUMERIC, 4) AS total_cost_usd,
  COUNT(*) FILTER (WHERE status = 'error') AS errors
FROM agent_logs
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 5 DESC;

-- ============================================================================
-- Done. Verify:
--   SELECT slug, name, status FROM brands ORDER BY name;
--   SELECT brand_slug, shopify_store_url FROM brand_configs;
--   SELECT COUNT(*) FROM agent_logs;
-- ============================================================================

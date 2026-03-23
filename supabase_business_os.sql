-- ============================================================================
-- Business OS for Hartlimes GmbH — Production-Ready Supabase Schema
-- ============================================================================
-- Project: Take A Shot Hiring Tool / Business OS
-- Supabase Project: dfzrkzvsdiiihoejfozn
-- Purpose: Centralized data layer for disputes, invoices, team tasks, ecom
--          metrics, orders, and ad campaigns across 6 brands.
--
-- Brands: thiocyn, take-a-shot, dr-severin, paigh, wristr, timber-john
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- HELPER: Updated-At Trigger Function (reusable across all tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE: team_members
-- ============================================================================
-- Purpose: Team roster for email-based references in tasks and dispute assignment.
-- Source: Manual seeding, synced from Google Workspace on demand.

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE team_members IS
'Team roster for assigning tasks and disputes to team members via email.';

CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(active) WHERE active = TRUE;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_team_members_updated_at ON team_members;
CREATE TRIGGER trigger_team_members_updated_at
BEFORE UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS: authenticated users can read all, only admin can write
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_members_read_authenticated" ON team_members
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_members_write_authenticated" ON team_members
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: disputes
-- ============================================================================
-- Purpose: Track chargeback, refund, and payment disputes across platforms.
-- Source: Manual entry or webhook integration from PayPal/Stripe/Klarna APIs.

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  case_id TEXT UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('PayPal', 'Stripe', 'Amazon', 'Klarna', 'Other')),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  deadline DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'escalated', 'resolved', 'won', 'lost')),
  notes TEXT,
  assigned_to_email TEXT REFERENCES team_members(email) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE disputes IS
'Chargeback, refund, and payment disputes. Platform: PayPal, Stripe, Amazon, Klarna, Other.
Source: Manual entry or webhook from payment platforms.';

CREATE INDEX IF NOT EXISTS idx_disputes_brand ON disputes(brand);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_deadline ON disputes(deadline) WHERE status IN ('open', 'escalated');
CREATE INDEX IF NOT EXISTS idx_disputes_case_id ON disputes(case_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_disputes_updated_at ON disputes;
CREATE TRIGGER trigger_disputes_updated_at
BEFORE UPDATE ON disputes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_read_authenticated" ON disputes
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "disputes_write_authenticated" ON disputes
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: invoices
-- ============================================================================
-- Purpose: Vendor invoices, payment tracking, and dunning management.
-- Source: Manual entry, PDF ingestion, or GetMyInvoices API integration.

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'disputed', 'cancelled')),
  category TEXT DEFAULT 'invoice' CHECK (category IN ('invoice', 'mahnung', 'subscription')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE invoices IS
'Vendor invoices and payment tracking. Category: invoice, mahnung (dunning), subscription.
Source: Manual entry, PDF import, or GetMyInvoices API.';

CREATE INDEX IF NOT EXISTS idx_invoices_brand ON invoices(brand);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) WHERE status IN ('pending', 'overdue');
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON invoices(vendor);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_read_authenticated" ON invoices
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "invoices_write_authenticated" ON invoices
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: team_tasks
-- ============================================================================
-- Purpose: Team workload and task tracking across all brands.
-- Source: Manual entry, Make/n8n automations, or team dashboard.

CREATE TABLE IF NOT EXISTS team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_email TEXT REFERENCES team_members(email) ON DELETE SET NULL,
  brand TEXT,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  due_date DATE,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  scope TEXT DEFAULT 'team' CHECK (scope IN ('private', 'team')),
  created_by_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE team_tasks IS
'Team task management. Priority 1–5 (1=highest). Status: todo, in_progress, blocked, done, cancelled.
Source: Manual entry, Make/n8n, or team dashboard.';

CREATE INDEX IF NOT EXISTS idx_team_tasks_assigned_to ON team_tasks(assigned_to_email);
CREATE INDEX IF NOT EXISTS idx_team_tasks_status ON team_tasks(status) WHERE status != 'done';
CREATE INDEX IF NOT EXISTS idx_team_tasks_due_date ON team_tasks(due_date) WHERE status IN ('todo', 'in_progress', 'blocked');
CREATE INDEX IF NOT EXISTS idx_team_tasks_brand ON team_tasks(brand);
CREATE INDEX IF NOT EXISTS idx_team_tasks_priority ON team_tasks(priority) WHERE status != 'done';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_team_tasks_updated_at ON team_tasks;
CREATE TRIGGER trigger_team_tasks_updated_at
BEFORE UPDATE ON team_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE team_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_tasks_read_authenticated" ON team_tasks
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_tasks_write_authenticated" ON team_tasks
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: ecom_metrics
-- ============================================================================
-- Purpose: Daily ecommerce KPIs snapshot. Single row per brand (UNIQUE constraint).
-- Source: Shopify API polling, inventory management system, synced via Make/n8n.

CREATE TABLE IF NOT EXISTS ecom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL UNIQUE,
  revenue_today NUMERIC(12,2) DEFAULT 0,
  revenue_mtd NUMERIC(12,2) DEFAULT 0,
  revenue_target_mtd NUMERIC(12,2) DEFAULT 0,
  orders_today INTEGER DEFAULT 0,
  orders_mtd INTEGER DEFAULT 0,
  aov NUMERIC(10,2) DEFAULT 0,
  return_rate NUMERIC(5,2) DEFAULT 0,
  inventory_status TEXT DEFAULT 'ok' CHECK (inventory_status IN ('ok', 'low', 'critical')),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ecom_metrics IS
'Ecommerce KPI snapshot (one row per brand_id). Synced from Shopify + inventory system.
Source: Make/n8n automation polling Shopify API every hour.';

CREATE INDEX IF NOT EXISTS idx_ecom_metrics_brand_id ON ecom_metrics(brand_id);
CREATE INDEX IF NOT EXISTS idx_ecom_metrics_inventory_status ON ecom_metrics(inventory_status) WHERE inventory_status != 'ok';
CREATE INDEX IF NOT EXISTS idx_ecom_metrics_synced_at ON ecom_metrics(synced_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_ecom_metrics_updated_at ON ecom_metrics;
CREATE TRIGGER trigger_ecom_metrics_updated_at
BEFORE UPDATE ON ecom_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE ecom_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecom_metrics_read_authenticated" ON ecom_metrics
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ecom_metrics_write_authenticated" ON ecom_metrics
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: ecom_orders
-- ============================================================================
-- Purpose: Order-level transaction log for audit and analytics.
-- Source: Shopify webhook or API sync via Make/n8n.

CREATE TABLE IF NOT EXISTS ecom_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  platform TEXT DEFAULT 'Shopify',
  customer_email TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ecom_orders IS
'Order transaction log. Source: Shopify webhook or API sync via Make/n8n.
No updated_at needed; orders are immutable after creation (refunds tracked separately).';

CREATE INDEX IF NOT EXISTS idx_ecom_orders_brand_id ON ecom_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_ecom_orders_order_id ON ecom_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_ecom_orders_status ON ecom_orders(status);
CREATE INDEX IF NOT EXISTS idx_ecom_orders_created_at ON ecom_orders(created_at);

-- RLS
ALTER TABLE ecom_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecom_orders_read_authenticated" ON ecom_orders
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ecom_orders_write_authenticated" ON ecom_orders
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: ad_campaigns
-- ============================================================================
-- Purpose: Ad campaign performance tracking across Meta, Google, TikTok, Amazon.
-- Source: Meta API, Google Ads API, TikTok API, synced via Make/n8n.

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('Meta', 'Google', 'TikTok', 'Amazon')),
  campaign_name TEXT NOT NULL,
  budget_daily NUMERIC(10,2),
  spend_mtd NUMERIC(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr NUMERIC(5,4) DEFAULT 0,
  purchases INTEGER DEFAULT 0,
  roas NUMERIC(5,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ad_campaigns IS
'Ad campaign performance. Platform: Meta, Google, TikTok, Amazon.
Source: Meta Ads API, Google Ads API, TikTok API, synced via Make/n8n (hourly or daily).';

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_brand_id ON ad_campaigns(brand_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status) WHERE status IN ('active', 'paused');
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_period_start ON ad_campaigns(period_start);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_roas ON ad_campaigns(roas) WHERE roas > 0;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_ad_campaigns_updated_at ON ad_campaigns;
CREATE TRIGGER trigger_ad_campaigns_updated_at
BEFORE UPDATE ON ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_campaigns_read_authenticated" ON ad_campaigns
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "ad_campaigns_write_authenticated" ON ad_campaigns
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- TABLE: brand_metrics (optional but recommended)
-- ============================================================================
-- Purpose: Monthly or weekly brand-level rollup of all KPIs.
-- Source: Aggregated from ecom_metrics, ad_campaigns, invoices on-demand.

CREATE TABLE IF NOT EXISTS brand_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  metric_period TEXT DEFAULT 'monthly' CHECK (metric_period IN ('daily', 'weekly', 'monthly')),
  revenue_total NUMERIC(12,2) DEFAULT 0,
  revenue_target NUMERIC(12,2) DEFAULT 0,
  margin_pct NUMERIC(5,2) DEFAULT 0,
  orders_total INTEGER DEFAULT 0,
  aov NUMERIC(10,2) DEFAULT 0,
  cac NUMERIC(10,2) DEFAULT 0,
  ltv NUMERIC(12,2) DEFAULT 0,
  roas NUMERIC(5,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE brand_metrics IS
'Brand-level KPI rollup (daily/weekly/monthly). Aggregated from ecom_metrics and ad_campaigns.
Source: Manual entry or Make/n8n aggregation logic.';

CREATE INDEX IF NOT EXISTS idx_brand_metrics_brand_id ON brand_metrics(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_metrics_period ON brand_metrics(metric_period);
CREATE INDEX IF NOT EXISTS idx_brand_metrics_created_at ON brand_metrics(created_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_brand_metrics_updated_at ON brand_metrics;
CREATE TRIGGER trigger_brand_metrics_updated_at
BEFORE UPDATE ON brand_metrics
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE brand_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_metrics_read_authenticated" ON brand_metrics
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "brand_metrics_write_authenticated" ON brand_metrics
FOR INSERT, UPDATE, DELETE WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- SEED DATA: ecom_metrics
-- ============================================================================
-- Initialize one row per brand with zeros (UI expects rows to exist).

INSERT INTO ecom_metrics (brand_id, revenue_today, revenue_mtd, revenue_target_mtd, orders_today, orders_mtd, aov, return_rate, inventory_status)
VALUES
  ('thiocyn', 0, 0, 0, 0, 0, 0, 0, 'ok'),
  ('take-a-shot', 0, 0, 0, 0, 0, 0, 0, 'ok'),
  ('dr-severin', 0, 0, 0, 0, 0, 0, 0, 'ok'),
  ('paigh', 0, 0, 0, 0, 0, 0, 0, 'ok'),
  ('wristr', 0, 0, 0, 0, 0, 0, 0, 'ok'),
  ('timber-john', 0, 0, 0, 0, 0, 0, 0, 'ok')
ON CONFLICT (brand_id) DO NOTHING;

-- ============================================================================
-- SEED DATA: brand_metrics
-- ============================================================================
-- Initialize one row per brand (monthly) with zeros.

INSERT INTO brand_metrics (brand_id, metric_period, revenue_total, revenue_target, margin_pct, orders_total, aov, cac, ltv, roas)
VALUES
  ('thiocyn', 'monthly', 0, 0, 0, 0, 0, 0, 0, 0),
  ('take-a-shot', 'monthly', 0, 0, 0, 0, 0, 0, 0, 0),
  ('dr-severin', 'monthly', 0, 0, 0, 0, 0, 0, 0, 0),
  ('paigh', 'monthly', 0, 0, 0, 0, 0, 0, 0, 0),
  ('wristr', 'monthly', 0, 0, 0, 0, 0, 0, 0, 0),
  ('timber-john', 'monthly', 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FINAL COMMENT: INTEGRATION GUIDE
-- ============================================================================

/*
================================================================================
BUSINESS OS INTEGRATION GUIDE
================================================================================

TABLES CREATED:
  1. team_members      — Team roster (manual + Google Workspace sync)
  2. disputes          — Payment disputes from PayPal/Stripe/Klarna
  3. invoices          — Vendor invoices + dunning management
  4. team_tasks        — Task tracking (Make/n8n + manual)
  5. ecom_metrics      — Daily KPI snapshot per brand
  6. ecom_orders       — Order transaction log
  7. ad_campaigns      — Ad performance (Meta/Google/TikTok/Amazon)
  8. brand_metrics     — Monthly brand KPI rollup

DATA FLOW & INTEGRATIONS:
================================================================================

DISPUTES:
  Source: PayPal/Stripe/Klarna APIs or manual entry
  Integration: Make/n8n webhook → INSERT/UPDATE on disputes table
  Trigger: Check status = 'open' or 'escalated' daily for deadlines

INVOICES:
  Source: GetMyInvoices API, PDF imports, or manual entry
  Integration: Make/n8n → INSERT new, UPDATE payment status
  Trigger: Alert on overdue (due_date < NOW())

TEAM_TASKS:
  Source: Manual entry, Make/n8n automation, or team dashboard
  Integration: Supabase client (React) → INSERT/UPDATE, watch assigned_to_email
  Trigger: Track by assigned_to and due_date for user-facing task board

ECOM_METRICS:
  Source: Shopify API (inventory + orders) + analytics platform
  Integration: Make/n8n hourly polling → UPDATE (UPSERT on brand_id)
  Schedule: Every hour (0:00, 1:00, ..., 23:00 UTC)
  Key: UNIQUE(brand_id) ensures single row per brand

ECOM_ORDERS:
  Source: Shopify webhooks (order.created, order.paid, order.refunded)
  Integration: Make/n8n webhook handler → INSERT on Shopify event
  Immutable: No DELETE, UPDATE only status for refunds

AD_CAMPAIGNS:
  Source: Meta Ads Manager API, Google Ads API, TikTok Ads API, Amazon Ads API
  Integration: Make/n8n daily/hourly fetch → UPSERT based on campaign_id
  Schedule: Daily at 06:00 UTC (before team arrives)
  Metrics: impressions, clicks, ctr, purchases, roas

BRAND_METRICS:
  Source: Aggregated from ecom_metrics + ad_campaigns + invoices
  Integration: Make/n8n nightly aggregation → INSERT monthly snapshot
  Schedule: Daily at 23:59 UTC or weekly Monday 09:00 UTC
  Purpose: Reporting dashboard, KPI tracking, executive summaries

================================================================================
SECURITY:
  • RLS: authenticated users can read/write all tables
  • anon (public): no access (upgrade RLS if notifications needed)
  • All timestamps in UTC (TIMESTAMPTZ)
  • PK always UUID with gen_random_uuid()
  • Foreign keys: team_members.email for soft references

MAINTENANCE:
  • Monitor ecom_metrics.synced_at: if stale >2h → alert
  • Disputes: check deadline field daily (consider date column for reminders)
  • Invoices: flag overdue monthly (due_date < NOW())
  • Archive ad_campaigns after period_end + 30 days (optional)

FUTURE EXTENSIONS:
  • Add audit_log table for compliance (store old values on UPDATE)
  • Add notifications table for Slack/email alerts
  • Add webhooks table to track integration health
  • Add budget_allocation table for cross-brand budget planning

================================================================================
*/
